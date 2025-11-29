import { NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { email, name, userId } = await request.json()

    if (!email || !name) {
      return NextResponse.json({ error: "Email and name are required" }, { status: 400 })
    }

    // Send notification email to admin
    const { data, error } = await resend.emails.send({
      from: "Hohenloher Gold <noreply@hohenloher-gold.de>",
      to: process.env.SUMUP_PAY_TO_EMAIL || "kontakt@suedfruechte-hohenlohe.de",
      subject: "Neues Kundenkonto erstellt",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #d4af37;">Neues Kundenkonto erstellt</h2>
          <p>Ein neuer Kunde hat sich registriert:</p>
          <ul>
            <li><strong>Name:</strong> ${name}</li>
            <li><strong>E-Mail:</strong> ${email}</li>
            <li><strong>User ID:</strong> ${userId || "N/A"}</li>
            <li><strong>Zeitpunkt:</strong> ${new Date().toLocaleString("de-DE")}</li>
          </ul>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            Diese E-Mail wurde automatisch generiert.
          </p>
        </div>
      `,
    })

    if (error) {
      console.error("[v0] Error sending admin notification:", error)
      return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
    }

    console.log("[v0] Admin notification sent successfully:", data)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] Error in notify-new-account API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
