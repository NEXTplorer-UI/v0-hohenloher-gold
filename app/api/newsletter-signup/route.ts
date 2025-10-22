import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

interface NewsletterSignupRequest {
  email: string
  source?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: NewsletterSignupRequest = await request.json()
    const { email, source = "website" } = body

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email address is required" }, { status: 400 })
    }

    console.log("[v0] Newsletter signup request for:", email, "from:", source)

    const supabase = createClient()

    const consent_ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "unknown"
    const user_agent = request.headers.get("user-agent") || "unknown"

    // Check if email already exists in newsletter subscribers
    const { data: existingSubscriber, error: checkError } = await supabase
      .from("newsletter_subscribers")
      .select("id, email, confirmed_at")
      .eq("email_normalized", email.toLowerCase())
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      console.error("[v0] Error checking existing subscriber:", checkError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (existingSubscriber) {
      if (existingSubscriber.confirmed_at) {
        console.log("[v0] Email already confirmed:", email)
        return NextResponse.json({
          message: "Sie sind bereits für unseren Newsletter angemeldet.",
          alreadySubscribed: true,
        })
      } else {
        console.log("[v0] Email pending confirmation:", email)
        return NextResponse.json({
          message: "Bitte bestätigen Sie Ihre E-Mail-Adresse über den Link, den wir Ihnen gesendet haben.",
          pendingConfirmation: true,
        })
      }
    }

    const { data: newSubscriber, error: insertError } = await supabase
      .from("newsletter_subscribers")
      .insert({
        email: email,
        source,
        consent_ip,
        user_agent,
        subscribed_at: new Date().toISOString(),
        is_active: false, // Will be activated after confirmation
      })
      .select("confirm_token")
      .single()

    if (insertError) {
      console.error("[v0] Error inserting newsletter subscriber:", insertError)
      return NextResponse.json({ error: "Failed to subscribe to newsletter" }, { status: 500 })
    }

    console.log("[v0] Newsletter subscription pending confirmation for:", email)

    // const confirmUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/newsletter/confirm?token=${newSubscriber.confirm_token}`
    // await EmailService.sendEmail({
    //   to: email,
    //   subject: "Bitte bestätigen Sie Ihre Newsletter-Anmeldung",
    //   html: EmailTemplates.newsletterConfirmation(email, confirmUrl)
    // })

    return NextResponse.json({
      message: "Vielen Dank! Bitte bestätigen Sie Ihre E-Mail-Adresse über den Link, den wir Ihnen gesendet haben.",
      success: true,
      requiresConfirmation: true,
    })
  } catch (error) {
    console.error("[v0] Newsletter signup API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
