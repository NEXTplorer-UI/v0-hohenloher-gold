import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function DELETE() {
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

    // Delete test orders (cascade will delete order_items)
    const { error: ordersError, count: deletedOrders } = await supabase
      .from("orders")
      .delete({ count: "exact" })
      .eq("is_test", true)

    if (ordersError) {
      console.error("[v0] Error deleting test orders:", ordersError)
      return NextResponse.json({ error: "Failed to delete test orders" }, { status: 500 })
    }

    // Delete test customers
    const { error: customersError, count: deletedCustomers } = await supabase
      .from("customers")
      .delete({ count: "exact" })
      .eq("is_test", true)

    if (customersError) {
      console.error("[v0] Error deleting test customers:", customersError)
      return NextResponse.json({ error: "Failed to delete test customers" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      deletedOrders: deletedOrders ?? 0,
      deletedCustomers: deletedCustomers ?? 0,
    })
  } catch (error) {
    console.error("[v0] Error deleting test data:", error)
    return NextResponse.json({ error: "Failed to delete test data" }, { status: 500 })
  }
}
