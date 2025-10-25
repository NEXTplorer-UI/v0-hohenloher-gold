import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

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

    const { data: productsWithStock, error: viewError } = await supabase
      .from("product_availability")
      .select("*")
      .order("name", { ascending: true })

    if (viewError) {
      console.error("[v0] Error loading from product_availability view:", viewError.message)
      return NextResponse.json({ error: "Failed to load products" }, { status: 500 })
    }

    const nextDelivery = await getNextDeliverySchedule(supabase)

    const enrichedProducts = (productsWithStock || []).map((product: any) => {
      const currentStock = product.current_stock || 0
      const isSouthernFruit = product.category === "Südfrüchte"

      let inStock = currentStock > 0
      let availabilityMessage = null
      let nextDeliveryDate = null
      let isPreorder = false

      if (currentStock < 0) {
        isPreorder = true
        availabilityMessage = "Vorbestellung - Sie werden über den Liefertermin informiert"
        inStock = true // Allow ordering
      } else if (isSouthernFruit && product.requires_delivery_schedule && nextDelivery) {
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
        id: product.product_id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        price: product.price,
        category: product.category || "Unbekannt",
        current_stock: currentStock, // Show actual stock including negatives
        in_stock: inStock,
        availability_message: availabilityMessage,
        next_delivery_date: nextDeliveryDate,
        is_seasonal: isSouthernFruit,
        is_preorder: isPreorder,
        stock_status: product.stock_status,
      }
    })

    console.log(`[v0] Found ${enrichedProducts.length} products from product_availability view`)

    return NextResponse.json(enrichedProducts, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    })
  } catch (error) {
    console.error("[v0] Error in products API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
