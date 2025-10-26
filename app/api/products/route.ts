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

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select(
        `
        id,
        name,
        sku,
        description,
        image_url,
        price,
        unit,
        origin,
        weight_kg,
        is_active,
        attributes,
        created_at,
        categories!inner (
          id,
          name,
          slug
        )
      `,
      )
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (productsError) {
      console.error("[v0] Error loading products:", productsError.message)
      return NextResponse.json({ error: "Failed to load products" }, { status: 500 })
    }

    const { data: inventory, error: inventoryError } = await supabase
      .from("inventory_movements")
      .select("product_id, qty")

    const stockByProduct = new Map<number, number>()
    if (!inventoryError && inventory) {
      inventory.forEach((movement: any) => {
        const current = stockByProduct.get(movement.product_id) || 0
        stockByProduct.set(movement.product_id, current + movement.qty)
      })
    }

    const nextDelivery = await getNextDeliverySchedule(supabase)

    const enrichedProducts = (products || []).map((product: any) => {
      const currentStock = stockByProduct.get(product.id) || 0
      const category = product.categories?.name || "Unbekannt"
      const isSouthernFruit = category === "Südfrüchte"

      // Parse attributes from jsonb
      const attributes = product.attributes || {}
      // If image_url exists, use it as the primary image, otherwise fall back to attributes.images
      const images = product.image_url
        ? [product.image_url, ...(attributes.images || []).filter((img: string) => img !== product.image_url)]
        : attributes.images || []
      const organic = attributes.organic || false
      const limitPerPerson = attributes.limit_per_person || null
      const requiresDeliverySchedule = attributes.requires_delivery_schedule || false

      let inStock = currentStock > 0
      let availabilityMessage = null
      let nextDeliveryDate = null
      let isPreorder = false

      if (currentStock < 0) {
        isPreorder = true
        availabilityMessage = "Vorbestellung - Sie werden über den Liefertermin informiert"
        inStock = true
      } else if (isSouthernFruit && requiresDeliverySchedule && nextDelivery) {
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
      } else if (isSouthernFruit && requiresDeliverySchedule && !nextDelivery) {
        availabilityMessage = currentStock > 0 ? "Auf Lager" : "Keine Liefertermine verfügbar"
        inStock = currentStock > 0
      }

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        price: product.price,
        category: category,
        description: product.description || "",
        image_url: product.image_url || "/placeholder.svg",
        images: images,
        origin: product.origin || "Unbekannt",
        weight_kg: product.weight_kg || 1.0,
        organic: organic,
        limitPerPerson: limitPerPerson,
        current_stock: currentStock,
        in_stock: inStock,
        availability_message: availabilityMessage,
        next_delivery_date: nextDeliveryDate,
        is_seasonal: isSouthernFruit && requiresDeliverySchedule,
        is_preorder: isPreorder,
        requires_delivery_schedule: requiresDeliverySchedule,
        created_at: product.created_at,
      }
    })

    console.log(`[v0] Found ${enrichedProducts.length} products with full details`)

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
