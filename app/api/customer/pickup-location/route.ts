import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - Fetch pickup location for current distributor
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get pickup location for this distributor
    const { data: location, error } = await supabase
      .from("pickup_locations")
      .select("*")
      .eq("distributor_id", user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: "Pickup location not found" }, { status: 404 })
    }

    return NextResponse.json(location)
  } catch (error) {
    console.error("Error fetching pickup location:", error)
    return NextResponse.json({ error: "Failed to fetch pickup location" }, { status: 500 })
  }
}

// PATCH - Update pickup location for current distributor
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // Update pickup location
    const { data, error } = await supabase
      .from("pickup_locations")
      .update({
        name: body.name,
        address: body.address,
        city: body.city,
        postal_code: body.postal_code,
        contact_person: body.contact_person,
        contact_phone: body.contact_phone,
        email: body.email,
        pickup_hours_start: body.pickup_hours_start,
        pickup_hours_end: body.pickup_hours_end,
        notes: body.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("distributor_id", user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: "Failed to update pickup location" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error updating pickup location:", error)
    return NextResponse.json({ error: "Failed to update pickup location" }, { status: 500 })
  }
}
