import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// GET - Fetch active pickup locations (public - for checkout)
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: locations, error } = await supabase
      .from("pickup_locations")
      .select("*")
      .eq("is_active", true)
      .order("distributor_id", { ascending: true, nullsFirst: true })
      .order("name", { ascending: true })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch pickup locations" }, { status: 500 })
    }

    return NextResponse.json(locations)
  } catch (error) {
    console.error("Error fetching pickup locations:", error)
    return NextResponse.json({ error: "Failed to fetch pickup locations" }, { status: 500 })
  }
}
