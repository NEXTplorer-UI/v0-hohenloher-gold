import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: customer, error } = await supabase
      .from("customers")
      .select("id, email, phone, first_name, last_name, street, house_number, postal_code, city, country")
      .eq("id", id)
      .single()

    if (error) {
      console.error("[v0] [/api/crm/customers/[id]] Database error:", error)
      return NextResponse.json({ error: "Customer not found", details: error.message }, { status: 404 })
    }

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    return NextResponse.json(customer)
  } catch (e) {
    console.error("[v0] [/api/crm/customers/[id]] Unexpected error:", e)
    return NextResponse.json(
      {
        error: "Unexpected error",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    )
  }
}
