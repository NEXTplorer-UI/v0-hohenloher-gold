import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET - Fetch customer preferences
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 })
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("newsletter_subscribed, reminder_notifications, newsletter_confirmed, marketing_consent")
      .eq("user_id", user.id)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: "Kundenprofil nicht gefunden" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: customer,
    })
  } catch (error: any) {
    console.error("[/api/customer/preferences] GET error:", error)
    return NextResponse.json({ error: "Serverfehler beim Laden der Einstellungen" }, { status: 500 })
  }
}

// PATCH - Update customer preferences
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 })
    }

    const body = await request.json()
    const { newsletter_subscribed, reminder_notifications, marketing_consent } = body

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    // Handle newsletter subscription
    if (typeof newsletter_subscribed === "boolean") {
      updateData.newsletter_subscribed = newsletter_subscribed
      if (newsletter_subscribed) {
        updateData.newsletter_subscribed_at = new Date().toISOString()
        updateData.newsletter_unsubscribed_at = null
      } else {
        updateData.newsletter_unsubscribed_at = new Date().toISOString()
      }
    }

    // Handle reminder notifications
    if (typeof reminder_notifications === "boolean") {
      updateData.reminder_notifications = reminder_notifications
    }

    // Handle marketing consent with GDPR tracking
    if (typeof marketing_consent === "boolean") {
      updateData.marketing_consent = marketing_consent
      if (marketing_consent) {
        updateData.marketing_consent_at = new Date().toISOString()
        // Track IP and User Agent for GDPR compliance
        const headers = request.headers
        updateData.marketing_consent_ip = headers.get("x-forwarded-for") || headers.get("x-real-ip")
        updateData.marketing_consent_ua = headers.get("user-agent")
      }
    }

    const { data: updatedCustomer, error: updateError } = await supabase
      .from("customers")
      .update(updateData)
      .eq("user_id", user.id)
      .select("newsletter_subscribed, reminder_notifications, newsletter_confirmed, marketing_consent")
      .single()

    if (updateError) {
      console.error("[/api/customer/preferences] Update error:", updateError)
      return NextResponse.json({ error: "Fehler beim Aktualisieren der Einstellungen" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: updatedCustomer,
      message: "Einstellungen erfolgreich aktualisiert",
    })
  } catch (error: any) {
    console.error("[/api/customer/preferences] PATCH error:", error)
    return NextResponse.json({ error: "Serverfehler beim Aktualisieren der Einstellungen" }, { status: 500 })
  }
}
