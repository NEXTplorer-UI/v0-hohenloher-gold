import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "E-Mail-Adresse fehlt" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const emailNormalized = email.toLowerCase().trim()

    const { data: customer, error: findError } = await supabase
      .from("customers")
      .select("id, email, newsletter_subscribed")
      .eq("email_normalized", emailNormalized)
      .maybeSingle()

    if (findError) {
      console.error("Error finding customer:", findError)
      return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 })
    }

    if (!customer) {
      return NextResponse.json({ error: "E-Mail-Adresse nicht gefunden" }, { status: 404 })
    }

    if (!customer.newsletter_subscribed) {
      return NextResponse.json(
        {
          success: true,
          message: "Sie sind bereits vom Newsletter abgemeldet.",
          email: customer.email,
        },
        { status: 200 },
      )
    }

    const { error: updateError } = await supabase
      .from("customers")
      .update({
        newsletter_subscribed: false,
        newsletter_unsubscribed_at: new Date().toISOString(),
        newsletter_confirmed: false,
      })
      .eq("id", customer.id)

    if (updateError) {
      console.error("Error unsubscribing customer:", updateError)
      return NextResponse.json({ error: "Fehler beim Abmelden" }, { status: 500 })
    }

    console.log("[v0] Newsletter unsubscribed:", customer.email)

    return NextResponse.json({
      success: true,
      message: "Sie wurden erfolgreich vom Newsletter abgemeldet.",
      email: customer.email,
    })
  } catch (error) {
    console.error("Newsletter unsubscribe API error:", error)
    return NextResponse.json({ error: "Ein unerwarteter Fehler ist aufgetreten" }, { status: 500 })
  }
}
