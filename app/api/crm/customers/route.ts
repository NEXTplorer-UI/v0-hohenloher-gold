import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  console.log("[v0] [/api/crm/customers] GET request received")

  const url = new URL(request.url)
  const q = url.searchParams.get("q")
  const limit = Number(url.searchParams.get("limit") || "200")
  const offset = Number(url.searchParams.get("offset") || "0")

  console.log("[v0] [/api/crm/customers] Query params:", { q, limit, offset })

  try {
    const supabase = createAdminClient()
    console.log("[v0] [/api/crm/customers] Admin client created")

    // Use the search function for better performance
    const { data, error } = await supabase.rpc("crm_customers_search", {
      q,
      limit_count: limit,
      offset_count: offset,
    })

    if (error) {
      console.error("[v0] [/api/crm/customers] Database error:", error)
      return NextResponse.json({ error: "Database error", details: error.message }, { status: 500 })
    }

    console.log("[v0] [/api/crm/customers] Successfully fetched", data?.length || 0, "customers")
    return NextResponse.json({ customers: data ?? [] })
  } catch (e) {
    console.error("[v0] [/api/crm/customers] Unexpected error:", e)
    return NextResponse.json(
      {
        error: "Unexpected error",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    )
  }
}
