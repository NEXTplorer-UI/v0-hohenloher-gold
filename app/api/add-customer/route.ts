import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  console.log("[v0] ===== ADD CUSTOMER API CALLED =====")

  try {
    const customerData = await request.json()
    console.log("[v0] Customer data received:", customerData)

    if (!customerData.email) {
      console.log("[v0] Validation failed: email missing")
      return NextResponse.json({ error: "Email ist erforderlich" }, { status: 400 })
    }

    console.log("[v0] Creating admin client...")
    const supabase = createAdminClient()

    const insertData = {
      first_name: customerData.first_name || "",
      last_name: customerData.last_name || "",
      email: customerData.email,
      phone: customerData.phone || null,
      street: customerData.street || null,
      house_number: customerData.house_number || null,
      city: customerData.city || null,
      postal_code: customerData.postal_code || null,
      favorite_categories: customerData.favorite_categories || [],
      special_requests: customerData.special_requests || null,
      customer_segment: customerData.customer_segment || "new",
    }

    console.log("[v0] Inserting customer with correct field names:", insertData)

    const { data, error } = await supabase.from("customers").insert([insertData]).select()

    if (error) {
      console.error("[v0] Supabase error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      return NextResponse.json(
        {
          error: `Fehler beim Hinzufügen des Kunden: ${error.message}`,
          details: error.details,
        },
        { status: 500 },
      )
    }

    console.log("[v0] Customer added successfully:", data)
    return NextResponse.json({ success: true, customer: data[0] })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
