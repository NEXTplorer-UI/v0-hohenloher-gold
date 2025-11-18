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
      const { count, error: countError } = await supabase.from("customers").select("*", { count: "exact", head: true })

      if (countError) {
        console.error("[v0] [/api/crm/customers] Count error:", countError)
      } else {
        totalCount = count || 0
      }
    }

    const { data, error } = await supabase.rpc("crm_customers_search", {
      q,
      limit_count: limit,
      offset_count: offset,
    })

    if (error) {
      console.error("[v0] [/api/crm/customers] Database error:", error)
      return NextResponse.json({ error: "Database error", details: error.message }, { status: 500 })
    }

    if (!Array.isArray(data)) {
      console.error("[v0] [/api/crm/customers] Data is not an array:", typeof data)
      return NextResponse.json({ customers: [], total: 0 })
    }

    if (data && data.length > 0) {
      console.log("[v0] [/api/crm/customers] First customer from RPC:", {
        email: data[0].email,
        newsletter_subscribed: data[0].newsletter_subscribed,
        marketing_consent: data[0].marketing_consent,
        reminder_notifications: data[0].reminder_notifications,
      })
    }

    const authUsersMap = new Map<string, { email_confirmed_at: string | null }>()
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers()

      if (authError) {
        console.error("[v0] [/api/crm/customers] Auth error:", authError)
      } else if (authData?.users && Array.isArray(authData.users)) {
        // Create a map of email -> user data for fast lookup
        authData.users.forEach((user) => {
          if (user.email) {
            authUsersMap.set(user.email, {
              email_confirmed_at: user.email_confirmed_at || null,
            })
          }
        })
      }
    } catch (e) {
      console.error("[v0] [/api/crm/customers] Error fetching auth users:", e)
    }

    const customersWithAuthStatus = data.map((customer) => {
      const authUser = authUsersMap.get(customer.email)

      return {
        ...customer,
        email_confirmed: !!authUser?.email_confirmed_at,
        email_confirmed_at: authUser?.email_confirmed_at || null,
      }
    })

    console.log(
      "[v0] [/api/crm/customers] Successfully fetched",
      customersWithAuthStatus?.length || 0,
      "customers with auth status, total:",
      totalCount,
    )
    return NextResponse.json({ customers: customersWithAuthStatus ?? [], total: totalCount })
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
