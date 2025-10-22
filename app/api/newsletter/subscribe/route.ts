import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { email, source = "news_page" } = await request.json()

    // Validate email
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Ungültige E-Mail-Adresse" }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if email already exists
    const { data: existing, error: checkError } = await supabase
      .from("newsletter_subscribers")
      .select("id, is_active, unsubscribed_at")
      .eq("email", email.toLowerCase())
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Error checking existing subscriber:", checkError)
      return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 })
    }

    // If subscriber exists and is active
    if (existing && existing.is_active) {
      return NextResponse.json(
        { message: "Diese E-Mail-Adresse ist bereits für den Newsletter angemeldet." },
        { status: 200 },
      )
    }

    // If subscriber exists but was unsubscribed, reactivate
    if (existing && !existing.is_active) {
      const { error: updateError } = await supabase
        .from("newsletter_subscribers")
        .update({
          is_active: true,
          subscribed_at: new Date().toISOString(),
          unsubscribed_at: null,
        })
        .eq("id", existing.id)

      if (updateError) {
        console.error("Error reactivating subscriber:", updateError)
        return NextResponse.json({ error: "Fehler beim Reaktivieren des Abonnements" }, { status: 500 })
      }

      return NextResponse.json({ message: "Newsletter erfolgreich wieder abonniert!" }, { status: 200 })
    }

    // Create new subscriber
    const { error: insertError } = await supabase.from("newsletter_subscribers").insert({
      email: email.toLowerCase(),
      source,
      is_active: true,
      subscribed_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error("Error creating subscriber:", insertError)
      return NextResponse.json({ error: "Fehler beim Speichern der Anmeldung" }, { status: 500 })
    }

    return NextResponse.json({ message: "Erfolgreich für den Newsletter angemeldet!" }, { status: 201 })
  } catch (error) {
    console.error("Newsletter subscription error:", error)
    return NextResponse.json({ error: "Ein unerwarteter Fehler ist aufgetreten" }, { status: 500 })
  }
}
