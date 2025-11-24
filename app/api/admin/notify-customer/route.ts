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
import { createInvoiceAfterPayment } from "@/lib/hellocash/create-invoice-after-payment"

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
        order_items(
          *, 
          products(*),
          delivery_schedule:delivery_schedules(
            id,
            delivery_date,
            pickup_start_time,
            pickup_end_time,
            notes
          )
        )
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

    if (templateId === "orderCancelled" && order.hellocash_invoice_id && order.status !== "cancelled") {
      console.log(`[v0] [notify-customer] Cancelling invoice in helloCash...`)
      try {
        const helloCashToken = process.env.HELLOCASH_API_TOKEN
        if (helloCashToken) {
          const cancelResponse = await fetch(
            `https://api.hellocash.business/api/v1/invoices/${order.hellocash_invoice_id}/cancellation`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${helloCashToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                cancellation_cashier_id: 838,
                cancellation_reason: "Bestellung storniert per E-Mail-Benachrichtigung",
                cancellation_payment_method: "cash",
              }),
            },
          )

          if (cancelResponse.ok) {
            const cancellationData = await cancelResponse.json()
            console.log(`[v0] [notify-customer] Invoice cancelled successfully in helloCash`)

            // Update order status
            await supabase
              .from("orders")
              .update({
                status: "cancelled",
                hellocash_status: "cancelled",
                admin_notes: `Storniert per E-Mail\nStorno-Nummer: ${cancellationData.cancellation_details?.number || "N/A"}`,
              })
              .eq("id", orderId)
          } else {
            console.error(`[v0] [notify-customer] Failed to cancel invoice in helloCash`)
          }
        }
      } catch (cancelError) {
        console.error(`[v0] [notify-customer] Error cancelling invoice:`, cancelError)
      }
    }

    if (templateId === "paymentReceipt" && !order.hellocash_invoice_id && order.payment_status === "paid") {
      console.log(`[v0] [notify-customer] No invoice found, creating invoice now...`)
      try {
        const invoiceResult = await createInvoiceAfterPayment(orderId)
        if (invoiceResult.success) {
          order.hellocash_invoice_id = invoiceResult.invoiceId
          order.hellocash_invoice_number = invoiceResult.invoiceNumber
          console.log(`[v0] [notify-customer] Invoice created successfully: ${invoiceResult.invoiceNumber}`)
        } else {
          console.error(`[v0] [notify-customer] Failed to create invoice: ${invoiceResult.error}`)
        }
      } catch (invoiceError) {
        console.error(`[v0] [notify-customer] Error creating invoice:`, invoiceError)
      }
    }

    const itemsBySchedule = (order.order_items || []).reduce((acc: any, item: any) => {
      const scheduleId = item.delivery_schedule_id || "no_schedule"
      if (!acc[scheduleId]) {
        acc[scheduleId] = {
          schedule: item.delivery_schedule,
          items: [],
        }
      }
      acc[scheduleId].items.push(item)
      return acc
    }, {})

    const defaultVars = {
      customerName: `${order.customer.first_name || ""} ${order.customer.last_name || ""}`.trim(),
      orderNumber: order.order_number || "",
      orderId: order.order_number || "",
      orderDate: order.created_at ? new Date(order.created_at).toLocaleDateString("de-DE") : "",
      orderTotal: order.total ? order.total.toFixed(2) : "0.00",
      total: order.total ? order.total.toFixed(2) : "0.00",
      subtotal: order.subtotal ? order.subtotal.toFixed(2) : "0.00",
      pickupLocation: order.pickup_location || "Siehe Bestellbestätigung",
      pickupDate: order.pickup_date
        ? (() => {
            const date = new Date(order.pickup_date + "T00:00:00")
            return isNaN(date.getTime())
              ? undefined
              : date.toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })
          })()
        : undefined,
      paymentMethod: order.payment_method || "Nicht angegeben",
      paymentStatus: order.payment_status || "pending",
      deliveryMethod: order.delivery_method || "pickup",
      pickupToken: order.pickup_token || undefined,
      itemsBySchedule: Object.values(itemsBySchedule),
      orderItems: (order.order_items || []).map((item: any) => ({
        product_name: item.products?.name || item.product_name || "Unbekanntes Produkt",
        quantity: item.quantity || 0,
        unit_price: item.unit_price || 0,
        total_price: item.total_price || item.quantity * item.unit_price || 0,
        product_size: item.product_size || item.products?.unit || null,
        delivery_schedule: item.delivery_schedule
          ? {
              delivery_date: item.delivery_schedule.delivery_date,
              pickup_time:
                item.delivery_schedule.pickup_start_time && item.delivery_schedule.pickup_end_time
                  ? `${item.delivery_schedule.pickup_start_time.substring(0, 5)} - ${item.delivery_schedule.pickup_end_time.substring(0, 5)}`
                  : null,
            }
          : null,
      })),
    }

    const finalVars = { ...defaultVars, ...customVars }

    const { subject, html } = buildEmail(templateId, finalVars, emailCopy)

    let attachments: Array<{ filename: string; content: string }> | undefined

    if (templateId === "paymentReceipt" && order.hellocash_invoice_id) {
      try {
        console.log(`[v0] [notify-customer] Fetching invoice PDF from helloCash...`)

        const helloCashToken = process.env.HELLOCASH_API_TOKEN
        if (!helloCashToken) {
          console.warn(`[v0] [notify-customer] HELLOCASH_API_TOKEN not configured, skipping invoice attachment`)
        } else {
          const pdfResponse = await fetch(
            `https://api.hellocash.business/api/v1/invoices/${order.hellocash_invoice_id}/pdf?cancellation=false&locale=de_DE`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${helloCashToken}`,
                Accept: "application/json",
              },
            },
          )

          if (pdfResponse.ok) {
            const pdfData = await pdfResponse.json()
            const pdfBase64 = pdfData.pdf_base64_encoded

            attachments = [
              {
                filename: `Rechnung_${order.order_number}.pdf`,
                content: pdfBase64,
              },
            ]

            console.log(`[v0] [notify-customer] Invoice PDF attached successfully`)
          } else {
            const errorText = await pdfResponse.text()
            console.error(`[v0] [notify-customer] Failed to fetch invoice PDF: ${pdfResponse.status}`, errorText)
          }
        }
      } catch (pdfError) {
        console.error(`[v0] [notify-customer] Error fetching invoice PDF:`, pdfError)
      }
    }

    const result = await resend.emails.send({
      from: "Südfrüchte Hohenlohe <noreply@suedfruechte-hohenlohe.de>",
      to: order.customer.email,
      subject,
      html,
      attachments,
    })

    console.log(`[v0] [notify-customer] Email sent successfully to ${order.customer.email}`)

    const adminEmail = process.env.SUMUP_PAY_TO_EMAIL || "kontakt@suedfruechte-hohenlohe.de"
    try {
      await resend.emails.send({
        from: "Südfrüchte Hohenlohe <noreply@suedfruechte-hohenlohe.de>",
        to: adminEmail,
        subject: `[KOPIE] ${subject}`,
        html: `
          <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; margin-bottom: 20px; border-radius: 8px;">
            <strong style="color: #92400e;">📧 Admin-Kopie</strong><br>
            <span style="color: #78350f;">Diese E-Mail wurde an ${order.customer.email} gesendet</span>
          </div>
          ${html}
        `,
        attachments,
      })
      console.log(`[v0] [notify-customer] Admin copy sent to ${adminEmail}`)
    } catch (adminEmailError) {
      console.error("[v0] [notify-customer] Failed to send admin copy:", adminEmailError)
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("[v0] [notify-customer] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
