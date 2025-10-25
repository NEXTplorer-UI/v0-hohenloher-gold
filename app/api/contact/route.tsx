import { type NextRequest, NextResponse } from "next/server"
import { contactSchema } from "@/lib/validation/schemas"
import { sendEmail } from "@/lib/email/email-service"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Contact form API called")

    const body = await request.json()
    const validatedData = contactSchema.parse(body)

    // Send email to company
    const companyEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #a16207 0%, #d97706 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Neue Kontaktanfrage</h1>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <h2>Kontaktdaten:</h2>
          <p><strong>Name:</strong> ${validatedData.firstName} ${validatedData.lastName}</p>
          <p><strong>E-Mail:</strong> ${validatedData.email}</p>
          <p><strong>Telefon:</strong> ${validatedData.phone || "Nicht angegeben"}</p>
          
          <h3>Nachricht:</h3>
          <div style="background: white; padding: 15px; border-radius: 8px;">
            <p style="white-space: pre-wrap;">${validatedData.message}</p>
          </div>
        </div>
      </div>
    `

    await sendEmail({
      to: "kontakt@suedfruechte-hohenlohe.de",
      subject: `Neue Kontaktanfrage von ${validatedData.firstName} ${validatedData.lastName}`,
      html: companyEmailHtml,
    })

    // Send confirmation email to customer
    const customerEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #a16207 0%, #d97706 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Südfrüchte Hohenlohe</h1>
          <p style="margin: 5px 0 0 0;">Vielen Dank für Ihre Nachricht</p>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <h2>Liebe/r ${validatedData.firstName} ${validatedData.lastName},</h2>
          
          <p>vielen Dank für Ihre Kontaktaufnahme!</p>
          
          <p>Wir haben Ihre Nachricht erhalten und werden uns schnellstmöglich bei Ihnen melden.</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #a16207; margin-top: 0;">Ihre Nachricht:</h3>
            <p style="white-space: pre-wrap;">${validatedData.message}</p>
          </div>
          
          <p>Mit freundlichen Grüßen<br>
          Ihr Team von Südfrüchte Hohenlohe</p>
        </div>
        
        <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p>Südfrüchte Hohenlohe | Weststraße 28 | 74629 Pfedelbach</p>
          <p>E-Mail: kontakt@suedfruechte-hohenlohe.de | Tel: 0157 357 038 64</p>
        </div>
      </div>
    `

    await sendEmail({
      to: validatedData.email,
      subject: "Bestätigung Ihrer Kontaktanfrage - Südfrüchte Hohenlohe",
      html: customerEmailHtml,
    })

    console.log("[v0] Contact form processed successfully")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Contact form error:", error)
    return NextResponse.json({ success: false, error: "Fehler beim Senden der Nachricht" }, { status: 500 })
  }
}
