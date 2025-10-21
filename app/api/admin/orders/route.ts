import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    console.log("[v0] API: Starting to fetch orders...")

    const supabase = createAdminClient()

    console.log("[v0] API: Fetching products...")
    const { data: allProducts, error: productsError } = await supabase
      .from("products")
      .select("id, name, unit, weight_kg")

    if (productsError) {
      console.error("[v0] API: Error fetching products:", productsError)
      return NextResponse.json({ error: `Products error: ${productsError.message}` }, { status: 500 })
    }

    console.log("[v0] API: Fetched", allProducts?.length || 0, "products")

    console.log("[v0] API: Fetching orders...")
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        customer_id,
        status,
        total,
        delivery_method,
        pickup_location,
        payment_method,
        payment_status,
        notes,
        created_at,
        customer:customers (
          first_name,
          last_name,
          email,
          phone
        ),
        order_items (
          id,
          product_name,
          product_size,
          quantity,
          unit_price,
          total_price
        )
      `)
      .order("created_at", { ascending: false })

    if (ordersError) {
      console.error("[v0] API: Error fetching orders:", ordersError)
      return NextResponse.json({ error: `Orders error: ${ordersError.message}` }, { status: 500 })
    }

    console.log("[v0] API: Fetched", ordersData?.length || 0, "orders")

    const enrichedOrders = (ordersData || []).map((order) => {
      const enrichedItems = order.order_items.map((item) => {
        console.log("[v0] API: Matching product for:", {
          product_name: item.product_name,
          product_size: item.product_size,
        })

        const product = allProducts?.find((p) => {
          const nameMatch = p.name === item.product_name
          const unitMatch = p.unit === item.product_size

          if (nameMatch && !unitMatch) {
            console.log("[v0] API: Name matched but unit didn't:", {
              product_unit: p.unit,
              item_size: item.product_size,
            })
          }

          return nameMatch && unitMatch
        })

        if (product) {
          console.log("[v0] API: Product found:", {
            id: product.id,
            name: product.name,
            unit: product.unit,
            weight_kg: product.weight_kg,
          })
        } else {
          console.log("[v0] API: No matching product found for:", item.product_name, item.product_size)
        }

        return {
          ...item,
          product_id: product?.id || null,
          weight_kg: product?.weight_kg || null,
        }
      })

      return {
        ...order,
        order_items: enrichedItems,
      }
    })

    console.log("[v0] API: Successfully enriched orders")
    return NextResponse.json(enrichedOrders)
  } catch (error) {
    console.error("[v0] API: Unexpected error fetching orders:", error)
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    )
  }
}
