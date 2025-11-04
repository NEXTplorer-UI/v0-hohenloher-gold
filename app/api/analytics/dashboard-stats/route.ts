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
      .select("id, total, created_at, status, pickup_date, delivery_method, payment_method")

    if (ordersError) {
      console.error("[v0] Dashboard stats error fetching orders:", ordersError)
      throw new Error(`Failed to fetch orders: ${ordersError.message}`)
    }

    console.log("[v0] Dashboard stats: Fetched", orders?.length || 0, "orders")

    const activeOrders = orders?.filter((order) => order.status !== "cancelled") || []
    const cancelledOrders = orders?.filter((order) => order.status === "cancelled") || []

    // Calculate total revenue (excluding cancelled orders)
    const totalRevenue = activeOrders.reduce((sum, order) => sum + (order.total || 0), 0)

    const cancelledOrdersCount = cancelledOrders.length
    const cancelledRevenue = cancelledOrders.reduce((sum, order) => sum + (order.total || 0), 0)
    const cancellationRate = orders && orders.length > 0 ? (cancelledOrdersCount / orders.length) * 100 : 0

    const paymentMethodStats =
      orders?.reduce(
        (acc, order) => {
          const method = order.payment_method || "unknown"
          if (!acc[method]) {
            acc[method] = { count: 0, revenue: 0 }
          }
          acc[method].count++
          if (order.status !== "cancelled") {
            acc[method].revenue += order.total || 0
          }
          return acc
        },
        {} as Record<string, { count: number; revenue: number }>,
      ) || {}

    console.log("[v0] Payment methods found:", Object.keys(paymentMethodStats))

    // Calculate revenue growth (this month vs last month)
    const now_date = new Date()
    const thisMonth = new Date(now_date.getFullYear(), now_date.getMonth(), 1)
    const lastMonth = new Date(now_date.getFullYear(), now_date.getMonth() - 1, 1)
    const thisMonthEnd = new Date(now_date.getFullYear(), now_date.getMonth() + 1, 0)

    const thisMonthRevenue =
      activeOrders
        .filter((order) => {
          const orderDate = new Date(order.created_at)
          return orderDate >= thisMonth && orderDate <= thisMonthEnd
        })
        .reduce((sum, order) => sum + (order.total || 0), 0) || 0

    const lastMonthRevenue =
      activeOrders
        .filter((order) => {
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

    // Fetch new customers this week
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

    // Fetch open orders
    console.log("[v0] Dashboard stats: Fetching open orders...")
    const { data: pendingOrders, error: pendingError } = await supabase
      .from("orders")
      .select("id, pickup_date, status")
      .in("status", ["pending", "confirmed", "ready_for_pickup"])

    if (pendingError) {
      console.error("[v0] Dashboard stats error fetching open orders:", pendingError)
      throw new Error(`Failed to fetch open orders: ${pendingError.message}`)
    }

    console.log("[v0] Dashboard stats: Fetched", pendingOrders?.length || 0, "open orders")

    const nextPickup = pendingOrders?.reduce(
      (earliest, order) => {
        if (!order.pickup_date) return earliest
        const pickupDate = new Date(order.pickup_date + "T00:00:00")
        return !earliest || pickupDate < earliest ? pickupDate : earliest
      },
      null as Date | null,
    )

    const now_utc = new Date()
    const today = new Date(now_utc.getFullYear(), now_utc.getMonth(), now_utc.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    console.log("[v0] Date range for today:", today.toISOString(), "to", tomorrow.toISOString())

    const todayOrders =
      orders?.filter((order) => {
        const orderDate = new Date(order.created_at)
        const orderDateOnly = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate())
        return orderDateOnly.getTime() === today.getTime()
      }).length || 0

    console.log("[v0] Orders today:", todayOrders)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const yesterdayOrders =
      orders?.filter((order) => {
        const orderDate = new Date(order.created_at)
        const orderDateOnly = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate())
        return orderDateOnly.getTime() === yesterday.getTime()
      }).length || 0

    console.log("[v0] Orders yesterday:", yesterdayOrders)

    const weekStart = new Date(today)
    const dayOfWeek = weekStart.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // If Sunday (0), go back 6 days, else go back to Monday
    weekStart.setDate(today.getDate() - daysToMonday)

    console.log("[v0] Week starts on:", weekStart.toISOString())

    const thisWeekOrders =
      orders?.filter((order) => {
        const orderDate = new Date(order.created_at)
        return orderDate >= weekStart
      }).length || 0

    console.log("[v0] Orders this week:", thisWeekOrders)

    const lastWeekStart = new Date(weekStart)
    lastWeekStart.setDate(weekStart.getDate() - 7)

    const lastWeekOrders =
      orders?.filter((order) => {
        const orderDate = new Date(order.created_at)
        return orderDate >= lastWeekStart && orderDate < weekStart
      }).length || 0

    const weeklyGrowth = lastWeekOrders > 0 ? ((thisWeekOrders - lastWeekOrders) / lastWeekOrders) * 100 : 0

    const pickedUpOrders = activeOrders.filter((order) => order.status === "completed").length
    const completionRate = activeOrders.length > 0 ? (pickedUpOrders / activeOrders.length) * 100 : 0

    const pickupMethodOrders = activeOrders.filter((order) => order.delivery_method === "pickup").length
    const deliveryMethodOrders = activeOrders.filter((order) => order.delivery_method === "delivery").length

    const avgOrderValue = activeOrders.length > 0 ? totalRevenue / activeOrders.length : 0

    const stats = {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      totalOrders: orders?.length || 0,
      activeOrders: activeOrders.length,
      cancelledOrders: cancelledOrdersCount,
      cancelledRevenue: Math.round(cancelledRevenue * 100) / 100,
      cancellationRate: Math.round(cancellationRate * 100) / 100,
      paymentMethods: paymentMethodStats,
      activeCustomers: activeCustomers?.length || 0,
      newCustomersThisWeek: newCustomers?.length || 0,
      pendingOrders: pendingOrders?.length || 0,
      nextPickupDate: nextPickup?.toLocaleDateString("de-DE") || null,
      todayOrders,
      yesterdayOrdersDiff: todayOrders - yesterdayOrders,
      thisWeekOrders,
      weeklyGrowth: Math.round(weeklyGrowth * 100) / 100,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      completionRate: Math.round(completionRate * 100) / 100,
      pickedUpOrders,
      pickupMethodOrders,
      deliveryMethodOrders,
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
