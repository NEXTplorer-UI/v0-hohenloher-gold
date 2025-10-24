import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { buildEmail } from "@/lib/email/build"
import { EmailService } from "@/lib/email/email-service"

export const dynamic = "force-dynamic"

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Newsletter subscribe API called")
    const { email, source = "news_page" } = await request.json()
    console.log("[v0] Newsletter subscription request:", { email, source })

    // Validate email
    if (!email || !email.includes("@")) {
      console.log("[v0] Invalid email format:", email)
      return NextResponse.json({ error: "Ungültige E-Mail-Adresse" }, { status: 400 })
    }

    const emailNormalized = normalizeEmail(email)
    console.log("[v0] Normalized email:", emailNormalized)

    const supabase = createAdminClient()

    console.log("[v0] Checking for existing customer...")
    const { data: existing, error: checkError } = await supabase
      .from("customers")
      .select("id, newsletter_subscribed, newsletter_confirmed, newsletter_unsubscribed_at")
      .eq("email_normalized", emailNormalized)
      .maybeSingle()

    if (checkError) {
      console.error("[v0] Error checking existing customer:", checkError)
      return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 })
    }

    console.log("[v0] Existing customer check result:", existing)

    const confirmToken = crypto.randomUUID()

    // Try to get the site URL from multiple sources
    let siteUrl: string
    let urlSource: string

    // 1. Check environment variable (but validate it's a real URL)
    const envUrl = process.env.NEXT_PUBLIC_SITE_URL
    if (envUrl && (envUrl.startsWith("http://") || envUrl.startsWith("https://"))) {
      siteUrl = envUrl
      urlSource = "environment variable"
    } else {
      // 2. Use request headers (works in v0 preview and production)
      const host = request.headers.get("host")
      const protocol = request.headers.get("x-forwarded-proto") || "https"

      if (host) {
        siteUrl = `${protocol}://${host}`
        urlSource = "request headers"
      } else {
        // 3. Fallback to localhost for local development
        siteUrl = "http://localhost:3000"
        urlSource = "localhost fallback"
      }
    }

    const confirmUrl = `${siteUrl}/newsletter/confirm?token=${confirmToken}`

    console.log("[v0] URL source:", urlSource)
    console.log("[v0] Site URL:", siteUrl)
    console.log("[v0] Generated confirmation URL:", confirmUrl)
    console.log("[v0] Confirmation token:", confirmToken)

    if (existing && existing.newsletter_subscribed && existing.newsletter_confirmed) {
      console.log("[v0] Customer already subscribed and confirmed")
      return NextResponse.json(
        { error: "Diese E-Mail-Adresse ist bereits für den Newsletter angemeldet." },
        { status: 400 },
      )
    }

    if (existing) {
      console.log("[v0] Updating existing customer...")
      const { error: updateError } = await supabase
        .from("customers")
        .update({
          newsletter_subscribed: true,
          newsletter_subscribed_at: new Date().toISOString(),
          newsletter_unsubscribed_at: null,
          newsletter_confirmed: false,
          newsletter_confirm_token: confirmToken,
          newsletter_source: source,
        })
        .eq("id", existing.id)

      if (updateError) {
        console.error("[v0] Error updating customer:", updateError)
        return NextResponse.json({ error: "Fehler beim Aktualisieren des Abonnements" }, { status: 500 })
      }
      console.log("[v0] Customer updated successfully")
    } else {
      console.log("[v0] Creating new customer...")
      const { error: insertError } = await supabase.from("customers").insert({
        email,
        email_normalized: emailNormalized,
        newsletter_subscribed: true,
        newsletter_subscribed_at: new Date().toISOString(),
        newsletter_confirmed: false,
        newsletter_confirm_token: confirmToken,
        newsletter_source: source,
      })

      if (insertError) {
        console.error("[v0] Error creating customer:", insertError)
        // Check if it's a duplicate email error
        if (insertError.code === "23505") {
          return NextResponse.json({ error: "Diese E-Mail-Adresse ist bereits registriert." }, { status: 400 })
        }
        return NextResponse.json({ error: "Fehler beim Speichern der Anmeldung" }, { status: 500 })
      }
      console.log("[v0] Customer created successfully")
    }

    try {
      console.log("[v0] Building confirmation email...")
      const { subject, html } = buildEmail("newsletterConfirmation", {
        email,
        confirmUrl,
      })

      console.log("[v0] Email subject:", subject)
      console.log("[v0] Sending confirmation email to:", email)

      await EmailService.sendEmail({
        to: email,
        subject,
        html,
      })

      console.log("[v0] Confirmation email sent successfully")
    } catch (emailError) {
      console.error("[v0] Error sending confirmation email:", emailError)
      // Don't fail the request if email fails, user can try again
    }

    console.log("[v0] Newsletter subscription completed successfully")
    return NextResponse.json(
      {
        message: "Bitte bestätigen Sie Ihre Anmeldung über den Link, den wir Ihnen per E-Mail zugeschickt haben.",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[v0] Newsletter subscription error:", error)
    return NextResponse.json({ error: "Ein unerwarteter Fehler ist aufgetreten" }, { status: 500 })
  }
}
