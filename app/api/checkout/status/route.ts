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

    const { data: orderByRef, error: orderRefError } = await supabase
      .from("orders")
      .select("*")
      .contains("attributes", { sumup_checkout_id: checkoutId })
      .maybeSingle()

    if (orderByRef) {
      console.log("[v0] [Checkout Status] Found order by SumUp checkout reference:", orderByRef.order_number)
      return NextResponse.json({
        order: orderByRef,
        status: "completed",
        paymentStatus: orderByRef.payment_status,
      })
    }

    const { data: checkout, error: checkoutError } = await supabase
      .from("checkouts")
      .select("*")
      .eq("id", checkoutId)
      .maybeSingle()

    if (!checkout) {
      console.log("[v0] [Checkout Status] No checkout or order found for ID:", checkoutId)
      return NextResponse.json({ error: "Checkout not found" }, { status: 404 })
    }

    // Check if order has been created from checkout table
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("checkout_id", checkoutId)
      .maybeSingle()

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
