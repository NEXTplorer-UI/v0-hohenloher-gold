import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Resend confirmation email using Supabase
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email,
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${process.env.NEXT_PUBLIC_SITE_URL}/customer/dashboard`,
      },
    })

    if (error) {
      console.error("[v0] Error resending confirmation:", error)

      // Handle specific error cases
      if (error.message.includes("already confirmed")) {
        return NextResponse.json(
          { error: "Diese E-Mail-Adresse ist bereits bestätigt. Sie können sich jetzt anmelden." },
          { status: 400 },
        )
      }

      if (error.message.includes("not found")) {
        return NextResponse.json({ error: "Kein Konto mit dieser E-Mail-Adresse gefunden." }, { status: 404 })
      }

      return NextResponse.json({ error: "Fehler beim Versenden der Bestätigungs-E-Mail" }, { status: 500 })
    }

    console.log("[v0] Confirmation email resent successfully to:", email)

    return NextResponse.json({
      success: true,
      message: "Bestätigungs-E-Mail wurde erneut versendet. Bitte überprüfen Sie Ihr Postfach.",
    })
  } catch (error) {
    console.error("[v0] Error in resend-confirmation API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
