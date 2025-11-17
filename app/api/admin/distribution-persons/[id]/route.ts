import { createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { name, phone, email, notes, is_active, location_ids, primary_location_id } = body

    const { data: person, error } = await supabase
      .from("distribution_persons")
      .update({
        name,
        phone,
        email,
        notes,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select()
      .single()

    if (error) throw error

    if (location_ids !== undefined) {
      // Delete existing assignments
      await supabase
        .from("location_persons")
        .delete()
        .eq("person_id", params.id)

      // Create new assignments
      if (location_ids.length > 0) {
        const assignments = location_ids.map((location_id: string) => ({
          person_id: params.id,
          pickup_location_id: location_id,
          is_primary: location_id === primary_location_id,
        }))

        const { error: assignError } = await supabase
          .from("location_persons")
          .insert(assignments)

        if (assignError) {
          console.error("[API] Error updating location assignments:", assignError)
        }
      }
    }

    return NextResponse.json({ person })
  } catch (error: any) {
    console.error("[API] Error updating distribution person:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { error } = await supabase
      .from("distribution_persons")
      .delete()
      .eq("id", params.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[API] Error deleting distribution person:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
