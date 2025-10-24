import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: "Token fehlt" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: customer, error: findError } = await supabase
      .from("customers")
      .select("id, email, newsletter_confirmed")
      .eq("newsletter_confirm_token", token)
      .maybeSingle()

    if (findError) {
      console.error("Error finding customer:", findError)
      return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 })
    }

    if (!customer) {
      return NextResponse.json({ error: "Ungültiger oder abgelaufener Bestätigungslink" }, { status: 400 })
    }

    if (customer.newsletter_confirmed) {
      return NextResponse.json(
        {
          success: true,
          message: "Ihre Newsletter-Anmeldung wurde bereits bestätigt!",
          email: customer.email,
        },
        { status: 200 },
      )
    }

    const { error: updateError } = await supabase
      .from("customers")
      .update({
        newsletter_confirmed: true,
        newsletter_confirm_token: null, // Clear token after use
      })
      .eq("id", customer.id)

    if (updateError) {
      console.error("Error confirming subscription:", updateError)
      return NextResponse.json({ error: "Fehler beim Bestätigen der Anmeldung" }, { status: 500 })
    }

    console.log("[v0] Newsletter subscription confirmed for:", customer.email)

    return NextResponse.json({
      success: true,
      message: "Ihre Newsletter-Anmeldung wurde erfolgreich bestätigt!",
      email: customer.email,
    })
  } catch (error) {
    console.error("Newsletter confirm API error:", error)
    return NextResponse.json({ error: "Ein unerwarteter Fehler ist aufgetreten" }, { status: 500 })
  }
}
