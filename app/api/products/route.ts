console.log("[v0] DEBUG: route.ts LOADED")

import { getAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

async function getNextDeliverySchedule(supabase: any) {
  try {
    const { data: futureSchedules, error } = await supabase
      .from("delivery_schedules")
      .select("*")
      .gte("delivery_date", new Date().toISOString().split("T")[0])
      .order("delivery_date", { ascending: true })

    if (error) {
      return null
    }

    if (!futureSchedules || futureSchedules.length === 0) {
      return null
    }

    const today = new Date().toISOString().split("T")[0]
    const availableSchedule = futureSchedules.find((schedule: any) => schedule.order_deadline >= today)

    return availableSchedule || null
  } catch (error) {
    console.log("[v0] Could not fetch delivery schedules:", error)
    return null
  }
}

async function getNextDeliveryScheduleRegardlessOfDeadline(supabase: any) {
  try {
    const { data: futureSchedules, error } = await supabase
      .from("delivery_schedules")
      .select("*")
      .gte("delivery_date", new Date().toISOString().split("T")[0])
      .eq("status", "confirmed")
      .order("delivery_date", { ascending: true })
      .limit(1)

    if (error || !futureSchedules || futureSchedules.length === 0) {
      return null
    }

    return futureSchedules[0]
  } catch (error) {
    console.log("[v0] Could not fetch next delivery schedule:", error)
    return null
  }
}

export async function GET() {
  try {
    const supabase = getAdminClient()

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
        inventory_raw_id,
        is_active,
        attributes,
        created_at,
        categories!inner (
          id,
          name,
          slug,
          display_order
        )
      `,
      )
      .eq("is_active", true)

    if (productsError) {
      console.error("[v0] Error loading products:", productsError.message)
      return NextResponse.json({ error: "Failed to load products" }, { status: 500 })
    }

    const { data: availabilityData, error: availabilityError } = await supabase
      .from("product_availability")
      .select("product_id, stock_status, piece_stock, gram_stock")

    // Create map for quick lookup
    const availabilityMap = new Map<number, any>()
    if (!availabilityError && availabilityData) {
      availabilityData.forEach((item: any) => {
        availabilityMap.set(item.product_id, item)
      })
    }

    const { data: inventory, error: inventoryError } = await supabase
      .from("inventory_movements")
      .select("product_id, inventory_raw_id, qty, qty_grams")

    const stockByProduct = new Map<number, number>()
    const rawStockByGroup = new Map<number, number>()

    if (!inventoryError && inventory) {
      inventory.forEach((movement: any) => {
        if (movement.product_id && movement.qty != null) {
          const current = stockByProduct.get(movement.product_id) || 0
          stockByProduct.set(movement.product_id, current + movement.qty)
        }
        if (movement.inventory_raw_id && movement.qty_grams != null) {
          const current = rawStockByGroup.get(movement.inventory_raw_id) || 0
          rawStockByGroup.set(movement.inventory_raw_id, current + movement.qty_grams)
        }
      })
    }

    const nextDelivery = await getNextDeliverySchedule(supabase)
    const nextDeliveryRegardless = await getNextDeliveryScheduleRegardlessOfDeadline(supabase)

    const localImageProducts: string[] = []
    const supabaseImageProducts: string[] = []
    const noImageProducts: string[] = []

    const enrichedProducts = (products || []).map((product: any) => {
      const availability = availabilityMap.get(product.id)
      const stockStatus = availability?.stock_status || "out_of_stock"

      const currentStock = product.inventory_raw_id ? availability?.gram_stock || 0 : availability?.piece_stock || 0

      const category = product.categories?.name || "Unbekannt"
      const categoryDisplayOrder = product.categories?.display_order ?? 999
      const isSouthernFruit = category === "Südfrüchte"

      const attributes = product.attributes || {}
      const images = product.image_url
        ? [product.image_url, ...(attributes.images || []).filter((img: string) => img !== product.image_url)]
        : attributes.images || []
      const organic = attributes.organic || false
      const limitPerPerson = attributes.limit_per_person || null
      const requiresDeliverySchedule = attributes.requires_delivery_schedule || false

      if (!product.image_url || product.image_url === "/placeholder.svg") {
        noImageProducts.push(product.name)
      } else if (product.image_url.startsWith("http")) {
        supabaseImageProducts.push(product.name)
      } else {
        localImageProducts.push(product.name)
      }

      let inStock = stockStatus === "in_stock" || stockStatus === "low_stock"
      let availabilityMessage = null
      let nextDeliveryDate = null
      let isPreorder = false

      if (currentStock < 0) {
        isPreorder = true
        availabilityMessage = "Vorbestellung - Sie werden über den Liefertermin informiert"
        inStock = true
      } else if (isSouthernFruit && requiresDeliverySchedule) {
        if (nextDelivery) {
          const deliveryDate = new Date(nextDelivery.delivery_date)
          const orderDeadline = new Date(nextDelivery.order_deadline)
          const canOrder = orderDeadline >= new Date()

          nextDeliveryDate = deliveryDate.toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })

          if (stockStatus === "in_stock" || stockStatus === "low_stock") {
            availabilityMessage = "Sofort verfügbar"
            inStock = true
          } else if (canOrder) {
            availabilityMessage = `Lieferung am ${nextDeliveryDate}`
            inStock = true
          } else {
            availabilityMessage = `Nächste Lieferung: ${nextDeliveryDate}`
            inStock = true
          }
        } else if (nextDeliveryRegardless) {
          const deliveryDate = new Date(nextDeliveryRegardless.delivery_date)
          nextDeliveryDate = deliveryDate.toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })

          if (stockStatus === "in_stock" || stockStatus === "low_stock") {
            availabilityMessage = "Sofort verfügbar"
            inStock = true
          } else {
            availabilityMessage = `Nächste Lieferung: ${nextDeliveryDate}`
            inStock = true
          }
        } else {
          availabilityMessage =
            stockStatus === "in_stock" || stockStatus === "low_stock"
              ? "Auf Lager"
              : "Aktuell keine Liefertermine verfügbar"
          inStock = stockStatus === "in_stock" || stockStatus === "low_stock"
        }
      } else {
        if (stockStatus === "in_stock" || stockStatus === "low_stock") {
          availabilityMessage = "Auf Lager - sofort lieferbar"
          inStock = true
        } else {
          availabilityMessage = "Nicht auf Lager"
          inStock = false
        }
      }

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        price: product.price,
        category: category,
        category_display_order: categoryDisplayOrder,
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
        attributes: product.attributes,
      }
    })

    return NextResponse.json(enrichedProducts, {
      headers: {
        "Cache-Control": "public, max-age=60, must-revalidate",
        "CDN-Cache-Control": "public, max-age=60",
      },
    })
  } catch (error) {
    console.error("[v0] Error in products API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
