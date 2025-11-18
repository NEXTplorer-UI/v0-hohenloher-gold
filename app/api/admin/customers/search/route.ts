import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    await requireAdmin(supabase)

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q") || ""

    if (!query || query.length < 2) {
      return NextResponse.json({ customers: [] })
    }

    const searchLower = query.toLowerCase()

    // Search customers by name, email, or phone
    const { data: customers, error } = await supabase
      .from("customers")
      .select("id, email, first_name, last_name, phone")
      .or(`first_name.ilike.%${searchLower}%,last_name.ilike.%${searchLower}%,email.ilike.%${searchLower}%,phone.ilike.%${searchLower}%`)
      .limit(20)
      .order("last_name")

    if (error) {
      console.error("[v0] Error searching customers:", error)
      return NextResponse.json({ error: "Failed to search customers" }, { status: 500 })
    }

    return NextResponse.json({ customers: customers || [] })
  } catch (error) {
    console.error("[v0] Error in customer search:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
