import { type NextRequest, NextResponse } from "next/server"
import { createServerClient, requireAdmin } from "@/lib/supabase/server"
import { getUnmappedPickupLocations, batchNormalizeOrders } from "@/lib/pickup-location-normalizer"
import { suggestPickupLocationFromComment } from "@/lib/pickup-location-comment-parser"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const supabase = await createServerClient()

    const { searchParams } = new URL(request.url)
    const includeUnmapped = searchParams.get("includeUnmapped") === "true"
    const grouped = searchParams.get("grouped") !== "false" // default true

    const { data: mappings, error } = await supabase
      .from("pickup_location_mappings")
      .select(
        `
        id,
        variant,
        canonical_location_id,
        created_at,
        canonical_location:pickup_locations!canonical_location_id(
          id,
          name,
          address,
          city
        )
      `,
      )
      .order("variant")

    if (error) throw error

    const response: any = { mappings }

    if (includeUnmapped) {
      if (grouped) {
        const unmapped = await getUnmappedPickupLocations()
        
        const unmappedWithNotesAndSuggestions = await Promise.all(
          unmapped.map(async (variant) => {
            const { data: ordersWithNotes } = await supabase
              .from("orders")
              .select("notes")
              .eq("pickup_location", variant.variant)
              .not("notes", "is", null)
              .neq("notes", "")
              .limit(10)

            const notes = ordersWithNotes?.map((o) => o.notes).filter(Boolean) || []

            let suggestion = null
            if (notes.length > 0) {
              for (const note of notes) {
                const parsed = await suggestPickupLocationFromComment(note)
                if (parsed.found && parsed.confidence !== "low") {
                  suggestion = {
                    locationId: parsed.pickupLocationId,
                    locationName: parsed.pickupLocationName,
                    confidence: parsed.confidence,
                    matchedText: parsed.matchedText,
                  }
                  break
                }
              }
            }

            return {
              ...variant,
              notes,
              suggestion,
            }
          })
        )
        
        response.unmapped = unmappedWithNotesAndSuggestions
      } else {
        const { data: individualOrders, error: ordersError } = await supabase
          .from("orders")
          .select("id, order_number, pickup_location, notes, pickup_location_id")
          .is("pickup_location_id", null)
          .not("pickup_location", "is", null)
          .neq("pickup_location", "")
          .neq("status", "cancelled") // Exclude cancelled orders
          .or("mapping_ignored.is.null,mapping_ignored.is.false") // Handle both NULL and FALSE
          .order("created_at", { ascending: false })
          .limit(100)

        if (ordersError) throw ordersError

        response.individual = individualOrders.map((order: any) => ({
          orderId: order.id,
          orderNumber: order.order_number,
          pickupLocation: order.pickup_location,
          comment: order.notes,
        }))
      }
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("[pickup-location-mappings] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: error.status || 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const supabase = await createServerClient()
    const body = await request.json()

    const { variant, canonical_location_id, applyToExisting, distribution_person_id, orderId } = body

    if (!variant || !canonical_location_id) {
      return NextResponse.json({ error: "variant and canonical_location_id are required" }, { status: 400 })
    }

    const { data: mapping, error } = await supabase
      .from("pickup_location_mappings")
      .insert({
        variant: variant.trim(),
        canonical_location_id,
      })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Diese Variante existiert bereits" }, { status: 400 })
      }
      throw error
    }

    if (applyToExisting && mapping) {
      if (orderId) {
        await supabase
          .from("orders")
          .update({ 
            pickup_location_id: canonical_location_id,
            distribution_person_id: distribution_person_id && distribution_person_id !== "none" ? distribution_person_id : null
          })
          .eq("id", orderId)
      } else {
        batchNormalizeOrders(mapping.id).catch(err => {
          console.error("[pickup-location-mappings] Background batch normalize error:", err)
        })
        
        if (distribution_person_id && distribution_person_id !== "none") {
          supabase
            .from("orders")
            .update({ distribution_person_id })
            .eq("pickup_location", variant)
            .is("pickup_location_id", null)
            .then(({ error }) => {
              if (error) {
                console.error("[pickup-location-mappings] Background distribution person update error:", error)
              }
            })
        }
      }
    }

    return NextResponse.json(mapping)
  } catch (error: any) {
    console.error("[pickup-location-mappings] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: error.status || 500 })
  }
}
