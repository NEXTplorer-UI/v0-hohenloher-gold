import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { email, userId } = await request.json()

    if (!email || !userId) {
      return NextResponse.json({ error: "Email and userId are required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("customers")
      .update({ user_id: userId })
      .eq("email", email.toLowerCase())
      .select()
      .single()

    if (error) {
      console.error("[v0] Error linking user to customer:", error)
      return NextResponse.json({ error: "Failed to link user" }, { status: 500 })
    }

    console.log("[v0] Successfully linked user to customer:", data)

    const { error: ordersError } = await supabase
      .from("orders")
      .update({ user_id: userId })
      .eq("customer_id", data.id)
      .is("user_id", null)

    if (ordersError) {
      console.error("[v0] Error linking orders to user:", ordersError)
      // Don't fail the request, just log the error
    } else {
      console.log("[v0] Successfully linked existing orders to user")
    }

    return NextResponse.json({ success: true, customer: data })
  } catch (error) {
    console.error("[v0] Error in link-user API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
