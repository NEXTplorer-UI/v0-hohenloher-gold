import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    const currentLocationId = searchParams.get("currentLocationId")

    if (!email) {
      return NextResponse.json({ error: "Email ist erforderlich" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, default_pickup_location_id, email")
      .eq("email_normalized", email.toLowerCase().trim())
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ hasDefault: false, isDifferent: false }, { status: 200 })
    }

    if (!customer.default_pickup_location_id) {
      return NextResponse.json({ hasDefault: false, isDifferent: false }, { status: 200 })
    }

    const { data: defaultLocation, error: locationError } = await supabase
      .from("pickup_locations")
      .select("id, name, address, city")
      .eq("id", customer.default_pickup_location_id)
      .single()

    if (locationError || !defaultLocation) {
      return NextResponse.json({ hasDefault: false, isDifferent: false }, { status: 200 })
    }

    const isDifferent = currentLocationId && currentLocationId !== customer.default_pickup_location_id

    return NextResponse.json({
      hasDefault: true,
      isDifferent,
      defaultLocation: {
        id: defaultLocation.id,
        name: defaultLocation.name,
        address: defaultLocation.address,
        city: defaultLocation.city,
        displayName: `${defaultLocation.name} - ${defaultLocation.city}`,
      },
      customerId: customer.id,
    })
  } catch (error) {
    console.error("[/api/customers/check-pickup-location] Error:", error)
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 })
  }
}
