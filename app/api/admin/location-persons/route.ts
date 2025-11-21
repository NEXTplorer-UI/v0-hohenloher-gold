import { createServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const personId = searchParams.get("person_id")
    const locationId = searchParams.get("locationId")

    let query = supabase.from("location_persons").select(`
      *,
      pickup_locations(name),
      distribution_persons(id, name, email, phone)
    `)

    if (personId) {
      query = query.eq("person_id", personId)
    }

    if (locationId) {
      query = query.eq("pickup_location_id", locationId)
    }

    const { data: assignments, error } = await query

    if (error) throw error

    return NextResponse.json({ assignments })
  } catch (error: any) {
    console.error("[API] Error fetching location-person assignments:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { pickup_location_id, person_id, is_primary } = body

    if (!pickup_location_id || !person_id) {
      return NextResponse.json({ error: "pickup_location_id and person_id are required" }, { status: 400 })
    }

    if (is_primary) {
      await supabase.from("location_persons").update({ is_primary: false }).eq("pickup_location_id", pickup_location_id)
    }

    const { data: locationPerson, error } = await supabase
      .from("location_persons")
      .insert({
        pickup_location_id,
        person_id,
        is_primary: is_primary || false,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ locationPerson })
  } catch (error: any) {
    console.error("[API] Error creating location person:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { id, is_active } = body

    if (!id || is_active === undefined) {
      return NextResponse.json({ error: "id and is_active are required" }, { status: 400 })
    }

    const { data, error } = await supabase.from("location_persons").update({ is_active }).eq("id", id).select().single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("[API] Error updating location person:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    // Support deletion via id OR via body with locationId and personId
    if (id) {
      const { error } = await supabase.from("location_persons").delete().eq("id", id)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    // Alternative: Delete by locationId and personId from body
    const body = await request.json()
    const { locationId, personId } = body

    if (!locationId || !personId) {
      return NextResponse.json(
        { error: "Either id parameter or locationId and personId in body are required" },
        { status: 400 },
      )
    }

    const { error } = await supabase
      .from("location_persons")
      .delete()
      .eq("pickup_location_id", locationId)
      .eq("person_id", personId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[API] Error deleting location person:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
