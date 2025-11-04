import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendEmail } from "@/lib/email/email-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, subject, email, message, affectedPage, errorText } = body

    // Validation
    if (!type || !subject || !message) {
      return NextResponse.json({ error: "Typ, Betreff und Nachricht sind erforderlich" }, { status: 400 })
    }

    if (type !== "feedback" && type !== "bug") {
      return NextResponse.json({ error: "Ungültiger Feedback-Typ" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user if logged in
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Get customer_id if user exists
    let customerId = null
    if (user) {
      const { data: customer } = await supabase.from("customers").select("id").eq("user_id", user.id).single()

      customerId = customer?.id || null
    }

    // Insert feedback into database
    const { data: feedback, error: dbError } = await supabase
      .from("customer_feedback")
      .insert({
        type,
        subject,
        email: email || user?.email || null,
        message,
        affected_page: affectedPage || null,
        error_text: errorText || null,
        customer_id: customerId,
        user_id: user?.id || null,
        status: "new",
      })
      .select()
      .single()

    if (dbError) {
      console.error("[v0] Error inserting feedback:", dbError)
      return NextResponse.json({ error: "Fehler beim Speichern des Feedbacks" }, { status: 500 })
    }

    // Send email notification to admin
    const emailData = {
      to: "kontakt@suedfruechte-hohenlohe.de",
      subject: `${type === "bug" ? "🐛 Fehlermeldung" : "💬 Feedback"}: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${type === "bug" ? "#dc2626" : "#a16207"}; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">${type === "bug" ? "🐛 Fehlermeldung" : "💬 Kundenfeedback"}</h1>
            <p style="margin: 5px 0 0 0;">Neue ${type === "bug" ? "Fehlermeldung" : "Rückmeldung"} erhalten</p>
          </div>
          
          <div style="padding: 20px; background: #f9f9f9;">
            <h2>${subject}</h2>
            
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
              ${email ? `<p><strong>E-Mail:</strong> ${email}</p>` : ""}
              ${user ? `<p><strong>Benutzer-ID:</strong> ${user.id}</p>` : "<p><strong>Status:</strong> Anonym</p>"}
              <p><strong>Typ:</strong> ${type === "bug" ? "Fehlermeldung" : "Feedback"}</p>
              ${affectedPage ? `<p><strong>Betroffene Seite:</strong> ${affectedPage}</p>` : ""}
            </div>
            
            <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Nachricht:</h3>
              <p style="white-space: pre-wrap;">${message}</p>
            </div>
            
            ${
              errorText
                ? `
              <div style="background: #fee; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
                <h3 style="margin-top: 0; color: #dc2626;">Fehlertext:</h3>
                <pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px;">${errorText}</pre>
              </div>
            `
                : ""
            }
            
            <p style="font-size: 12px; color: #666;">
              Feedback-ID: ${feedback.id}<br>
              Erstellt am: ${new Date().toLocaleString("de-DE")}
            </p>
          </div>
          
          <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p>Südfrüchte Hohenlohe | Weststraße 28 | 74629 Pfedelbach</p>
          </div>
        </div>
      `,
    }

    await sendEmail(emailData)

    return NextResponse.json({
      success: true,
      feedbackId: feedback.id,
    })
  } catch (error) {
    console.error("[v0] Error processing feedback:", error)
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 })
  }
}
