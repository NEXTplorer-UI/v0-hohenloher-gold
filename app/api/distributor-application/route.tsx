import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { buildEmail } from "@/lib/email/build"
import { EmailService } from "@/lib/email/email-service"
import { createClient } from "@/lib/supabase/server"

const distributorApplicationSchema = z.object({
  firstName: z.string().min(2, "Vorname zu kurz"),
  lastName: z.string().min(2, "Nachname zu kurz"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  phone: z.string().min(10, "Telefonnummer ungültig"),
  plz: z.string().regex(/^\d{5}$/, "PLZ muss 5 Ziffern haben"),
  city: z.string().min(2, "Ort zu kurz"),
  businessType: z.string().optional(),
  experience: z.string().optional(),
  motivation: z.string().optional(),
  availability: z.string().optional(),
  personalMessage: z.string().optional(),
  newsletterSignup: z.boolean().optional(),
})

const ENABLE_DB_LOG = process.env.ENABLE_DISTRIBUTOR_DB_LOG === "true"
const ADMIN_EMAIL = process.env.DISTRIBUTOR_ADMIN_EMAIL || "kontakt@suedfruechte-hohenlohe.de"

function adminHtml(data: z.infer<typeof distributorApplicationSchema>) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          h2 { color: #d4af37; }
          .section { margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px; }
          .label { font-weight: bold; color: #666; }
          .value { margin-left: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>🎉 Neue Verteiler-Bewerbung!</h2>
          
          <div class="section">
            <h3>Persönliche Daten</h3>
            <p><span class="label">Name:</span><span class="value">${data.firstName} ${data.lastName}</span></p>
            <p><span class="label">E-Mail:</span><span class="value">${data.email}</span></p>
            <p><span class="label">Telefon:</span><span class="value">${data.phone}</span></p>
            <p><span class="label">PLZ/Ort:</span><span class="value">${data.plz} ${data.city}</span></p>
          </div>

          <div class="section">
            <h3>Geschäftsinformationen</h3>
            <p><span class="label">Art des Geschäfts:</span><span class="value">${data.businessType || "Nicht angegeben"}</span></p>
            <p><span class="label">Erfahrung:</span><span class="value">${data.experience || "Nicht angegeben"}</span></p>
            <p><span class="label">Motivation:</span><span class="value">${data.motivation || "Nicht angegeben"}</span></p>
            <p><span class="label">Verfügbarkeit:</span><span class="value">${data.availability || "Nicht angegeben"}</span></p>
          </div>

          ${
            data.personalMessage
              ? `
          <div class="section">
            <h3>Persönliche Nachricht</h3>
            <p>${data.personalMessage}</p>
          </div>
          `
              : ""
          }

          <div class="section">
            <p><span class="label">Newsletter:</span><span class="value">${data.newsletterSignup ? "Ja" : "Nein"}</span></p>
            <p><span class="label">Eingegangen am:</span><span class="value">${new Date().toLocaleString("de-DE")}</span></p>
          </div>
        </div>
      </body>
    </html>
  `
}

function applicantHtml(data: z.infer<typeof distributorApplicationSchema>) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .logo { text-align: center; margin-bottom: 30px; }
          .logo img { max-width: 200px; height: auto; }
          h2 { color: #d4af37; }
          .highlight { background: #fef9e7; padding: 15px; border-left: 4px solid #d4af37; border-radius: 8px; margin: 20px 0; }
          .data-section { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .data-row { margin: 10px 0; }
          .label { font-weight: bold; color: #666; display: inline-block; min-width: 150px; }
          .value { color: #333; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #f3f4f6; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <img src="${process.env.NEXT_PUBLIC_SITE_URL || "https://hohenloher-gold.de"}/hohenloher-gold-logo.png" alt="Hohenloher Gold Logo" />
          </div>
          
          <h2>Vielen Dank für Ihre Bewerbung! 🍊</h2>
          
          <p>Hallo ${data.firstName},</p>
          
          <p>schön, dass Sie Teil unserer Hohenloher Gold Familie werden möchten!</p>
          
          <p>Wir haben Ihre Bewerbung als Verteiler erhalten und freuen uns sehr über Ihr Interesse. 
          Unser Team wird sich Ihre Angaben in Ruhe anschauen und sich in den nächsten Tagen bei Ihnen melden.</p>
          
          <div class="highlight">
            <strong>📋 Ihre Bewerbung im Überblick:</strong>
          </div>
          
          <div class="data-section">
            <h3 style="color: #d4af37; margin-top: 0;">Persönliche Daten</h3>
            <div class="data-row">
              <span class="label">Name:</span>
              <span class="value">${data.firstName} ${data.lastName}</span>
            </div>
            <div class="data-row">
              <span class="label">E-Mail:</span>
              <span class="value">${data.email}</span>
            </div>
            <div class="data-row">
              <span class="label">Telefon:</span>
              <span class="value">${data.phone}</span>
            </div>
            <div class="data-row">
              <span class="label">PLZ / Ort:</span>
              <span class="value">${data.plz} ${data.city}</span>
            </div>
          </div>
          
          <div class="data-section">
            <h3 style="color: #d4af37; margin-top: 0;">Geschäftsinformationen</h3>
            <div class="data-row">
              <span class="label">Art des Geschäfts:</span>
              <span class="value">${data.businessType || "Nicht angegeben"}</span>
            </div>
            <div class="data-row">
              <span class="label">Erfahrung:</span>
              <span class="value">${data.experience || "Nicht angegeben"}</span>
            </div>
            <div class="data-row">
              <span class="label">Motivation:</span>
              <span class="value">${data.motivation || "Nicht angegeben"}</span>
            </div>
            <div class="data-row">
              <span class="label">Verfügbarkeit:</span>
              <span class="value">${data.availability || "Nicht angegeben"}</span>
            </div>
            ${
              data.personalMessage
                ? `
            <div class="data-row">
              <span class="label">Ihre Nachricht:</span>
              <span class="value">${data.personalMessage}</span>
            </div>
            `
                : ""
            }
            <div class="data-row">
              <span class="label">Newsletter:</span>
              <span class="value">${data.newsletterSignup ? "Ja, ich möchte den Newsletter erhalten" : "Nein"}</span>
            </div>
          </div>
          
          <p>Falls Sie noch Fragen haben oder etwas ändern möchten, können Sie uns jederzeit unter <strong>kontakt@suedfruechte-hohenlohe.de</strong> erreichen.</p>
          
          <p>Herzliche Grüße aus Hohenlohe,<br>
          Ihr Hohenloher Gold Team 🌻</p>
          
          <div class="footer">
            <p><strong>Hohenloher Gold</strong><br>
            kontakt@suedfruechte-hohenlohe.de</p>
          </div>
        </div>
      </body>
    </html>
  `
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const parsed = distributorApplicationSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validierung fehlgeschlagen",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      )
    }

    const data = parsed.data

    console.log("[v0] [distributor-application] Sending emails to:", {
      admin: ADMIN_EMAIL,
      applicant: data.email,
    })

    const adminEmail = buildEmail("distributorApplication", {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      plz: data.plz,
      city: data.city,
      businessType: data.businessType || "Nicht angegeben",
      experience: data.experience,
      motivation: data.motivation,
      availability: data.availability,
      personalMessage: data.personalMessage,
      newsletterSignup: data.newsletterSignup,
    })

    try {
      await EmailService.sendEmail({
        to: ADMIN_EMAIL,
        subject: `Neue Verteiler-Bewerbung: ${data.firstName} ${data.lastName} (${data.plz} ${data.city})`,
        html: adminEmail.html,
      })
      console.log("[v0] [distributor-application] Admin email sent successfully")
    } catch (adminEmailError) {
      console.error("[v0] [distributor-application] Failed to send admin email:", adminEmailError)
      // Continue to send applicant email even if admin email fails
    }

    const applicantEmail = buildEmail("distributorApplication", {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      plz: data.plz,
      city: data.city,
      businessType: data.businessType || "Nicht angegeben",
      experience: data.experience,
      motivation: data.motivation,
      availability: data.availability,
      personalMessage: data.personalMessage,
      newsletterSignup: data.newsletterSignup,
    })

    try {
      await EmailService.sendEmail({
        to: data.email,
        subject: applicantEmail.subject,
        html: applicantEmail.html,
      })
      console.log("[v0] [distributor-application] Applicant email sent successfully")
    } catch (applicantEmailError) {
      console.error("[v0] [distributor-application] Failed to send applicant email:", applicantEmailError)
      // Don't fail the entire request if applicant email fails
    }

    if (ENABLE_DB_LOG) {
      try {
        const supabase = await createClient()
        const { error } = await supabase.from("distributor_applications").insert({
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          phone: data.phone,
          postal_code: data.plz,
          city: data.city,
          business_type: data.businessType || null,
          motivation: data.motivation || null,
          availability: data.availability || null,
          personal_message: data.personalMessage || null,
          newsletter_signup: data.newsletterSignup || false,
          status: "pending",
        })

        if (error) {
          console.warn("[distributor-application] DB log failed:", error.message)
        }
      } catch (dbError) {
        console.warn("[distributor-application] DB log error:", dbError)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Vielen Dank! Wir haben Ihre Bewerbung erhalten und melden uns bald bei Ihnen.",
    })
  } catch (error) {
    console.error("[distributor-application] Error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.",
      },
      { status: 500 },
    )
  }
}
