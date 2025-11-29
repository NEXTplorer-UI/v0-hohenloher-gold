import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, firstName, lastName, phone, street, houseNumber, zip, city, isTest } = body

    console.log("[v0] [create-account] Creating account for:", email)

    // Create Supabase client
    const supabase = await createClient()

    const { data: existingAuthUser } = await supabase.auth.admin.listUsers()
    const authUserExists = existingAuthUser?.users?.find((u) => u.email === email)

    if (authUserExists) {
      const isEmailConfirmed =
        authUserExists.email_confirmed_at !== null && authUserExists.email_confirmed_at !== undefined

      console.log("[v0] [create-account] Auth user exists. Email confirmed:", isEmailConfirmed)

      return NextResponse.json(
        {
          success: false,
          error: isEmailConfirmed
            ? "Ein Konto mit dieser E-Mail-Adresse existiert bereits. Bitte melden Sie sich an oder verwenden Sie die 'Passwort vergessen' Funktion."
            : "Ein Konto mit dieser E-Mail-Adresse existiert bereits, aber die E-Mail wurde noch nicht bestätigt.",
          code: "user_already_exists",
          emailConfirmed: isEmailConfirmed,
          email: email,
        },
        { status: 400 },
      )
    }

    // Check if customer record exists
    const { data: existingCustomer, error: customerCheckError } = await supabase
      .from("customers")
      .select("email, user_id")
      .eq("email", email)
      .maybeSingle()

    if (customerCheckError) {
      console.error("[v0] [create-account] Error checking existing customer:", customerCheckError)
    }

    const host = request.headers.get("host") || ""
    const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1")

    let redirectUrl: string
    if (isLocalhost) {
      redirectUrl = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `http://${host}`
    } else {
      redirectUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${host}`
    }

    console.log("[v0] [create-account] Redirect URL:", redirectUrl)

    // Create auth account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${redirectUrl}/customer/account-confirmed`,
        data: {
          first_name: firstName,
          last_name: lastName,
          phone,
        },
      },
    })

    if (authError) {
      console.error("[v0] [create-account] Auth error:", authError)

      let userMessage = "Ein Fehler ist aufgetreten."

      if (authError.message.includes("already registered")) {
        userMessage = "Diese E-Mail-Adresse ist bereits registriert."
      } else if (authError.message.includes("password")) {
        userMessage = "Das Passwort muss mindestens 8 Zeichen lang sein und Buchstaben sowie Zahlen enthalten."
      } else if (authError.message.includes("email")) {
        userMessage = "Bitte geben Sie eine gültige E-Mail-Adresse ein."
      } else if (authError.message.includes("rate limit") || authError.status === 429) {
        userMessage = "Zu viele Versuche. Bitte warten Sie 60 Sekunden und versuchen Sie es erneut."
      }

      return NextResponse.json(
        {
          success: false,
          error: userMessage,
          code: authError.code,
          technicalError: authError.message,
        },
        { status: 400 },
      )
    }

    // This check was wrong - identities.length relates to OAuth providers, not email confirmation

    console.log("[v0] [create-account] Account created successfully!")

    // Link user to customer record if exists
    if (authData.user && existingCustomer) {
      try {
        const { error: linkError } = await supabase
          .from("customers")
          .update({ user_id: authData.user.id })
          .eq("email", email)
          .is("user_id", null)

        if (linkError) {
          console.error("[v0] [create-account] Error linking customer:", linkError)
        } else {
          console.log("[v0] [create-account] Customer linked to user account")
        }
      } catch (linkErr) {
        console.error("[v0] [create-account] Exception linking customer:", linkErr)
      }
    }

    return NextResponse.json({
      success: true,
      user: authData.user,
      message: "Konto erfolgreich erstellt. Bitte überprüfen Sie Ihre E-Mails zur Bestätigung.",
    })
  } catch (error) {
    console.error("[v0] [create-account] Unexpected error:", error)
    return NextResponse.json(
      { success: false, error: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut." },
      { status: 500 },
    )
  }
}
