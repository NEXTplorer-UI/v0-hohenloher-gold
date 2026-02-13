export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const [productsRes, locationsRes, personsRes] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, price, category, size, unit, active")
        .eq("active", true)
        .order("name"),
      supabase
        .from("pickup_locations")
        .select("id, name")
        .eq("active", true)
        .order("name"),
      supabase
        .from("distribution_persons")
        .select("id, name")
        .order("name"),
    ])

    return NextResponse.json({
      products: productsRes.data ?? [],
      pickupLocations: locationsRes.data ?? [],
      distributionPersons: personsRes.data ?? [],
    })
  } catch (error) {
    console.error("Error loading form data:", error)
    return NextResponse.json({ error: "Failed to load form data" }, { status: 500 })
  }
}
