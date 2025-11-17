import { createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { route_id, pickup_location_id, stop_order, estimated_duration_minutes } = body

    if (!route_id || !pickup_location_id) {
      return NextResponse.json({ error: "route_id and pickup_location_id are required" }, { status: 400 })
    }

    const { data: routeLocation, error } = await supabase
      .from("route_locations")
      .insert({
        route_id,
        pickup_location_id,
        stop_order: stop_order || 0,
        estimated_duration_minutes,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ routeLocation })
  } catch (error: any) {
    console.error("[API] Error creating route location:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    const { error } = await supabase
      .from("route_locations")
      .delete()
      .eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[API] Error deleting route location:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
