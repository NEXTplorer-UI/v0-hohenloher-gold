import { createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
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

    const { data: routes, error } = await supabase
      .from("delivery_routes")
      .select(`
        *,
        route_locations(
          id,
          stop_order,
          estimated_duration_minutes,
          pickup_location:pickup_locations(
            id,
            name,
            address,
            city
          )
        )
      `)
      .order("display_order", { ascending: true })

    if (error) throw error

    return NextResponse.json({ routes: routes || [] })
  } catch (error: any) {
    console.error("[API] Error fetching delivery routes:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

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
    const { name, region, color, display_order, notes } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const { data: route, error } = await supabase
      .from("delivery_routes")
      .insert({
        name,
        region,
        color,
        display_order,
        notes,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ route })
  } catch (error: any) {
    console.error("[API] Error creating delivery route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
