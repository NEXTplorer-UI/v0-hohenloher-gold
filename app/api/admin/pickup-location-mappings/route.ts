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

    // Get all mappings with canonical location details
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
      const unmapped = await getUnmappedPickupLocations()
      
      const unmappedWithNotesAndSuggestions = await Promise.all(
        unmapped.map(async (variant) => {
          // Get sample comments for this variant
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
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("[pickup-location-mappings] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: error.status || 500 })
  }
}

// ... existing POST code ...

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const supabase = await createServerClient()
    const body = await request.json()

    const { variant, canonical_location_id, applyToExisting } = body

    if (!variant || !canonical_location_id) {
      return NextResponse.json({ error: "variant and canonical_location_id are required" }, { status: 400 })
    }

    // Insert mapping
    const { data: mapping, error } = await supabase
      .from("pickup_location_mappings")
      .insert({
        variant: variant.trim(),
        canonical_location_id,
      })
      .select()
      .single()

    if (error) {
      // Handle duplicate variant
      if (error.code === "23505") {
        return NextResponse.json({ error: "Diese Variante existiert bereits" }, { status: 400 })
      }
      throw error
    }

    // Apply to existing orders if requested
    if (applyToExisting && mapping) {
      try {
        await batchNormalizeOrders(mapping.id)
      } catch (batchError) {
        console.error("[pickup-location-mappings] Batch normalize error:", batchError)
        // Don't fail the request, just log
      }
    }

    return NextResponse.json(mapping)
  } catch (error: any) {
    console.error("[pickup-location-mappings] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: error.status || 500 })
  }
}
