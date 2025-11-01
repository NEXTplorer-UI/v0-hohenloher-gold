import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get test orders count
    const { count: testOrders } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("is_test", true)

    // Get test customers count
    const { count: testCustomers } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("is_test", true)

    return NextResponse.json({
      testOrders: testOrders ?? 0,
      testCustomers: testCustomers ?? 0,
    })
  } catch (error) {
    console.error("[v0] Error fetching test data stats:", error)
    return NextResponse.json({ error: "Failed to fetch test data statistics" }, { status: 500 })
  }
}
