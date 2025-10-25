import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { createMovementsFromOrder } from "@/lib/inventory/movement-service"
import { requireAdmin } from "@/lib/auth/api-auth"
import { mapUIToDBStatus, type UIOrderStatus } from "@/lib/order-status-mapping"
import { buildEmail } from "@/lib/email/build"
import { emailCopy } from "@/lib/email/copy"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    console.log("[v0] [update-order-status] Updating order status")

    const { orderId, status, paymentStatus } = await request.json()

    if (!orderId || (!status && !paymentStatus)) {
      return NextResponse.json({ error: "Order ID and at least one status field required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: currentOrder, error: fetchError } = await supabase
      .from("orders")
      .select("*, order_items(*, products(*)), customers(*)")
      .eq("id", orderId)
      .single()

    if (fetchError) {
      console.error("[v0] [update-order-status] Error fetching current order:", fetchError)
      return NextResponse.json({ error: "Failed to fetch current order" }, { status: 500 })
    }

    const previousStatus = currentOrder.status
    const previousPaymentStatus = currentOrder.payment_status

    const updateData: any = {}
    if (status) {
      const dbStatus = mapUIToDBStatus(status as UIOrderStatus)
      updateData.status = dbStatus
      console.log(`[v0] [update-order-status] Mapping UI status "${status}" to DB status "${dbStatus}"`)
    }
    if (paymentStatus) updateData.payment_status = paymentStatus

    const { data, error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .select("*, customers(*)")
      .single()

    if (error) {
      console.error("[v0] [update-order-status] Error updating order status:", error)
      return NextResponse.json({ error: "Failed to update order status" }, { status: 500 })
    }

    console.log("[v0] [update-order-status] Order status updated successfully:", orderId)

    if (paymentStatus === "paid" && previousPaymentStatus !== "paid") {
      try {
        const templateId = "payment-receipt-template" // Assuming a template ID for payment receipt
        if (templateId && currentOrder.customers?.email) {
          console.log(`[v0] [update-order-status] Sending payment receipt email to ${currentOrder.customers.email}`)

          const emailVars = {
            customerName: `${currentOrder.customers.first_name} ${currentOrder.customers.last_name}`,
            orderNumber: currentOrder.order_number,
            orderDate: new Date(currentOrder.created_at).toLocaleDateString("de-DE"),
            paymentMethod: currentOrder.payment_method,
            total: currentOrder.total_amount.toFixed(2),
            orderItems: currentOrder.order_items.map((item: any) => ({
              product_name: item.products?.name || item.product_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
            })),
          }

          const { subject, html } = buildEmail(templateId, emailVars, emailCopy)

          await resend.emails.send({
            from: "Südfrüchte Hohenlohe <noreply@suedfruechte-hohenlohe.de>",
            to: currentOrder.customers.email,
            subject,
            html,
          })

          console.log(`[v0] [update-order-status] Payment receipt email sent successfully`)
        }
      } catch (emailError) {
        console.error(`[v0] [update-order-status] Failed to send payment receipt email:`, emailError)
        // Don't fail the status update if email fails
      }
    }

    if (status && status !== previousStatus) {
      try {
        if (status === "confirmed" && previousStatus !== "confirmed") {
          await createMovementsFromOrder(
            currentOrder.order_number,
            currentOrder.order_items.map((item: any) => ({
              product_name: item.product_name,
              product_category: item.product_category,
              quantity: item.quantity,
              unit_price: item.unit_price,
            })),
            "Ausgang",
            "Bestellung bestätigt",
          )
          console.log(`[v0] Created outgoing inventory movements for confirmed order ${currentOrder.order_number}`)
        } else if (status === "cancelled" && previousStatus === "confirmed") {
          await createMovementsFromOrder(
            currentOrder.order_number,
            currentOrder.order_items.map((item: any) => ({
              product_name: item.product_name,
              product_category: item.product_category,
              quantity: item.quantity,
              unit_price: item.unit_price,
            })),
            "Eingang",
            "Bestellung storniert - Lager zurückgebucht",
          )
          console.log(`[v0] Created reversal inventory movements for cancelled order ${currentOrder.order_number}`)
        }
      } catch (movementError) {
        console.error(`[v0] Failed to create inventory movements for status change:`, movementError)
      }
    }

    return NextResponse.json({ success: true, order: data })
  } catch (error) {
    console.error("[v0] [update-order-status] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
