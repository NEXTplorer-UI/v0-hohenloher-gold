import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/auth/api-auth"

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    console.log("[v0] Dashboard stats: Starting data fetch")
    const supabase = createAdminClient()

    console.log("[v0] Dashboard stats: Fetching orders...")
    const { data: orders, error: ordersError } = await supabase.from("orders").select("total, created_at, status")

    if (ordersError) {
      console.error("[v0] Dashboard stats error fetching orders:", ordersError)
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
    }

    console.log("[v0] Dashboard stats: Fetched", orders?.length || 0, "orders")

    // Calculate total revenue
    const totalRevenue = orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0

    // Calculate revenue growth (this month vs last month)
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const thisMonthRevenue =
      orders
        ?.filter((order) => {
          const orderDate = new Date(order.created_at)
          return orderDate >= thisMonth && orderDate <= thisMonthEnd
        })
        .reduce((sum, order) => sum + (order.total || 0), 0) || 0

    const lastMonthRevenue =
      orders
        ?.filter((order) => {
          const orderDate = new Date(order.created_at)
          return orderDate >= lastMonth && orderDate < thisMonth
        })
        .reduce((sum, order) => sum + (order.total || 0), 0) || 0

    const revenueGrowth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0

    // Get active customers (customers with activity in last 30 days)
    console.log("[v0] Dashboard stats: Fetching active customers...")
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: activeCustomers, error: customersError } = await supabase
      .from("customers")
      .select("id, last_activity")
      .gte("last_activity", thirtyDaysAgo.toISOString())

    if (customersError) {
      console.error("[v0] Dashboard stats error fetching customers:", customersError)
    }

    console.log("[v0] Dashboard stats: Fetched", activeCustomers?.length || 0, "active customers")

    // Get new customers this week
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    console.log("[v0] Dashboard stats: Fetching new customers...")
    const { data: newCustomers, error: newCustomersError } = await supabase
      .from("customers")
      .select("id")
      .gte("created_at", weekAgo.toISOString())

    if (newCustomersError) {
      console.error("[v0] Dashboard stats error fetching new customers:", newCustomersError)
    }

    console.log("[v0] Dashboard stats: Fetched", newCustomers?.length || 0, "new customers")

    // Get pending orders
    console.log("[v0] Dashboard stats: Fetching pending orders...")
    const { data: pendingOrders, error: pendingError } = await supabase
      .from("orders")
      .select("id, pickup_date")
      .eq("status", "pending")

    if (pendingError) {
      console.error("[v0] Dashboard stats error fetching pending orders:", pendingError)
    }

    console.log("[v0] Dashboard stats: Fetched", pendingOrders?.length || 0, "pending orders")

    // Find next pickup date
    const nextPickup = pendingOrders?.reduce(
      (earliest, order) => {
        if (!order.pickup_date) return earliest
        const pickupDate = new Date(order.pickup_date)
        return !earliest || pickupDate < earliest ? pickupDate : earliest
      },
      null as Date | null,
    )

    // Calculate today's orders
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayOrders =
      orders?.filter((order) => {
        const orderDate = new Date(order.created_at)
        return orderDate >= today && orderDate < tomorrow
      }).length || 0

    // Calculate yesterday's orders for comparison
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const yesterdayOrders =
      orders?.filter((order) => {
        const orderDate = new Date(order.created_at)
        return orderDate >= yesterday && orderDate < today
      }).length || 0

    // Calculate this week's orders
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())

    const thisWeekOrders =
      orders?.filter((order) => {
        const orderDate = new Date(order.created_at)
        return orderDate >= weekStart
      }).length || 0

    // Calculate last week's orders for growth comparison
    const lastWeekStart = new Date(weekStart)
    lastWeekStart.setDate(weekStart.getDate() - 7)

    const lastWeekOrders =
      orders?.filter((order) => {
        const orderDate = new Date(order.created_at)
        return orderDate >= lastWeekStart && orderDate < weekStart
      }).length || 0

    const weeklyGrowth = lastWeekOrders > 0 ? ((thisWeekOrders - lastWeekOrders) / lastWeekOrders) * 100 : 0

    // Calculate average order value
    const avgOrderValue = orders && orders.length > 0 ? totalRevenue / orders.length : 0

    // Calculate pickup rate (completed orders / total orders)
    const completedOrders = orders?.filter((order) => order.status === "completed").length || 0
    const pickupRate = orders && orders.length > 0 ? (completedOrders / orders.length) * 100 : 0

    console.log("[v0] Dashboard stats: Returning stats")

    return NextResponse.json({
      totalRevenue,
      revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      activeCustomers: activeCustomers?.length || 0,
      newCustomersThisWeek: newCustomers?.length || 0,
      pendingOrders: pendingOrders?.length || 0,
      nextPickupDate: nextPickup?.toLocaleDateString("de-DE") || null,
      todayOrders,
      yesterdayOrdersDiff: todayOrders - yesterdayOrders,
      thisWeekOrders,
      weeklyGrowth: Math.round(weeklyGrowth * 100) / 100,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      pickupRate: Math.round(pickupRate * 100) / 100,
    })
  } catch (error) {
    console.error("[v0] Dashboard stats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
