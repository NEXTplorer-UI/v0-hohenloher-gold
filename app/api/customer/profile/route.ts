import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET - Fetch customer profile
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
      .select(
        `
        id,
        user_id,
        email,
        first_name,
        last_name,
        phone,
        street,
        house_number,
        postal_code,
        city,
        country,
        newsletter_subscribed,
        marketing_consent,
        account_status,
        created_at,
        updated_at
      `,
      )
      .eq("user_id", user.id)
      .single()

    if (customerError || !customer) {
      console.error("[/api/customer/profile] Customer not found for user:", user.id)
      return NextResponse.json({ error: "Kundenprofil nicht gefunden" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: customer,
    })
  } catch (error: any) {
    console.error("[/api/customer/profile] GET error:", error)
    return NextResponse.json({ error: "Serverfehler beim Laden des Profils" }, { status: 500 })
  }
}

// PATCH - Update customer profile
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
    const { first_name, last_name, phone, street, house_number, postal_code, city, country } = body

    if (!first_name || !last_name) {
      return NextResponse.json({ error: "Vorname und Nachname sind erforderlich" }, { status: 400 })
    }

    console.log("[v0] [/api/customer/profile] Updating profile for user:", user.id)
    console.log("[v0] [/api/customer/profile] Update data:", {
      first_name,
      last_name,
      phone,
      street,
      house_number,
      postal_code,
      city,
      country,
    })

    const { data: updatedCustomer, error: updateError } = await supabase
      .from("customers")
      .update({
        first_name,
        last_name,
        phone,
        street,
        house_number,
        postal_code,
        city,
        country,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .select()
      .single()

    if (updateError) {
      console.error("[/api/customer/profile] Update error:", updateError)
      return NextResponse.json({ error: "Fehler beim Aktualisieren des Profils" }, { status: 500 })
    }

    console.log("[v0] [/api/customer/profile] Profile updated successfully")

    return NextResponse.json({
      success: true,
      data: updatedCustomer,
      message: "Profil erfolgreich aktualisiert",
    })
  } catch (error: any) {
    console.error("[/api/customer/profile] PATCH error:", error)
    return NextResponse.json({ error: "Serverfehler beim Aktualisieren des Profils" }, { status: 500 })
  }
}
