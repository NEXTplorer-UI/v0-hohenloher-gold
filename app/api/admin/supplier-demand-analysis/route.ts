import { createAdminClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/api-auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function jsonError(message: string, status = 500, details?: any) {
  return NextResponse.json(
    { success: false, error: message, details },
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  )
}

function getMinOrderQty(categoryName: string): number {
  if (categoryName === "Südfrüchte") return 10
  if (categoryName === "Trockenfrüchte") return 5
  if (categoryName === "Olivenöl") return 6
  return 5
}

function getSupplier(categoryName: string): string {
  if (categoryName === "Südfrüchte") return "Sizilien Direct"
  if (categoryName === "Trockenfrüchte") return "Bio Nuss GmbH"
  if (categoryName === "Olivenöl") return "Sizilien Direct"
  if (categoryName === "Süße Spezialitäten") return "Bio Nuss GmbH"
  if (categoryName === "Geschenkkisten") return "Eigene Produktion"
  return "Allgemein Großhandel"
}

export async function GET(request: NextRequest) {
  console.log("[v0] Supplier demand analysis API called")

  try {
    console.log("[v0] Checking authentication...")
    await requireAdmin(request)
    console.log("[v0] Authentication successful")

    const supabase = createAdminClient()

    console.log("[v0] Fetching inventory movements...")
    const { data: movements, error: movementsError } = await supabase
      .from("inventory_movements")
      .select("product_id, inventory_raw_id, qty, qty_grams, created_at")
      .order("created_at", { ascending: true })

    if (movementsError) {
      console.error("[v0] Error fetching movements:", movementsError)
      return jsonError("Failed to fetch inventory movements", 500, movementsError)
    }

    console.log("[v0] Loaded movements:", movements?.length || 0)

    const stockMap = new Map<number, number>()
    const rawStockMap = new Map<number, number>()

    movements?.forEach((m) => {
      // Product-based movements
      if (m.product_id) {
        const current = stockMap.get(m.product_id) || 0
        stockMap.set(m.product_id, current + (m.qty || 0))
      }
      // Raw stock movements
      if (m.inventory_raw_id && m.qty_grams) {
        const current = rawStockMap.get(m.inventory_raw_id) || 0
        rawStockMap.set(m.inventory_raw_id, current + (m.qty_grams || 0))
      }
    })

    console.log("[v0] Calculated stock for", stockMap.size, "products and", rawStockMap.size, "raw stock groups")

    console.log("[v0] Fetching products with categories...")
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select(`
        id,
        name,
        unit,
        category_id,
        price,
        min_stock,
        weight_kg,
        inventory_raw_id,
        categories (
          name
        )
      `)
      .eq("is_active", true)

    if (productsError) {
      console.error("[v0] Error fetching products:", productsError)
      return jsonError("Failed to fetch products", 500, productsError)
    }

    console.log("[v0] Loaded products:", products?.length || 0)

    // Fetch open orders
    console.log("[v0] Fetching open orders...")
    const { data: openOrders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        order_items (
          product_id,
          quantity
        )
      `)
      .in("status", ["confirmed", "ready"])

    if (ordersError) {
      console.error("[v0] Error fetching orders:", ordersError)
      return jsonError("Failed to fetch orders", 500, ordersError)
    }

    console.log("[v0] Loaded open orders:", openOrders?.length || 0)

    // Calculate demand from open orders
    const demandMap = new Map<number, number>()
    openOrders?.forEach((order) => {
      order.order_items?.forEach((item: any) => {
        if (item.product_id) {
          const current = demandMap.get(item.product_id) || 0
          demandMap.set(item.product_id, current + (item.quantity || 0))
        }
      })
    })

    console.log("[v0] Calculated demand for", demandMap.size, "products")

    const supplierRecommendations =
      products?.map((product: any) => {
        const currentStock = Math.max(0, stockMap.get(product.id) || 0)
        const orderedQuantity = demandMap.get(product.id) || 0
        const minimumStock = product.min_stock || 0
        const categoryName = product.categories?.name || "Unbekannt"

        let neededQuantity = 0
        if (orderedQuantity > currentStock) {
          neededQuantity = orderedQuantity + minimumStock - currentStock
        } else if (currentStock < minimumStock) {
          neededQuantity = minimumStock - currentStock
        }

        const minimumOrderQuantity = getMinOrderQty(categoryName)
        const recommendedOrder =
          neededQuantity > 0 ? Math.ceil(neededQuantity / minimumOrderQuantity) * minimumOrderQuantity : 0

        const supplier = getSupplier(categoryName)

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
          category: categoryName,
          currentStock,
          orderedQuantity,
          neededQuantity: orderedQuantity + minimumStock,
          minimumOrder: minimumOrderQuantity,
          minimumStock,
          recommendation,
          priority,
          supplier,
          unitPrice: product.price || 0,
          totalCost: recommendedOrder * (product.price || 0),
          actualDemand: orderedQuantity,
          weight: product.weight_kg || 0,
        }
      }) || []

    console.log("[v0] Generated", supplierRecommendations.length, "recommendations")

    return NextResponse.json(
      {
        success: true,
        recommendations: supplierRecommendations,
        summary: {
          totalOpenOrders: openOrders?.length || 0,
          totalProducts: products?.length || 0,
          productsWithDemand: demandMap.size,
          productsWithStock: stockMap.size,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    )
  } catch (error) {
    console.error("[v0] Supplier demand analysis error:", error)
    console.error("[v0] Error details:", error instanceof Error ? error.message : String(error))
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")

    return jsonError("Failed to analyze supplier demand", 500, error instanceof Error ? error.message : String(error))
  }
}
