import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "E-Mail-Adresse ist erforderlich" }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {
              // The "setAll" method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      },
    )

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/reset-password`,
    })

    if (error) {
      console.error("Password reset error:", error)
      return NextResponse.json({ error: "Fehler beim Senden der Reset-E-Mail" }, { status: 500 })
    }

    return NextResponse.json({
      message: "Reset-E-Mail wurde erfolgreich gesendet",
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Interner Server-Fehler" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { password, accessToken } = await request.json()

    if (!password || !accessToken) {
      return NextResponse.json({ error: "Passwort und Access-Token sind erforderlich" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Passwort muss mindestens 8 Zeichen lang sein" }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {
              // The "setAll" method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      },
    )

    // Set the session with the access token
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: "", // Will be handled by Supabase
    })

    if (sessionError) {
      return NextResponse.json({ error: "Ungültiger oder abgelaufener Token" }, { status: 401 })
    }

    // Update the user's password
    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    })

    if (updateError) {
      console.error("Password update error:", updateError)
      return NextResponse.json({ error: "Fehler beim Aktualisieren des Passworts" }, { status: 500 })
    }

    return NextResponse.json({
      message: "Passwort wurde erfolgreich aktualisiert",
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Interner Server-Fehler" }, { status: 500 })
  }
}
