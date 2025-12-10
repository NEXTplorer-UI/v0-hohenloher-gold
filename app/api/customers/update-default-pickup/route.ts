import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { email, pickupLocationId } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email ist erforderlich" }, { status: 400 })
    }

    const supabase = await createClient()

    const { error: updateError } = await supabase
      .from("customers")
      .update({
        default_pickup_location_id: pickupLocationId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("email_normalized", email.toLowerCase().trim())

    if (updateError) {
      console.error("[/api/customers/update-default-pickup] Error:", updateError)
      return NextResponse.json({ error: "Fehler beim Aktualisieren" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[/api/customers/update-default-pickup] Error:", error)
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 })
  }
}
