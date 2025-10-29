import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/api-auth"
import { buildEmail, type EmailTemplateId } from "@/lib/email/build"
import { emailCopy } from "@/lib/email/copy"
import { Resend } from "resend"
import {
  getEmailTemplateForStatus,
  getEmailTemplateForPaymentStatus,
  mapDBToUIStatus,
} from "@/lib/order-status-mapping"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const { orderId, templateId: customTemplateId, vars: customVars } = await request.json()

    console.log(`[v0] [notify-customer] Sending notification for order ${orderId}`)

    const supabase = createAdminClient()

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        customer:customers(*),
        order_items(*, products(*))
      `)
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      console.error("[v0] [notify-customer] Error fetching order:", orderError)
      return NextResponse.json({ error: "Failed to fetch order details" }, { status: 500 })
    }

    const uiStatus = mapDBToUIStatus(order.status)
    let templateId: EmailTemplateId

    if (order.payment_status === "paid" && !customTemplateId) {
      // Use payment receipt template for paid orders
      templateId = getEmailTemplateForPaymentStatus("paid") as EmailTemplateId
      console.log(`[v0] [notify-customer] Using payment receipt template for paid order`)
    } else {
      templateId = (customTemplateId || getEmailTemplateForStatus(uiStatus)) as EmailTemplateId
    }

    console.log(`[v0] [notify-customer] Using template: ${templateId}`)

    const defaultVars = {
      customerName: `${order.customer.first_name || ""} ${order.customer.last_name || ""}`.trim(),
      orderNumber: order.order_number || "",
      orderId: order.order_number || "",
      orderDate: order.created_at ? new Date(order.created_at).toLocaleDateString("de-DE") : "",
      orderTotal: order.total ? order.total.toFixed(2) : "0.00",
      total: order.total ? order.total.toFixed(2) : "0.00",
      subtotal: order.subtotal ? order.subtotal.toFixed(2) : "0.00",
      pickupLocation: order.pickup_location || "Siehe Bestellbestätigung",
      pickupDate: order.pickup_date ? new Date(order.pickup_date).toLocaleDateString("de-DE") : undefined,
      paymentMethod: order.payment_method || "Nicht angegeben",
      paymentStatus: order.payment_status || "pending",
      deliveryMethod: order.delivery_method || "pickup",
      orderItems: (order.order_items || []).map((item: any) => ({
        product_name: item.products?.name || item.product_name || "Unbekanntes Produkt",
        quantity: item.quantity || 0,
        unit_price: item.unit_price || 0,
        total_price: item.total_price || item.quantity * item.unit_price || 0,
      })),
    }

    const finalVars = { ...defaultVars, ...customVars }

    const { subject, html } = buildEmail(templateId, finalVars, emailCopy)

    const result = await resend.emails.send({
      from: "Südfrüchte Hohenlohe <noreply@suedfruechte-hohenlohe.de>",
      to: order.customer.email,
      subject,
      html,
    })

    console.log(`[v0] [notify-customer] Email sent successfully to ${order.customer.email}`)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("[v0] [notify-customer] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
