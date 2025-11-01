import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if customer exists in CRM database
    const { data: customer, error } = await supabase
      .from("customers")
      .select("id, user_id, email")
      .eq("email", email.toLowerCase())
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("[v0] Error checking customer:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    const existsInCRM = !!customer
    const hasUserId = !!customer?.user_id

    return NextResponse.json({
      existsInCRM,
      hasUserId,
      customerId: customer?.id || null,
    })
  } catch (error) {
    console.error("[v0] Error in check-customer API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
