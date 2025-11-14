import { type NextRequest, NextResponse } from "next/server"
import { createServerClient, requireAdmin } from "@/lib/supabase/server"
import { batchNormalizeOrders } from "@/lib/pickup-location-normalizer"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const supabase = await createServerClient()
    const { id } = await params
    const body = await request.json()

    const { canonical_location_id, applyToExisting } = body

    if (!canonical_location_id) {
      return NextResponse.json({ error: "canonical_location_id is required" }, { status: 400 })
    }

    // Update mapping
    const { data: mapping, error } = await supabase
      .from("pickup_location_mappings")
      .update({ canonical_location_id })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    // Apply to existing orders if requested
    if (applyToExisting && mapping) {
      try {
        await batchNormalizeOrders(mapping.id)
      } catch (batchError) {
        console.error("[pickup-location-mappings] Batch normalize error:", batchError)
      }
    }

    return NextResponse.json(mapping)
  } catch (error: any) {
    console.error("[pickup-location-mappings] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: error.status || 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const supabase = await createServerClient()
    const { id } = await params

    const { error } = await supabase.from("pickup_location_mappings").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[pickup-location-mappings] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: error.status || 500 })
  }
}
