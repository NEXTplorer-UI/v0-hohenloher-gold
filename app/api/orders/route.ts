import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createMovementsFromOrder } from "@/lib/inventory/movement-service"

async function determineDeliveryDate(
  items: any[],
): Promise<{ deliveryDate: string | null; scheduleId: string | null }> {
  const hasSouthernFruits = items.some(
    (item) => item.category === "Südfrüchte" || item.category === "Frische Südfrüchte",
  )

  if (!hasSouthernFruits) {
    return { deliveryDate: null, scheduleId: null }
  }

  const supabase = createAdminClient()

  const { data: nextSchedule, error } = await supabase
    .from("delivery_schedules")
    .select("*")
    .gte("order_deadline", new Date().toISOString().split("T")[0])
    .order("delivery_date", { ascending: true })
    .limit(1)
    .single()

  if (error || !nextSchedule) {
    console.log("[v0] No delivery schedule found, order will be fulfilled when next schedule is available")
    return { deliveryDate: null, scheduleId: null }
  }

  return {
    deliveryDate: nextSchedule.delivery_date,
    scheduleId: nextSchedule.id,
  }
}

export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json()

    console.log("[v0] API: Saving order to database:", orderData)

    const supabase = createAdminClient()

    const { data: customers, error: customerError } = await supabase
      .from("customers")
      .select("id, user_id")
      .eq("email_normalized", orderData.email.toLowerCase().trim())
      .limit(1)

    if (customerError) {
      console.error("[v0] API: Error finding customer:", customerError)
      return NextResponse.json({ success: false, error: customerError.message }, { status: 500 })
    }

    if (!customers || customers.length === 0) {
      console.error("[v0] API: Customer not found for email:", orderData.email)
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 })
    }

    const customer = customers[0]

    const orderTime = orderData.orderTime ? new Date(orderData.orderTime) : new Date()

    const subtotal = orderData.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0)
    const shippingCost = orderData.deliveryMethod === "delivery" ? 4.9 : 0
    const total = subtotal + shippingCost

    const { deliveryDate, scheduleId } = await determineDeliveryDate(orderData.items)
    console.log("[v0] Determined delivery date:", deliveryDate, "Schedule ID:", scheduleId)

    const orderRecord = {
      customer_id: customer.id,
      user_id: customer.user_id,
      order_time: orderTime.toISOString(),
      subtotal: subtotal,
      shipping_cost: shippingCost,
      total: total,
      delivery_method: orderData.deliveryMethod,
      pickup_location: orderData.pickupLocation || null,
      pickup_location_id: orderData.pickupLocationId || null, // Added pickup_location_id
      payment_method: orderData.paymentMethod,
      payment_status: orderData.paymentMethod === "stripe" ? "paid" : "pending",
      status: "confirmed",
      notes: orderData.notes || null,
      pickup_reminders: orderData.emailReminder || false,
      email_notifications: orderData.emailUpdates || false,
      pickup_date: deliveryDate,
      created_at: orderTime.toISOString(),
    }

    console.log("[v0] API: Order record with pickup_location_id:", orderRecord.pickup_location_id)

    const { data: orderResult, error: orderError } = await supabase.from("orders").insert(orderRecord).select()

    if (orderError) {
      console.error("[v0] API: Error saving order:", orderError)
      return NextResponse.json({ success: false, error: orderError.message }, { status: 500 })
    }

    const savedOrder = orderResult[0]

    const productNames = orderData.items.map((item: any) => item.name)
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name")
      .in("name", productNames)

    if (productsError) {
      console.error("[v0] API: Error fetching products:", productsError)
    }

    // Create a map of product names to IDs
    const productMap = new Map(products?.map((p) => [p.name, p.id]) || [])

    const orderItems = orderData.items.map((item: any) => ({
      order_id: savedOrder.id,
      product_id: productMap.get(item.name) || null,
      product_name: item.name,
      product_category: item.category || "Unbekannt",
      product_size: item.size || null,
      quantity: item.quantity,
      unit_price: item.price,
      expected_delivery_date: deliveryDate,
      delivery_schedule_id: scheduleId,
      created_at: orderTime.toISOString(),
    }))

    const { data: itemsResult, error: itemsError } = await supabase.from("order_items").insert(orderItems).select()

    if (itemsError) {
      console.error("[v0] API: Error saving order items:", itemsError)
      await supabase.from("orders").delete().eq("id", savedOrder.id)
      return NextResponse.json({ success: false, error: itemsError.message }, { status: 500 })
    }

    const { data: customerStats, error: statsError } = await supabase
      .from("customers")
      .select("total_orders, total_spent")
      .eq("id", customer.id)
      .single()

    if (!statsError && customerStats) {
      const newTotalOrders = (customerStats.total_orders || 0) + 1
      const newTotalSpent = (customerStats.total_spent || 0) + total

      const updateData: any = {
        total_orders: newTotalOrders,
        total_spent: newTotalSpent,
        last_order_date: orderTime.toISOString(),
        customer_segment: newTotalOrders === 1 ? "new" : "returning",
        reminder_notifications: orderData.emailReminder || false,
      }

      // Track consent if newsletter subscription changed
      if (orderData.emailUpdates) {
        updateData.marketing_consent = true
        updateData.marketing_consent_at = orderTime.toISOString()
        updateData.marketing_consent_ip =
          request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null
        updateData.marketing_consent_ua = request.headers.get("user-agent")
      }

      const { error: updateError } = await supabase.from("customers").update(updateData).eq("id", customer.id)

      if (updateError) {
        console.error("[v0] API: Error updating customer stats:", updateError)
      } else {
        console.log("[v0] API: Customer stats updated successfully")
      }
    }

    console.log("[v0] API: Order saved successfully:", {
      orderId: savedOrder.id,
      orderNumber: savedOrder.order_number,
      orderTime: savedOrder.created_at,
      deliveryDate: deliveryDate,
      itemCount: itemsResult.length,
    })

    if (savedOrder.status === "confirmed") {
      try {
        await createMovementsFromOrder(
          savedOrder.id,
          savedOrder.order_number,
          itemsResult.map((item) => ({
            id: item.id,
            product_id: item.product_id || 0,
            product_name: item.product_name,
            product_category: item.product_category,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
          "Kundenbestellung",
        )
        console.log(`[v0] Created inventory movements for new order ${savedOrder.order_number}`)
      } catch (movementError) {
        console.error(`[v0] Failed to create inventory movements for new order:`, movementError)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        order: savedOrder,
        items: itemsResult,
      },
    })
  } catch (error) {
    console.error("[v0] API: Order save error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
