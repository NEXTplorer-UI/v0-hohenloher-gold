import { type NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email/email-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderNumber, customerName, feedback, source } = body

    if (!feedback || !feedback.trim()) {
      return NextResponse.json({ error: "Feedback ist erforderlich" }, { status: 400 })
    }

    // Send feedback email to admin
    const emailData = {
      to: "kontakt@suedfruechte-hohenlohe.de",
      subject: `Kundenfeedback ${orderNumber ? `zu Bestellung ${orderNumber}` : ""}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #a16207 0%, #d97706 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Kundenfeedback</h1>
            <p style="margin: 5px 0 0 0;">Neue Rückmeldung erhalten</p>
          </div>
          
          <div style="padding: 20px; background: #f9f9f9;">
            <h2>Feedback Details</h2>
            
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
              ${orderNumber ? `<p><strong>Bestellnummer:</strong> ${orderNumber}</p>` : ""}
              ${customerName ? `<p><strong>Kunde:</strong> ${customerName}</p>` : ""}
              <p><strong>Quelle:</strong> ${source === "order_confirmation" ? "Bestellbestätigungsseite" : "Unbekannt"}</p>
            </div>
            
            <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Nachricht:</h3>
              <p style="white-space: pre-wrap;">${feedback}</p>
            </div>
            
            <p style="font-size: 12px; color: #666;">
              Diese Nachricht wurde automatisch vom Feedback-System generiert.
            </p>
          </div>
          
          <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p>Südfrüchte Hohenlohe | Weststraße 28 | 74629 Pfedelbach</p>
          </div>
        </div>
      `,
    }

    const result = await sendEmail(emailData)

    if (!result.success) {
      return NextResponse.json({ error: "Fehler beim Senden des Feedbacks" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing feedback:", error)
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 })
  }
}
