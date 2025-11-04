import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const HELLOCASH_API_URL = "https://api.hellocash.net"
const HELLOCASH_BEARER_TOKEN = process.env.HELLOCASH_BEARER_TOKEN

interface SyncResult {
  success: boolean
  orderId: string
  orderNumber: string
  previousStatus: string
  newStatus: string
  helloCashStatus: string
  message: string
}

export async function syncInvoiceStatus(orderId: string): Promise<SyncResult> {
  try {
    console.log(`[helloCash] Syncing invoice status for order: ${orderId}`)

    // 1. Fetch order from database
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, status, payment_status, hellocash_invoice_id, hellocash_status")
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderError?.message}`)
    }

    // 2. Check if order has helloCash invoice
    if (!order.hellocash_invoice_id) {
      return {
        success: false,
        orderId: order.id,
        orderNumber: order.order_number,
        previousStatus: order.status,
        newStatus: order.status,
        helloCashStatus: "none",
        message: "No helloCash invoice associated with this order",
      }
    }

    // 3. Fetch invoice status from helloCash API
    const response = await fetch(`${HELLOCASH_API_URL}/invoices/${order.hellocash_invoice_id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${HELLOCASH_BEARER_TOKEN}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`helloCash API error: ${response.status} ${response.statusText}`)
    }

    const invoice = await response.json()
    console.log(`[helloCash] Invoice status from API:`, invoice.status)

    // 4. Map helloCash status to our order status
    let newOrderStatus = order.status
    let newPaymentStatus = order.payment_status

    if (invoice.status === "paid") {
      newPaymentStatus = "paid"
      // Only update order status if it's not already picked_up or cancelled
      if (order.status !== "picked_up" && order.status !== "cancelled") {
        newOrderStatus = "ready" // Mark as ready for pickup when paid
      }
    } else if (invoice.status === "cancelled") {
      newOrderStatus = "cancelled"
      newPaymentStatus = "failed"
    }

    // 5. Update order in database if status changed
    if (
      newOrderStatus !== order.status ||
      newPaymentStatus !== order.payment_status ||
      invoice.status !== order.hellocash_status
    ) {
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: newOrderStatus,
          payment_status: newPaymentStatus,
          hellocash_status: invoice.status,
          pos_synced_at: new Date().toISOString(),
        })
        .eq("id", orderId)

      if (updateError) {
        throw new Error(`Failed to update order: ${updateError.message}`)
      }

      console.log(
        `[helloCash] Order updated: ${order.status} -> ${newOrderStatus}, payment: ${order.payment_status} -> ${newPaymentStatus}`,
      )
    } else {
      console.log(`[helloCash] No status change needed`)
    }

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      previousStatus: order.status,
      newStatus: newOrderStatus,
      helloCashStatus: invoice.status,
      message: newOrderStatus !== order.status ? "Status updated" : "No change",
    }
  } catch (error: any) {
    console.error(`[helloCash] Sync failed:`, error)

    // Log error to database
    try {
      await supabase
        .from("orders")
        .update({
          hellocash_error_message: error.message,
        })
        .eq("id", orderId)
    } catch (dbError) {
      console.error(`[helloCash] Failed to log error:`, dbError)
    }

    throw error
  }
}
