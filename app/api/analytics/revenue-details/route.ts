import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const supabase = createAdminClient()

    console.log("[v0] Revenue details: Starting data fetch")

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, total, created_at, status")
      .order("created_at", { ascending: false })

    if (ordersError) {
      console.error("Revenue details error:", ordersError)
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
    }

    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("order_id, product_name, quantity, unit_price, total_price")

    if (itemsError) {
      console.error("Order items error:", itemsError)
    }

    console.log("[v0] Revenue details: Fetched", orders?.length || 0, "orders")

    const monthlyRevenue = []
    const now = new Date()

    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)

      const monthRevenue =
        orders
          ?.filter((order) => {
            const orderDate = new Date(order.created_at)
            return orderDate >= monthStart && orderDate <= monthEnd
          })
          .reduce((sum, order) => sum + (order.total || 0), 0) || 0

      monthlyRevenue.push({
        month: monthStart.toLocaleDateString("de-DE", { month: "short", year: "numeric" }),
        revenue: monthRevenue,
        orderCount:
          orders?.filter((order) => {
            const orderDate = new Date(order.created_at)
            return orderDate >= monthStart && orderDate <= monthEnd
          }).length || 0,
      })
    }

    const yearlyRevenue = []
    const currentYear = now.getFullYear()

    for (let year = currentYear - 2; year <= currentYear; year++) {
      const yearStart = new Date(year, 0, 1)
      const yearEnd = new Date(year, 11, 31)

      const revenue =
        orders
          ?.filter((order) => {
            const orderDate = new Date(order.created_at)
            return orderDate >= yearStart && orderDate <= yearEnd
          })
          .reduce((sum, order) => sum + (order.total || 0), 0) || 0

      yearlyRevenue.push({
        year: year.toString(),
        revenue,
        orderCount:
          orders?.filter((order) => {
            const orderDate = new Date(order.created_at)
            return orderDate >= yearStart && orderDate <= yearEnd
          }).length || 0,
      })
    }

    const productRevenue = new Map()

    orderItems?.forEach((item) => {
      const productName = item.product_name || "Unbekanntes Produkt"
      const itemRevenue = item.total_price || 0

      if (productRevenue.has(productName)) {
        const existing = productRevenue.get(productName)
        productRevenue.set(productName, {
          revenue: existing.revenue + itemRevenue,
          quantity: existing.quantity + (item.quantity || 0),
        })
      } else {
        productRevenue.set(productName, {
          revenue: itemRevenue,
          quantity: item.quantity || 0,
        })
      }
    })

    const topProducts = Array.from(productRevenue.entries())
      .map(([name, data]) => ({
        name,
        revenue: data.revenue,
        quantity: data.quantity,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    const thisMonth = monthlyRevenue[monthlyRevenue.length - 1]
    const lastMonth = monthlyRevenue[monthlyRevenue.length - 2]
    const monthlyGrowth =
      lastMonth && lastMonth.revenue > 0 ? ((thisMonth.revenue - lastMonth.revenue) / lastMonth.revenue) * 100 : 0

    const thisYear = yearlyRevenue[yearlyRevenue.length - 1]
    const lastYear = yearlyRevenue[yearlyRevenue.length - 2]
    const yearlyGrowth =
      lastYear && lastYear.revenue > 0 ? ((thisYear.revenue - lastYear.revenue) / lastYear.revenue) * 100 : 0

    return NextResponse.json({
      monthlyRevenue,
      yearlyRevenue,
      topProducts,
      trends: {
        monthlyGrowth: Math.round(monthlyGrowth * 100) / 100,
        yearlyGrowth: Math.round(yearlyGrowth * 100) / 100,
      },
      totalRevenue: orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0,
      totalOrders: orders?.length || 0,
    })
  } catch (error) {
    console.error("Revenue details error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
