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

    const { data: persons, error } = await supabase
      .from("distribution_persons")
      .select("*")
      .order("name", { ascending: true })

    if (error) throw error

    const personsWithCounts = await Promise.all(
      (persons || []).map(async (person) => {
        const { count } = await supabase
          .from("location_persons")
          .select("*", { count: "exact", head: true })
          .eq("person_id", person.id)
        
        return {
          ...person,
          location_count: count || 0
        }
      })
    )

    console.log("[API] Distribution persons fetched:", personsWithCounts.length)

    return NextResponse.json({ persons: personsWithCounts })
  } catch (error: any) {
    console.error("[API] Error fetching distribution persons:", error)
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
    const { name, phone, email, notes, location_ids, primary_location_id } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const { data: person, error } = await supabase
      .from("distribution_persons")
      .insert({
        name,
        phone,
        email,
        notes,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error

    if (location_ids && location_ids.length > 0) {
      const assignments = location_ids.map((location_id: string) => ({
        person_id: person.id,
        pickup_location_id: location_id,
        is_primary: location_id === primary_location_id,
      }))

      const { error: assignError } = await supabase
        .from("location_persons")
        .insert(assignments)

      if (assignError) {
        console.error("[API] Error creating location assignments:", assignError)
        // Don't fail the whole request, just log the error
      }
    }

    return NextResponse.json({ person })
  } catch (error: any) {
    console.error("[API] Error creating distribution person:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
