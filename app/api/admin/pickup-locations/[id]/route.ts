import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/api-auth"

export const dynamic = "force-dynamic"

// GET - Fetch single pickup location
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const supabase = await createClient()

    const { data: location, error } = await supabase.from("pickup_locations").select("*").eq("id", params.id).single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Pickup location not found" }, { status: 404 })
    }

    return NextResponse.json(location)
  } catch (error) {
    console.error("Error fetching pickup location:", error)
    return NextResponse.json({ error: "Failed to fetch pickup location" }, { status: 500 })
  }
}

// PUT - Update pickup location
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const supabase = await createClient()
    const body = await request.json()

    const { name, address, postal_code, city, contact_person, contact_phone, is_active } = body

    // Validation
    if (!name || !address || !postal_code || !city) {
      return NextResponse.json({ error: "Name, Adresse, PLZ und Stadt sind Pflichtfelder" }, { status: 400 })
    }

    const { data: location, error } = await supabase
      .from("pickup_locations")
      .update({
        name,
        address,
        postal_code,
        city,
        contact_person,
        contact_phone,
        is_active,
      })
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to update pickup location" }, { status: 500 })
    }

    return NextResponse.json(location)
  } catch (error) {
    console.error("Error updating pickup location:", error)
    return NextResponse.json({ error: "Failed to update pickup location" }, { status: 500 })
  }
}

// DELETE - Delete pickup location
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const supabase = await createClient()

    // Check if location is used in any orders
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id")
      .eq("pickup_location_id", params.id)
      .limit(1)

    if (ordersError) {
      console.error("Database error:", ordersError)
      return NextResponse.json({ error: "Failed to check location usage" }, { status: 500 })
    }

    if (orders && orders.length > 0) {
      return NextResponse.json(
        { error: "Dieser Abholort kann nicht gelöscht werden, da er bereits in Bestellungen verwendet wird" },
        { status: 400 },
      )
    }

    const { error } = await supabase.from("pickup_locations").delete().eq("id", params.id)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to delete pickup location" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting pickup location:", error)
    return NextResponse.json({ error: "Failed to delete pickup location" }, { status: 500 })
  }
}
