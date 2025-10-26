import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

let statsCache: {
  data: any
  timestamp: number
} | null = null

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Dashboard stats API called")

    const now = Date.now()
    if (statsCache && now - statsCache.timestamp < CACHE_DURATION) {
      console.log("[v0] Dashboard stats: Returning cached data")
      return NextResponse.json(statsCache.data, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      })
    }

    console.log("[v0] Dashboard stats: Cache miss, fetching fresh data")

    const supabase = createAdminClient()
    console.log("[v0] Dashboard stats: Admin client created")

    console.log("[v0] Dashboard stats: Fetching orders...")
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, total, created_at, status, pickup_date, delivery_method")

    if (ordersError) {
      console.error("[v0] Dashboard stats error fetching orders:", ordersError)
      throw new Error(`Failed to fetch orders: ${ordersError.message}`)
    }

    console.log("[v0] Dashboard stats: Fetched", orders?.length || 0, "orders")

    // Calculate total revenue
    const totalRevenue = orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0

    // Calculate revenue growth (this month vs last month)
    const now_date = new Date()
    const thisMonth = new Date(now_date.getFullYear(), now_date.getMonth(), 1)
    const lastMonth = new Date(now_date.getFullYear(), now_date.getMonth() - 1, 1)
    const thisMonthEnd = new Date(now_date.getFullYear(), now_date.getMonth() + 1, 0)

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

    console.log("[v0] Dashboard stats: Fetching active customers...")
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: activeCustomers, error: customersError } = await supabase
      .from("customers")
      .select("id")
      .gte("last_order_date", thirtyDaysAgo.toISOString())

    if (customersError) {
      console.error("[v0] Dashboard stats error fetching customers:", customersError)
      throw new Error(`Failed to fetch active customers: ${customersError.message}`)
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
      throw new Error(`Failed to fetch new customers: ${newCustomersError.message}`)
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
      throw new Error(`Failed to fetch pending orders: ${pendingError.message}`)
    }

    console.log("[v0] Dashboard stats: Fetched", pendingOrders?.length || 0, "pending orders")

    const nextPickup = pendingOrders?.reduce(
      (earliest, order) => {
        if (!order.pickup_date) return earliest
        const pickupDate = new Date(order.pickup_date)
        return !earliest || pickupDate < earliest ? pickupDate : earliest
      },
      null as Date | null,
    )

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayOrders =
      orders?.filter((order) => {
        const orderDate = new Date(order.created_at)
        return orderDate >= today && orderDate < tomorrow
      }).length || 0

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const yesterdayOrders =
      orders?.filter((order) => {
        const orderDate = new Date(order.created_at)
        return orderDate >= yesterday && orderDate < today
      }).length || 0

    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())

    const thisWeekOrders =
      orders?.filter((order) => {
        const orderDate = new Date(order.created_at)
        return orderDate >= weekStart
      }).length || 0

    const lastWeekStart = new Date(weekStart)
    lastWeekStart.setDate(weekStart.getDate() - 7)

    const lastWeekOrders =
      orders?.filter((order) => {
        const orderDate = new Date(order.created_at)
        return orderDate >= lastWeekStart && orderDate < weekStart
      }).length || 0

    const weeklyGrowth = lastWeekOrders > 0 ? ((thisWeekOrders - lastWeekOrders) / lastWeekOrders) * 100 : 0

    const avgOrderValue = orders && orders.length > 0 ? totalRevenue / orders.length : 0

    const pickupOrders = orders?.filter((order) => order.delivery_method === "pickup").length || 0
    const pickupRate = orders && orders.length > 0 ? (pickupOrders / orders.length) * 100 : 0

    const stats = {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      totalOrders: orders?.length || 0,
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
    }

    statsCache = {
      data: stats,
      timestamp: now,
    }

    console.log("[v0] Dashboard stats: Returning fresh data and updating cache")

    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    })
  } catch (error) {
    console.error("[v0] Dashboard stats CRITICAL ERROR:", error)
    console.error("[v0] Error type:", error instanceof Error ? error.constructor.name : typeof error)
    console.error("[v0] Error message:", error instanceof Error ? error.message : String(error))
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
