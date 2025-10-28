import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const subjectLabels: Record<string, string> = {
  auskunft: "Auskunftsrecht (Art. 15 DSGVO)",
  loeschung: "Löschungsrecht (Art. 17 DSGVO)",
  berichtigung: "Berichtigungsrecht (Art. 16 DSGVO)",
  widerspruch: "Widerspruchsrecht (Art. 21 DSGVO)",
  einschraenkung: "Recht auf Einschränkung (Art. 18 DSGVO)",
  datenportabilitaet: "Datenübertragbarkeit (Art. 20 DSGVO)",
  sonstiges: "Sonstige Datenschutzfrage",
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message } = await request.json()

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "Alle Felder sind erforderlich" }, { status: 400 })
    }

    const subjectLabel = subjectLabels[subject] || subject

    // Send email to company
    await resend.emails.send({
      from: "Datenschutz-Anfrage <noreply@suedfruechte-hohenlohe.de>",
      to: "suedfruechte-hohenlohe@outlook.de",
      replyTo: email,
      subject: `Datenschutz-Anfrage: ${subjectLabel}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #a16207 0%, #d97706 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
              .field { margin-bottom: 15px; }
              .label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }
              .value { margin-top: 5px; padding: 10px; background: white; border-radius: 4px; border: 1px solid #e5e7eb; }
              .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin: 0;">Neue Datenschutz-Anfrage</h2>
              </div>
              <div class="content">
                <div class="field">
                  <div class="label">Art der Anfrage</div>
                  <div class="value">${subjectLabel}</div>
                </div>
                <div class="field">
                  <div class="label">Name</div>
                  <div class="value">${name}</div>
                </div>
                <div class="field">
                  <div class="label">E-Mail-Adresse</div>
                  <div class="value">${email}</div>
                </div>
                <div class="field">
                  <div class="label">Nachricht</div>
                  <div class="value">${message.replace(/\n/g, "<br>")}</div>
                </div>
                <div class="footer">
                  <p><strong>Wichtig:</strong> Diese Anfrage muss gemäß DSGVO innerhalb von 30 Tagen beantwortet werden.</p>
                  <p>Eingegangen am: ${new Date().toLocaleString("de-DE")}</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    })

    // Send confirmation email to user
    await resend.emails.send({
      from: "Südfrüchte Hohenlohe <noreply@suedfruechte-hohenlohe.de>",
      to: email,
      subject: "Bestätigung Ihrer Datenschutz-Anfrage",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #a16207 0%, #d97706 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin: 0;">Bestätigung Ihrer Datenschutz-Anfrage</h2>
              </div>
              <div class="content">
                <p>Sehr geehrte/r ${name},</p>
                <p>vielen Dank für Ihre Anfrage bezüglich <strong>${subjectLabel}</strong>.</p>
                <p>Wir haben Ihre Anfrage erhalten und werden uns schnellstmöglich, spätestens innerhalb von 30 Tagen gemäß DSGVO, bei Ihnen melden.</p>
                <p><strong>Ihre Anfrage:</strong></p>
                <p style="background: white; padding: 15px; border-radius: 4px; border: 1px solid #e5e7eb;">${message.replace(/\n/g, "<br>")}</p>
                <p>Mit freundlichen Grüßen<br>Ihr Südfrüchte Hohenlohe Team</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="font-size: 12px; color: #6b7280;">
                  Gerlinde Fink<br>
                  Weststraße 28<br>
                  74629 Pfedelbach<br>
                  E-Mail: suedfruechte-hohenlohe@outlook.de
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending data protection inquiry:", error)
    return NextResponse.json({ error: "Fehler beim Senden der Anfrage" }, { status: 500 })
  }
}
