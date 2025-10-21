import { type NextRequest, NextResponse } from "next/server"
import { EmailService } from "@/lib/email/email-service"

export async function POST(request: NextRequest) {
  try {
    const { to } = await request.json()

    if (!to) {
      return NextResponse.json({ error: "E-Mail-Adresse ist erforderlich" }, { status: 400 })
    }

    console.log("[v0] Sending test email to:", to)

    const success = await EmailService.sendEmail({
      to,
      subject: "Test E-Mail - Hohenloher Gold",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #a16207 0%, #d97706 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Hohenloher Gold</h1>
            <p style="margin: 5px 0 0 0;">Test E-Mail</p>
          </div>
          
          <div style="padding: 20px; background: #f9f9f9;">
            <h2>Test erfolgreich!</h2>
            
            <p>Diese Test-E-Mail wurde erfolgreich über die Resend API versendet.</p>
            
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #a16207; margin-top: 0;">Konfiguration:</h3>
              <ul>
                <li><strong>Sender:</strong> kontakt@suedfruechte-hohenlohe.de</li>
                <li><strong>Service:</strong> Resend API</li>
                <li><strong>Status:</strong> Funktioniert korrekt</li>
              </ul>
            </div>
            
            <p>Die E-Mail-Funktionalität ist jetzt einsatzbereit!</p>
            
            <p>Mit freundlichen Grüßen<br>
            Ihr Team von Hohenloher Gold</p>
          </div>
          
          <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p>Hohenloher Gold | Weststraße 28 | 74629 Pfedelbach</p>
            <p>E-Mail: kontakt@suedfruechte-hohenlohe.de | Tel: 0157 357 038 64</p>
          </div>
        </div>
      `,
    })

    if (success) {
      console.log("[v0] Test email sent successfully")
      return NextResponse.json({
        success: true,
        message: "Test-E-Mail erfolgreich versendet",
      })
    } else {
      console.error("[v0] Test email failed to send")
      return NextResponse.json({ error: "E-Mail konnte nicht versendet werden" }, { status: 500 })
    }
  } catch (error) {
    console.error("[v0] Test email API error:", error)
    return NextResponse.json({ error: "Interner Server-Fehler" }, { status: 500 })
  }
}
