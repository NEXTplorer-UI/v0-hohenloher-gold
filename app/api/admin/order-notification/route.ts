import { type NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email/email-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      orderNumber,
      customerEmail,
      customerName,
      total,
      deliveryMethod,
      pickupLocation,
      paymentMethod,
      items,
      adminEmail,
    } = body

    console.log("[/api/admin/order-notification] Sending admin notification for order:", orderNumber)

    const itemsList = items
      .map(
        (item: any) =>
          `<tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.product_name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}x</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.product_size || "-"}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">€${item.unit_price.toFixed(2)}</td>
          </tr>`,
      )
      .join("")

    const deliveryMethodText = deliveryMethod === "pickup" ? `Abholung (${pickupLocation || "Unbekannt"})` : "Lieferung"
    const paymentMethodText =
      paymentMethod === "sumup"
        ? "SumUp (Karte)"
        : paymentMethod === "cash"
          ? "Barzahlung"
          : paymentMethod === "bank_transfer"
            ? "Überweisung"
            : paymentMethod

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #a16207 0%, #d97706 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Neue Bestellung eingegangen</h1>
          <p style="margin: 5px 0 0 0;">Südfrüchte Hohenlohe</p>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <h2 style="color: #a16207;">Bestelldetails</h2>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Bestellnummer:</strong> ${orderNumber}</p>
            <p><strong>Kunde:</strong> ${customerName}</p>
            <p><strong>E-Mail:</strong> ${customerEmail}</p>
            <p><strong>Gesamtbetrag:</strong> €${total.toFixed(2)}</p>
            <p><strong>Liefermethode:</strong> ${deliveryMethodText}</p>
            <p><strong>Zahlungsmethode:</strong> ${paymentMethodText}</p>
          </div>
          
          <h3 style="color: #a16207;">Bestellte Artikel</h3>
          <table style="width: 100%; background: white; border-radius: 8px; overflow: hidden; border-collapse: collapse;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Produkt</th>
                <th style="padding: 12px 8px; text-align: center; border-bottom: 2px solid #e5e7eb;">Menge</th>
                <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Einheit</th>
                <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #e5e7eb;">Preis</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList}
            </tbody>
          </table>
          
          <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
            <p style="margin: 0;"><strong>Hinweis:</strong> Diese E-Mail dient nur zur Information. Bitte bearbeiten Sie die Bestellung im Admin-System.</p>
          </div>
        </div>
        
        <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p>Südfrüchte Hohenlohe Admin-Benachrichtigung</p>
        </div>
      </div>
    `

    const result = await sendEmail({
      to: adminEmail,
      subject: `Neue Bestellung: ${orderNumber} - ${customerName}`,
      html,
    })

    if (!result.success) {
      console.error("[/api/admin/order-notification] Failed to send admin notification:", result.error)
      return NextResponse.json({ error: "Failed to send admin notification" }, { status: 500 })
    }

    console.log("[/api/admin/order-notification] Admin notification sent successfully")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[/api/admin/order-notification] Error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
