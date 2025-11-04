import { NextResponse } from "next/server"
import { sendEmail } from "@/lib/email/email-service"

export async function POST(request: Request) {
  try {
    const { email, firstName, confirmationUrl } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #a16207 0%, #d97706 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Willkommen bei Hohenloher Gold!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Bitte bestätigen Sie Ihre E-Mail-Adresse</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Hallo${firstName ? ` ${firstName}` : ""}!</h2>
          
          <p style="font-size: 16px; line-height: 1.6;">
            Vielen Dank für Ihre Registrierung bei Hohenloher Gold. Um Ihr Konto zu aktivieren, 
            bestätigen Sie bitte Ihre E-Mail-Adresse.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmationUrl}" 
               style="background: #a16207; color: white; padding: 15px 40px; text-decoration: none; 
                      border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">
              E-Mail-Adresse bestätigen
            </a>
          </div>
          
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>Wichtig:</strong> Dieser Link ist 1 Stunde gültig. Falls Sie diese E-Mail nicht angefordert haben, 
              können Sie sie einfach ignorieren.
            </p>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 20px;">
            Falls der Button nicht funktioniert, kopieren Sie bitte diesen Link in Ihren Browser:<br>
            <a href="${confirmationUrl}" style="color: #a16207; word-break: break-all;">${confirmationUrl}</a>
          </p>
          
          <p style="margin-top: 30px;">
            Mit freundlichen Grüßen<br>
            <strong>Ihr Team von Hohenloher Gold</strong>
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 5px 0;">Südfrüchte Hohenlohe | Weststraße 28 | 74629 Pfedelbach</p>
          <p style="margin: 5px 0;">E-Mail: kontakt@suedfruechte-hohenlohe.de | Tel: 0157 357 038 64</p>
        </div>
      </div>
    `

    const result = await sendEmail({
      to: email,
      subject: "Bestätigen Sie Ihre E-Mail-Adresse - Hohenloher Gold",
      html,
    })

    if (!result.success) {
      console.error("[v0] Failed to send confirmation email:", result.error)
      return NextResponse.json({ error: "Failed to send confirmation email" }, { status: 500 })
    }

    console.log("[v0] Confirmation email sent successfully to:", email)

    return NextResponse.json({
      success: true,
      message: "Bestätigungs-E-Mail wurde versendet",
    })
  } catch (error) {
    console.error("[v0] Error in send-confirmation-email API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
