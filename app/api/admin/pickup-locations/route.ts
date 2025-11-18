import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/api-auth"

export const dynamic = "force-dynamic"

// GET - Fetch all pickup locations (admin)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)
  } catch (error: any) {
    if (error.name === "AuthenticationError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    if (error.name === "AuthorizationError") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    throw error
  }

  try {
    const supabase = await createClient()

    const { data: locations, error } = await supabase
      .from("pickup_locations")
      .select(`
        *,
        route_locations(
          route_id,
          delivery_routes(name)
        )
      `)
      .order("name", { ascending: true })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch pickup locations" }, { status: 500 })
    }

    const formattedLocations = locations.map((loc: any) => ({
      ...loc,
      route_name: loc.route_locations?.[0]?.delivery_routes?.name || null,
      route_id: loc.route_locations?.[0]?.route_id || null,
      route_locations: undefined, // Remove from output
    }))

    console.log("[v0] Fetched pickup locations count:", formattedLocations.length)
    
    return NextResponse.json({ locations: formattedLocations })
  } catch (error) {
    console.error("Error fetching pickup locations:", error)
    return NextResponse.json({ error: "Failed to fetch pickup locations" }, { status: 500 })
  }
}

// POST - Create new pickup location
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)
  } catch (error: any) {
    if (error.name === "AuthenticationError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    if (error.name === "AuthorizationError") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    throw error
  }

  try {
    const supabase = await createClient()
    const body = await request.json()

    const { name, address, postal_code, city, contact_person, contact_phone, is_active } = body

    const { data: location, error } = await supabase
      .from("pickup_locations")
      .insert({
        name,
        address,
        postal_code,
        city,
        contact_person,
        contact_phone,
        is_active: is_active ?? true,
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to create pickup location" }, { status: 500 })
    }

    return NextResponse.json(location, { status: 201 })
  } catch (error) {
    console.error("Error creating pickup location:", error)
    return NextResponse.json({ error: "Failed to create pickup location" }, { status: 500 })
  }
}
