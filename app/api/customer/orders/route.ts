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

    console.log("[v0] [/api/customer/orders] Auth check - user:", user?.email || "none")

    if (authError || !user) {
      console.log("[v0] [/api/customer/orders] Not authenticated")
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 })
    }

    let customer = null

    // First try: Find by user_id
    const { data: customerByUserId, error: userIdError } = await supabase
      .from("customers")
      .select("id, email, user_id")
      .eq("user_id", user.id)
      .maybeSingle()

    console.log("[v0] [/api/customer/orders] Customer lookup by user_id:", customerByUserId ? "found" : "not found")

    if (customerByUserId) {
      customer = customerByUserId
    } else {
      // Second try: Find by email and link to user_id
      console.log("[v0] [/api/customer/orders] Trying to find customer by email:", user.email)

      const { data: customerByEmail, error: emailError } = await supabase
        .from("customers")
        .select("id, email, user_id")
        .eq("email", user.email)
        .maybeSingle()

      if (customerByEmail) {
        console.log("[v0] [/api/customer/orders] Found customer by email, linking user_id")

        // Link this customer to the user_id
        const { data: updatedCustomer, error: updateError } = await supabase
          .from("customers")
          .update({ user_id: user.id, account_status: "has_account" })
          .eq("id", customerByEmail.id)
          .select("id, email, user_id")
          .single()

        if (updateError) {
          console.error("[v0] [/api/customer/orders] Error linking customer:", updateError)
        } else {
          console.log("[v0] [/api/customer/orders] Successfully linked customer to user_id")
          customer = updatedCustomer
        }
      }
    }

    // If still no customer found, return empty orders instead of error
    if (!customer) {
      console.log("[v0] [/api/customer/orders] No customer found for user:", user.id, "email:", user.email)
      return NextResponse.json({
        success: true,
        data: [],
        message: "Noch keine Bestellungen vorhanden",
      })
    }

    console.log("[v0] [/api/customer/orders] Customer found:", customer.email, "ID:", customer.id)

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
      console.error("[v0] [/api/customer/orders] Error fetching orders:", ordersError)
      return NextResponse.json({ error: "Fehler beim Laden der Bestellungen" }, { status: 500 })
    }

    console.log("[v0] [/api/customer/orders] Found ${orders.length} orders")

    // Fetch order items for all orders
    const orderIds = orders.map((o) => o.id)

    if (orderIds.length === 0) {
      console.log("[v0] [/api/customer/orders] No orders found, returning empty array")
      return NextResponse.json({
        success: true,
        data: [],
      })
    }

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
      console.error("[v0] [/api/customer/orders] Error fetching order items:", itemsError)
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

    const ordersWithItems = orders.map((order) => ({
      ...order,
      items: itemsByOrder.get(order.id) || [],
    }))

    console.log(
      `[v0] [/api/customer/orders] Returning ${ordersWithItems.length} orders (including cancelled) for customer ${customer.email}`,
    )

    return NextResponse.json({
      success: true,
      data: ordersWithItems,
    })
  } catch (error: any) {
    console.error("[v0] [/api/customer/orders] Unexpected error:", error)
    return NextResponse.json({ error: "Serverfehler beim Laden der Bestellungen" }, { status: 500 })
  }
}
