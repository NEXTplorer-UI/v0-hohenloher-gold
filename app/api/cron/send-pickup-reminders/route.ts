import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { EmailService } from "@/lib/email/email-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Cron job to send pickup reminders 3 days before pickup date
export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log("[Cron] Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[Cron] Starting pickup reminder job...")

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Calculate date 3 days from now
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    const targetDate = threeDaysFromNow.toISOString().split("T")[0]

    console.log(`[Cron] Looking for orders with pickup date: ${targetDate}`)

    // Find orders that need reminders
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(
        `
        id,
        order_number,
        pickup_date,
        pickup_location,
        payment_method,
        customer_id,
        customers!inner (
          email,
          first_name,
          last_name
        )
      `,
      )
      .eq("pickup_reminders", true)
      .eq("reminder_sent", false)
      .eq("pickup_date", targetDate)
      .in("status", ["pending", "confirmed", "ready"])

    if (ordersError) {
      console.error("[Cron] Error fetching orders:", ordersError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!orders || orders.length === 0) {
      console.log("[Cron] No orders found that need reminders")
      return NextResponse.json({
        success: true,
        message: "No reminders to send",
        count: 0,
      })
    }

    console.log(`[Cron] Found ${orders.length} orders that need reminders`)

    let successCount = 0
    let failCount = 0

    // Process each order
    for (const order of orders) {
      try {
        // Fetch order items
        const { data: orderItems, error: itemsError } = await supabase
          .from("order_items")
          .select("product_name, quantity, product_size")
          .eq("order_id", order.id)

        if (itemsError) {
          console.error(`[Cron] Error fetching items for order ${order.order_number}:`, itemsError)
          failCount++
          continue
        }

        // Format order items for email
        const formattedItems = orderItems?.map((item) => ({
          product_name: item.product_name,
          quantity: item.quantity,
          unit: item.product_size || "Stück",
        }))

        // Get customer info
        const customer = order.customers as any
        const customerName = `${customer.first_name} ${customer.last_name}`

        // Format pickup date
        const pickupDate = new Date(order.pickup_date + "T00:00:00").toLocaleDateString("de-DE", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })

        // Send reminder email
        const emailSent = await EmailService.sendPickupReminder(
          customer.email,
          customerName,
          order.order_number,
          pickupDate,
          order.pickup_location || "Weststraße 28, 74629 Pfedelbach",
          order.payment_method,
          formattedItems,
        )

        if (emailSent) {
          // Mark reminder as sent
          const { error: updateError } = await supabase
            .from("orders")
            .update({
              reminder_sent: true,
              reminder_sent_at: new Date().toISOString(),
            })
            .eq("id", order.id)

          if (updateError) {
            console.error(`[Cron] Error updating reminder status for order ${order.order_number}:`, updateError)
            failCount++
          } else {
            console.log(`[Cron] Reminder sent successfully for order ${order.order_number}`)
            successCount++
          }
        } else {
          console.error(`[Cron] Failed to send reminder for order ${order.order_number}`)
          failCount++
        }
      } catch (error) {
        console.error(`[Cron] Error processing order ${order.order_number}:`, error)
        failCount++
      }
    }

    console.log(`[Cron] Pickup reminder job completed. Success: ${successCount}, Failed: ${failCount}`)

    return NextResponse.json({
      success: true,
      message: "Pickup reminders processed",
      total: orders.length,
      sent: successCount,
      failed: failCount,
    })
  } catch (error) {
    console.error("[Cron] Unexpected error in pickup reminder job:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
