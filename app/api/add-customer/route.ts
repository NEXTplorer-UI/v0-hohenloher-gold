import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Add customer API called")

    const customerData = await request.json()
    console.log("[v0] Customer data received:", customerData)

    const supabase = createAdminClient()

    const nameParts = customerData.name?.split(" ") || [""]
    const firstName = nameParts[0] || ""
    const lastName = nameParts.slice(1).join(" ") || ""

    const { data, error } = await supabase
      .from("customers")
      .insert([
        {
          first_name: firstName,
          last_name: lastName,
          email: customerData.email,
          phone: customerData.phone || null,
          street: customerData.street || null,
          house_number: customerData.house_number || null,
          city: customerData.city || null,
          postal_code: customerData.postal_code || null,
          tags: customerData.tags || [],
        },
      ])
      .select()

    if (error) {
      console.error("[v0] Error adding customer:", error)
      return NextResponse.json({ error: "Failed to add customer", details: error.message }, { status: 500 })
    }

    console.log("[v0] Customer added successfully:", data)
    return NextResponse.json({ success: true, customer: data[0] })
  } catch (error) {
    console.error("[v0] Add customer API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
