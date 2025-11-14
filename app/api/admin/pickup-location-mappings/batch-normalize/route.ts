import { type NextRequest, NextResponse } from "next/server"
import { createServerClient, requireAdmin } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const supabase = await createServerClient()

    console.log("[v0] [batch-normalize] Starting batch normalization...")

    // Get all mappings
    const { data: mappings, error: mappingsError } = await supabase.from("pickup_location_mappings").select(
      `
        id,
        variant,
        canonical_location_id,
        canonical_location:pickup_locations!canonical_location_id(id, name)
      `,
    )

    if (mappingsError) throw mappingsError

    if (!mappings || mappings.length === 0) {
      return NextResponse.json({ message: "No mappings found", updated: 0 })
    }

    let totalUpdated = 0

    // Apply each mapping to orders
    for (const mapping of mappings) {
      if (!mapping.canonical_location) continue

      const canonicalLocation = mapping.canonical_location as any

      console.log(`[v0] [batch-normalize] Processing variant: ${mapping.variant}`)

      const { data: updatedOrders, error: updateError } = await supabase
        .from("orders")
        .update({
          pickup_location_normalized: canonicalLocation.name,
          pickup_location_id: canonicalLocation.id,
        })
        .ilike("pickup_location", mapping.variant)
        .select("id")

      if (updateError) {
        console.error(`[v0] [batch-normalize] Error updating variant ${mapping.variant}:`, updateError)
        continue
      }

      const count = updatedOrders?.length || 0
      totalUpdated += count
      console.log(`[v0] [batch-normalize] Updated ${count} orders for variant: ${mapping.variant}`)
    }

    console.log(`[v0] [batch-normalize] Total orders updated: ${totalUpdated}`)

    return NextResponse.json({
      message: "Batch normalization completed",
      updated: totalUpdated,
    })
  } catch (error: any) {
    console.error("[batch-normalize] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: error.status || 500 })
  }
}
