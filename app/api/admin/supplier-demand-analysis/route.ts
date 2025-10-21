import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[v0] Server: Starting supplier demand analysis")

    const supabase = createAdminClient()

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, unit, category_id, price, min_stock, weight_kg")
      .eq("is_active", true)

    if (productsError) {
      console.error("[v0] Server: Error fetching products:", productsError)
      throw productsError
    }

    console.log("[v0] Server: Loaded products:", products?.length || 0)

    const { data: movements, error: movementsError } = await supabase
      .from("inventory_movements_with_details")
      .select("product_name, qty")
      .order("created_at", { ascending: true })

    if (movementsError) {
      console.error("[v0] Server: Error fetching inventory movements:", movementsError)
      throw movementsError
    }

    console.log("[v0] Server: Loaded inventory movements:", movements?.length || 0)

    const stockMap = new Map<string, number>()
    movements?.forEach((movement) => {
      const current = stockMap.get(movement.product_name) || 0
      stockMap.set(movement.product_name, current + movement.qty)
    })

    console.log("[v0] Server: Calculated stock for products:", stockMap.size)

    const { data: openOrders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        order_items (
          product_name,
          product_category,
          product_size,
          quantity,
          unit_price
        )
      `)
      .in("status", ["confirmed", "ready"])

    if (ordersError) {
      console.error("[v0] Server: Error fetching orders:", ordersError)
      throw ordersError
    }

    console.log("[v0] Server: Loaded open orders:", openOrders?.length || 0)

    const demandMap = new Map<string, number>()
    openOrders?.forEach((order) => {
      order.order_items?.forEach((item) => {
        const key = `${item.product_name}_${item.product_size}`
        const current = demandMap.get(key) || 0
        demandMap.set(key, current + item.quantity)
      })
    })

    console.log("[v0] Server: Calculated demand for products:", demandMap.size)

    const supplierRecommendations =
      products?.map((product) => {
        const productKey = `${product.name}_${product.unit}`

        const currentStock = Math.max(0, stockMap.get(product.name) || 0)
        const orderedQuantity = demandMap.get(productKey) || 0
        const minimumStock = product.min_stock || 0

        let neededQuantity = 0
        if (orderedQuantity > currentStock) {
          neededQuantity = orderedQuantity + minimumStock - currentStock
        } else if (currentStock < minimumStock) {
          neededQuantity = minimumStock - currentStock
        }

        const minimumOrderQuantity = product.category_id === "Südfrüchte" ? 10 : 5

        const recommendedOrder =
          neededQuantity > 0 ? Math.ceil(neededQuantity / minimumOrderQuantity) * minimumOrderQuantity : 0

        let supplier = "Allgemein Großhandel"
        if (product.category_id === "Südfrüchte") supplier = "Sizilien Direct"
        else if (product.category_id === "Trockenfrüchte") supplier = "Bio Nuss GmbH"
        else if (product.category_id === "Öle") supplier = "Sizilien Direct"
        else if (product.category_id === "Orientalisch") supplier = "Orient Foods"
        else if (product.category_id === "Geschenkkisten") supplier = "Eigene Produktion"

        let priority: "high" | "medium" | "low" = "low"
        if (orderedQuantity > currentStock) {
          priority = "high"
        } else if (currentStock < minimumStock) {
          priority = "medium"
        }

        let recommendation = "Ausreichend"
        if (recommendedOrder > 0) {
          recommendation = `Bestellen: ${recommendedOrder} ${product.unit}`
        }

        return {
          product: `${product.name} (${product.unit})`,
          category: product.category_id,
          currentStock,
          orderedQuantity,
          neededQuantity: orderedQuantity + minimumStock,
          minimumOrder: minimumOrderQuantity,
          minimumStock,
          recommendation,
          priority,
          supplier,
          unitPrice: product.price,
          totalCost: recommendedOrder * product.price,
          actualDemand: orderedQuantity,
          weight: product.weight_kg || 0,
        }
      }) || []

    console.log("[v0] Server: Generated supplier recommendations:", supplierRecommendations.length)

    return NextResponse.json({
      success: true,
      recommendations: supplierRecommendations,
      summary: {
        totalOpenOrders: openOrders?.length || 0,
        totalProducts: products?.length || 0,
        productsWithDemand: demandMap.size,
        productsWithStock: stockMap.size,
      },
    })
  } catch (error) {
    console.error("[v0] Server: Supplier demand analysis error:", error)
    return NextResponse.json({ success: false, error: "Failed to analyze supplier demand" }, { status: 500 })
  }
}
