import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const checkoutId = searchParams.get("checkoutId")

    if (!checkoutId) {
      return NextResponse.json({ error: "Missing checkoutId" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get checkout details
    const { data: checkout, error: checkoutError } = await supabase
      .from("checkouts")
      .select("*")
      .eq("id", checkoutId)
      .single()

    if (checkoutError || !checkout) {
      return NextResponse.json({ error: "Checkout not found" }, { status: 404 })
    }

    // Check if order has been created
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("checkout_id", checkoutId)
      .single()

    return NextResponse.json({
      checkout,
      order: order || null,
      status: checkout.status,
      paymentStatus: checkout.payment_status,
    })
  } catch (error) {
    console.error("[v0] [Checkout Status] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
