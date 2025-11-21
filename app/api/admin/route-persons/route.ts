import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

// GET - Load persons for a specific route
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const routeId = searchParams.get("routeId")

    if (!routeId) {
      return NextResponse.json({ error: "Route ID required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("route_persons")
      .select(`
        id,
        person_id,
        pickup_location_id,
        stop_order,
        notes,
        distribution_persons (
          id,
          name,
          email,
          phone
        ),
        pickup_locations (
          id,
          name
        )
      `)
      .eq("route_id", routeId)
      .order("stop_order", { ascending: true })

    if (error) throw error

    return NextResponse.json({ persons: data || [] })
  } catch (error: any) {
    console.error("[route-persons] GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Add person to route
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { routeId, personId, pickupLocationId } = await request.json()

    if (!routeId || !personId || !pickupLocationId) {
      return NextResponse.json({ error: "Route ID, Person ID, and Pickup Location ID required" }, { status: 400 })
    }

    // Get max stop_order for this route
    const { data: existing } = await supabase
      .from("route_persons")
      .select("stop_order")
      .eq("route_id", routeId)
      .order("stop_order", { ascending: false })
      .limit(1)

    const nextOrder = existing && existing.length > 0 ? (existing[0].stop_order || 0) + 1 : 0

    const { data, error } = await supabase
      .from("route_persons")
      .insert({
        route_id: routeId,
        person_id: personId,
        pickup_location_id: pickupLocationId,
        stop_order: nextOrder,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ person: data })
  } catch (error: any) {
    console.error("[route-persons] POST error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Remove person from route (does NOT delete location_persons!)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Route Person ID required" }, { status: 400 })
    }

    const { error } = await supabase.from("route_persons").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[route-persons] DELETE error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Update stop order for persons in route
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { updates } = await request.json()

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: "Updates array required" }, { status: 400 })
    }

    // Update each person's stop_order
    const promises = updates.map(({ id, stop_order }) =>
      supabase.from("route_persons").update({ stop_order }).eq("id", id),
    )

    await Promise.all(promises)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[route-persons] PATCH error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
