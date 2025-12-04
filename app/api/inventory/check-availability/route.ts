import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json()
    console.log("[v0] API: Received availability check request:", items)

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 })
    }

    const supabase = await createClient()

    const productDataPromises = items.map(async (item: { productId: number; quantity: number }) => {
      const { data, error } = await supabase
        .from("product_availability")
        .select(
          "product_id, product_name, piece_stock, gram_stock, stock_status, unit_type, weight_kg, inventory_raw_id",
        )
        .eq("product_id", item.productId)
        .single()

      if (error) {
        console.error("[v0] API: Error fetching product availability:", error)
        return null
      }

      return {
        ...item,
        availability: data,
      }
    })

    const productsWithAvailability = (await Promise.all(productDataPromises)).filter(Boolean)

    const rawStockGroups = new Map<number, typeof productsWithAvailability>()
    const standaloneProducts: typeof productsWithAvailability = []

    for (const product of productsWithAvailability) {
      if (product.availability.inventory_raw_id) {
        const rawId = product.availability.inventory_raw_id
        if (!rawStockGroups.has(rawId)) {
          rawStockGroups.set(rawId, [])
        }
        rawStockGroups.get(rawId)!.push(product)
      } else {
        standaloneProducts.push(product)
      }
    }

    console.log("[v0] API: Raw stock groups:", rawStockGroups.size, "Standalone products:", standaloneProducts.length)

    const availabilityResults = []

    for (const product of standaloneProducts) {
      const data = product.availability
      const currentStock = data.piece_stock || 0
      const available = currentStock >= product.quantity

      console.log(
        "[v0] API: Standalone product",
        data.product_name,
        "- requested:",
        product.quantity,
        "piece_stock:",
        currentStock,
        "available:",
        available,
      )

      availabilityResults.push({
        productName: data.product_name || "Unknown",
        requestedQuantity: product.quantity,
        availableStock: currentStock,
        available,
      })
    }

    for (const [rawId, groupedProducts] of rawStockGroups) {
      // All products in group share the same gram_stock
      const gramStock = groupedProducts[0].availability.gram_stock || 0

      // Calculate total grams requested across all products in this group
      let totalGramsRequested = 0

      for (const product of groupedProducts) {
        const data = product.availability
        if (data.weight_kg) {
          const requestedGrams = product.quantity * (data.weight_kg * 1000)
          totalGramsRequested += requestedGrams

          console.log(
            "[v0] API: Raw stock group",
            rawId,
            "- product:",
            data.product_name,
            "quantity:",
            product.quantity,
            "weight_kg:",
            data.weight_kg,
            "requestedGrams:",
            requestedGrams,
          )
        }
      }

      const groupAvailable = gramStock >= totalGramsRequested

      console.log(
        "[v0] API: Raw stock group",
        rawId,
        "- totalGramsRequested:",
        totalGramsRequested,
        "gram_stock:",
        gramStock,
        "available:",
        groupAvailable,
      )

      // Add results for each product in the group
      for (const product of groupedProducts) {
        const data = product.availability

        availabilityResults.push({
          productName: data.product_name || "Unknown",
          requestedQuantity: product.quantity,
          availableStock: gramStock,
          available: groupAvailable,
        })
      }
    }

    const allAvailable = availabilityResults.every((result) => result.available)
    console.log("[v0] API: Final result - allAvailable:", allAvailable, "results:", availabilityResults)

    return NextResponse.json({
      available: allAvailable,
      items: availabilityResults,
    })
  } catch (error) {
    console.error("[v0] API: Error checking availability:", error)
    return NextResponse.json({ error: "Failed to check availability" }, { status: 500 })
  }
}
