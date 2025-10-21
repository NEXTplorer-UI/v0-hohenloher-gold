import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/auth/api-auth"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const {
      orderId,
      orderNumber,
      customerEmail,
      customerName,
      status,
      pickupLocation,
      paymentStatus,
      paymentMethod,
      total,
      orderItems,
      notificationType,
    } = await request.json()

    console.log(`[v0] Server: Sending notification email for order ${orderNumber}`)

    const supabase = createAdminClient()

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        customers(*),
        order_items(*)
      `)
      .eq("id", orderId)
      .single()

    if (orderError) {
      console.error("[v0] Server: Error fetching order details:", orderError)
      return NextResponse.json({ error: "Failed to fetch order details" }, { status: 500 })
    }

    let subject = ""
    let message = ""
    let includeReceipt = false

    switch (notificationType) {
      case "payment_receipt":
        includeReceipt = true
        subject = `Zahlungsbeleg für Bestellung ${orderNumber} - Hohenloher Gold`
        message = `Liebe/r ${customerName},\n\nvielen Dank für Ihre Zahlung! Anbei erhalten Sie Ihren digitalen Zahlungsbeleg für Bestellung ${orderNumber}.`
        break
      case "ready_for_pickup":
        subject = `Bestellung ${orderNumber} bereit zur Abholung - Hohenloher Gold`
        message = `Liebe/r ${customerName},\n\nIhre Bestellung ${orderNumber} ist bereit zur Abholung!\n\nAbholort: ${pickupLocation || "Siehe Bestellbestätigung"}\n\nBitte bringen Sie diese E-Mail oder Ihre Bestellnummer mit.`
        break
      case "order_confirmed":
        subject = `Bestellung ${orderNumber} bestätigt - Hohenloher Gold`
        message = `Liebe/r ${customerName},\n\nIhre Bestellung ${orderNumber} wurde bestätigt und wird vorbereitet.\n\nWir werden Sie benachrichtigen, sobald Ihre Bestellung zur Abholung bereit ist.`
        break
      default:
        switch (status) {
          case "picked_up":
            subject = `Bestellung ${orderNumber} abgeholt - Hohenloher Gold`
            message = `Liebe/r ${customerName},\n\nVielen Dank für Ihre Bestellung ${orderNumber}!\n\nWir hoffen, Sie sind mit unseren Produkten zufrieden. Bei Fragen stehen wir Ihnen gerne zur Verfügung.`
            break
          case "cancelled":
            subject = `Bestellung ${orderNumber} storniert - Hohenloher Gold`
            message = `Liebe/r ${customerName},\n\nIhre Bestellung ${orderNumber} wurde storniert.\n\nBei Fragen kontaktieren Sie uns gerne.`
            break
          default:
            subject = `Update zu Ihrer Bestellung ${orderNumber} - Hohenloher Gold`
            message = `Liebe/r ${customerName},\n\nEs gibt ein Update zu Ihrer Bestellung ${orderNumber}.\n\nStatus: ${status}\n\nBei Fragen kontaktieren Sie uns gerne.`
        }
    }

    if (includeReceipt && orderData.order_items) {
      const receiptItems = orderData.order_items
        .map(
          (item: any) =>
            `${item.product_name} - ${item.quantity}x à €${item.unit_price.toFixed(2)} = €${item.total_price.toFixed(2)}`,
        )
        .join("\n")

      const getPaymentMethodDisplay = (method: string) => {
        switch (method) {
          case "cash":
            return "Barzahlung"
          case "card":
            return "Kartenzahlung"
          case "bank_transfer":
            return "Überweisung"
          default:
            return method
        }
      }

      const receiptSection = `\n\n--- DIGITALER ZAHLUNGSBELEG ---\nBestellnummer: ${orderNumber}\nDatum: ${new Date(orderData.created_at).toLocaleDateString("de-DE")}\nZahlungsmethode: ${getPaymentMethodDisplay(orderData.payment_method)}\n\nBestellte Artikel:\n${receiptItems}\n\nGesamtbetrag: €${orderData.total.toFixed(2)}\nZahlungsstatus: Bezahlt\n\nVielen Dank für Ihren Einkauf bei Hohenloher Gold!`

      message += receiptSection
    }

    const emailContent = `${message}\n\nMit freundlichen Grüßen,\nIhr Hohenloher Gold Team`

    const { data, error } = await resend.emails.send({
      from: "Hohenloher Gold <kontakt@suedfruechte-hohenlohe.de>",
      to: [customerEmail],
      subject: subject,
      text: emailContent,
    })

    if (error) {
      console.error("[v0] Server: Resend error:", error)
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
    }

    console.log(`[v0] Server: Email sent successfully to ${customerEmail}`)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] Server: Error in notify-customer API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
