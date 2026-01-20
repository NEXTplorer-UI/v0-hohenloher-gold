import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q") || ""

    if (!query || query.length < 2) {
      return NextResponse.json({ customers: [] })
    }

    const searchLower = query.toLowerCase()

    console.log("[v0] [customer-search] Searching for:", searchLower)

    const { data: customers, error } = await supabase
      .from("customers")
      .select("id, email, first_name, last_name, phone, default_distribution_person_id")
      .or(
        `first_name.ilike.%${searchLower}%,last_name.ilike.%${searchLower}%,email.ilike.%${searchLower}%,phone.ilike.%${searchLower}%`,
      )
      .limit(20)
      .order("last_name")

    if (error) {
      console.error("[v0] Error searching customers:", error)
      return NextResponse.json({ error: "Failed to search customers" }, { status: 500 })
    }

    console.log("[v0] [customer-search] Found:", customers?.length || 0, "customers")

    return NextResponse.json({ customers: customers || [] })
  } catch (error) {
    console.error("[v0] Error in customer search:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
