import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { buildEmail } from "@/lib/email/build"
import { EmailService } from "@/lib/email/email-service"

export const dynamic = "force-dynamic"

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

function safeGetOriginFromRequestUrl(req: NextRequest): string | null {
  try {
    const u = new URL(req.url)
    return u.origin
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Preferences update API called (newsletter proxy)")
    const { email, source = "news_page", siteUrl: clientSiteUrl } = await request.json()
    console.log("[v0] Newsletter subscription request:", { email, source, clientSiteUrl })

    // Validate email
    if (!email || !email.includes("@")) {
      console.log("[v0] Invalid email format:", email)
      return NextResponse.json({ error: "Ungültige E-Mail-Adresse", errorCode: "INVALID_EMAIL" }, { status: 400 })
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
      console.error("[v0] Database check error details:", {
        code: checkError.code,
        message: checkError.message,
        details: checkError.details,
        hint: checkError.hint,
      })
      return NextResponse.json(
        { error: "Datenbankfehler beim Prüfen der E-Mail", errorCode: "DB_CHECK_ERROR" },
        { status: 500 },
      )
    }

    console.log("[v0] Existing customer check result:", existing)

    const confirmToken = crypto.randomUUID()

    let siteUrl = "http://localhost:3000" // Default fallback
    let urlSource = "localhost fallback"

    // 1. Client-provided URL (most reliable in v0 preview)
    if (clientSiteUrl && typeof clientSiteUrl === "string" && clientSiteUrl.startsWith("http")) {
      siteUrl = clientSiteUrl
      urlSource = "client-provided"
    }
    // 2. Extract from request.url (independent of headers)
    else {
      const reqOrigin = safeGetOriginFromRequestUrl(request)
      if (reqOrigin && reqOrigin.startsWith("http")) {
        siteUrl = reqOrigin
        urlSource = "request.url"
      }
      // 3. Environment variable (if valid URL)
      else if (process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http")) {
        siteUrl = process.env.NEXT_PUBLIC_SITE_URL
        urlSource = "environment variable"
      }
      // 4. Construct from headers (production fallback)
      else {
        const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
        const proto = request.headers.get("x-forwarded-proto") || "https"
        if (host) {
          siteUrl = `${proto}://${host}`
          urlSource = "host headers"
        }
      }
    }

    const confirmUrl = `${siteUrl}/newsletter/confirm?token=${confirmToken}`

    console.log("[v0] URL resolution:", { urlSource, siteUrl, confirmUrl })

    if (existing && existing.newsletter_subscribed && existing.newsletter_confirmed) {
      console.log("[v0] Customer already subscribed and confirmed")
      return NextResponse.json(
        { error: "Diese E-Mail-Adresse ist bereits für den Newsletter angemeldet.", errorCode: "ALREADY_SUBSCRIBED" },
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
        console.error("[v0] Database update error details:", {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
        })
        return NextResponse.json(
          { error: "Fehler beim Aktualisieren des Abonnements", errorCode: "DB_UPDATE_ERROR" },
          { status: 500 },
        )
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
        console.error("[v0] Database insert error details:", {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
        })

        // Handle specific database errors
        if (insertError.code === "23505") {
          // Unique constraint violation
          console.error("[v0] Duplicate email detected (unique constraint violation)")
          return NextResponse.json(
            { error: "Diese E-Mail-Adresse ist bereits registriert.", errorCode: "DUPLICATE_EMAIL" },
            { status: 400 },
          )
        }

        if (insertError.code === "23502") {
          // Not null constraint violation
          console.error("[v0] Missing required field (not null constraint violation)")
          return NextResponse.json({ error: "Fehlende Pflichtfelder", errorCode: "MISSING_FIELDS" }, { status: 400 })
        }

        // Generic database error
        return NextResponse.json(
          {
            error: "Fehler beim Speichern der Anmeldung. Bitte versuchen Sie es später erneut.",
            errorCode: "DB_INSERT_ERROR",
            dbErrorCode: insertError.code,
          },
          { status: 500 },
        )
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
      console.error("[v0] Email error details:", {
        error: emailError,
        message: emailError instanceof Error ? emailError.message : "Unknown error",
      })
      // Don't fail the request if email fails - user is still subscribed
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
    console.error("[v0] Unexpected error details:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { error: "Ein unerwarteter Fehler ist aufgetreten", errorCode: "UNEXPECTED_ERROR" },
      { status: 500 },
    )
  }
}
