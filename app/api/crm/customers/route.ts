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

    let totalCount = 0

    if (q) {
      // For search, count matching customers
      const { count, error: countError } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,city.ilike.%${q}%`)

      if (countError) {
        console.error("[v0] [/api/crm/customers] Count error:", countError)
      } else {
        totalCount = count || 0
      }
    } else {
      // For non-search, count all customers
      const { count, error: countError } = await supabase.from("customers").select("*", { count: "exact", head: true })

      if (countError) {
        console.error("[v0] [/api/crm/customers] Count error:", countError)
      } else {
        totalCount = count || 0
      }
    }

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

    console.log("[v0] [/api/crm/customers] Successfully fetched", data?.length || 0, "customers, total:", totalCount)
    return NextResponse.json({ customers: data ?? [], total: totalCount })
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
