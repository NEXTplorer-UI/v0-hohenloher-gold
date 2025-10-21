import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

async function getCurrentStockForProducts(supabase: any) {
  console.log("[v0] Loading current inventory stock from database...")

  const { data: movements, error } = await supabase
    .from("inventory_movements_with_details")
    .select("product_name, qty")
    .order("created_at", { ascending: true })

  if (error) {
    console.error("[v0] Error fetching inventory movements:", error.message)
    return new Map()
  }

  console.log(`[v0] Found ${movements?.length || 0} inventory movements`)

  const stockMap = new Map<string, number>()
  movements?.forEach((movement: any) => {
    const current = stockMap.get(movement.product_name) || 0
    stockMap.set(movement.product_name, current + movement.qty)
  })

  console.log(`[v0] Calculated current stock for ${stockMap.size} products`)

  return stockMap
}

async function getNextDeliverySchedule(supabase: any) {
  try {
    const { data, error } = await supabase
      .from("delivery_schedules")
      .select("*")
      .gte("order_deadline", new Date().toISOString().split("T")[0])
      .order("delivery_date", { ascending: true })
      .limit(1)

    if (error) {
      console.log("[v0] Delivery schedules table not available yet:", error.message)
      return null
    }

    return data?.[0] || null
  } catch (error) {
    console.log("[v0] Could not fetch delivery schedules:", error)
    return null
  }
}

export async function GET() {
  try {
    console.log("[v0] Products API called")
    const supabase = createAdminClient()

    const [productsResult, stockMap] = await Promise.all([
      supabase
        .from("products")
        .select(`
          *,
          categories (
            id,
            name
          )
        `)
        .eq("is_active", true)
        .order("category_id", { ascending: true })
        .order("name", { ascending: true }),
      getCurrentStockForProducts(supabase),
    ])

    const nextDelivery = await getNextDeliverySchedule(supabase)

    if (productsResult.error) {
      console.error("[v0] Database error:", productsResult.error.message)
      return NextResponse.json({ error: "Failed to load products" }, { status: 500 })
    }

    const products = productsResult.data || []

    const enrichedProducts = products.map((product: any) => {
      const currentStock = stockMap.get(product.name) || 0
      const isSouthernFruit = product.categories?.name === "Südfrüchte"

      let inStock = currentStock > 0
      let availabilityMessage = null
      let nextDeliveryDate = null

      if (isSouthernFruit && product.requires_delivery_schedule && nextDelivery) {
        const deliveryDate = new Date(nextDelivery.delivery_date)
        const orderDeadline = new Date(nextDelivery.order_deadline)
        const canOrder = orderDeadline >= new Date()

        nextDeliveryDate = deliveryDate.toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })

        if (currentStock > 0) {
          availabilityMessage = "Sofort verfügbar"
          inStock = true
        } else if (canOrder) {
          availabilityMessage = `Lieferung am ${nextDeliveryDate}`
          inStock = true
        } else {
          availabilityMessage = "Bestellschluss vorbei - nächster Termin folgt"
          inStock = false
        }
      } else if (isSouthernFruit && product.requires_delivery_schedule && !nextDelivery) {
        availabilityMessage = currentStock > 0 ? "Auf Lager" : "Keine Liefertermine verfügbar"
        inStock = currentStock > 0
      }

      return {
        ...product,
        category: product.categories?.name || "Unbekannt",
        current_stock: Math.max(0, currentStock),
        in_stock: inStock,
        availability_message: availabilityMessage,
        next_delivery_date: nextDeliveryDate,
        is_seasonal: isSouthernFruit,
      }
    })

    console.log(`[v0] Found ${enrichedProducts.length} products with stock data`)

    return NextResponse.json(enrichedProducts)
  } catch (error) {
    console.error("[v0] Error in products API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
