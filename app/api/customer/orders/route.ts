import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {
              // Ignore errors in middleware
            }
          },
        },
      },
    )

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 })
    }

    // Get customer record for this user
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, email")
      .eq("user_id", user.id)
      .single()

    if (customerError || !customer) {
      console.error("[/api/customer/orders] Customer not found for user:", user.id)
      return NextResponse.json({ error: "Kundendaten nicht gefunden" }, { status: 404 })
    }

    // Fetch orders for this customer
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(
        `
        id,
        order_number,
        order_time,
        total,
        subtotal,
        shipping_cost,
        status,
        payment_status,
        payment_method,
        delivery_method,
        pickup_location,
        pickup_date,
        notes,
        created_at,
        hellocash_invoice_number
      `,
      )
      .eq("customer_id", customer.id)
      .order("order_time", { ascending: false })

    if (ordersError) {
      console.error("[/api/customer/orders] Error fetching orders:", ordersError)
      return NextResponse.json({ error: "Fehler beim Laden der Bestellungen" }, { status: 500 })
    }

    // Fetch order items for all orders
    const orderIds = orders.map((o) => o.id)
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select(
        `
        id,
        order_id,
        product_name,
        product_category,
        product_size,
        quantity,
        unit_price,
        expected_delivery_date
      `,
      )
      .in("order_id", orderIds)

    if (itemsError) {
      console.error("[/api/customer/orders] Error fetching order items:", itemsError)
      // Continue without items rather than failing completely
    }

    // Group items by order_id
    const itemsByOrder = new Map()
    orderItems?.forEach((item) => {
      if (!itemsByOrder.has(item.order_id)) {
        itemsByOrder.set(item.order_id, [])
      }
      itemsByOrder.get(item.order_id).push(item)
    })

    // Combine orders with their items
    const ordersWithItems = orders.map((order) => ({
      ...order,
      items: itemsByOrder.get(order.id) || [],
    }))

    console.log(`[/api/customer/orders] Found ${ordersWithItems.length} orders for customer ${customer.email}`)

    return NextResponse.json({
      success: true,
      data: ordersWithItems,
    })
  } catch (error: any) {
    console.error("[/api/customer/orders] Unexpected error:", error)
    return NextResponse.json({ error: "Serverfehler beim Laden der Bestellungen" }, { status: 500 })
  }
}
