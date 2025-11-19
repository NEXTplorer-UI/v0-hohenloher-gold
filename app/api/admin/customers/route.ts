import { createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")
    const personId = searchParams.get("person_id")

    console.log("[v0] [/api/crm/customers] GET request received")
    console.log("[v0] [/api/crm/customers] Query params:", { q: query, limit, offset, person_id: personId })

    let queryBuilder = supabase
      .from("customers")
      .select("*", { count: "exact" })

    if (personId) {
      queryBuilder = queryBuilder.eq("default_distribution_person_id", personId)
    } else if (query && query.trim()) {
      // Only apply search if no person_id filter
      const searchLower = query.toLowerCase()
      queryBuilder = queryBuilder.or(
        `first_name.ilike.%${searchLower}%,last_name.ilike.%${searchLower}%,email.ilike.%${searchLower}%`
      )
    }

    const { data: customers, error, count } = await queryBuilder
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("[v0] [/api/crm/customers] Error fetching customers:", error)
      return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
    }

    console.log("[v0] [/api/crm/customers] Successfully fetched", customers?.length || 0, "customers, total:", count)

    return NextResponse.json({
      customers: customers || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error("[v0] [/api/crm/customers] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
