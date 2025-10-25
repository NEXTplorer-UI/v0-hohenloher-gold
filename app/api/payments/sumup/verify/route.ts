import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SUMUP_API_BASE = "https://api.sumup.com/v0.1"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const checkoutId = searchParams.get("checkoutId")

    console.log("[v0] [SumUp Verify] Verifying checkout:", checkoutId)

    if (!checkoutId) {
      return NextResponse.json({ error: "Missing checkoutId parameter" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: checkout, error: checkoutError } = await supabase
      .from("checkouts")
      .select("*")
      .eq("id", checkoutId)
      .single()

    if (checkoutError || !checkout) {
      console.error("[v0] [SumUp Verify] Checkout not found:", checkoutError)
      return NextResponse.json({ error: "Checkout not found" }, { status: 404 })
    }

    console.log("[v0] [SumUp Verify] Checkout status:", checkout.status)

    // If already completed, return the order info
    if (checkout.status === "paid" && checkout.completed_order_id) {
      const { data: order } = await supabase
        .from("orders")
        .select("order_number")
        .eq("id", checkout.completed_order_id)
        .single()

      return NextResponse.json({
        status: "PAID",
        orderNumber: order?.order_number,
        amount: checkout.total_amount,
        currency: "EUR",
      })
    }

    const accessToken = process.env.SUMUP_ACCESS_TOKEN
    if (!accessToken) {
      console.error("[v0] [SumUp Verify] SUMUP_ACCESS_TOKEN not configured")
      return NextResponse.json({ error: "SumUp payment is not configured" }, { status: 500 })
    }

    if (!checkout.sumup_checkout_id) {
      console.error("[v0] [SumUp Verify] No SumUp checkout ID")
      return NextResponse.json({ error: "No SumUp checkout ID" }, { status: 400 })
    }

    const response = await fetch(`${SUMUP_API_BASE}/checkouts/${checkout.sumup_checkout_id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const sumupData = await response.json()

    if (!response.ok) {
      console.error("[v0] [SumUp Verify] SumUp API error:", sumupData)

      await supabase.from("checkouts").update({ status: "failed" }).eq("id", checkoutId)

      return NextResponse.json({ error: sumupData.message || "Failed to verify checkout" }, { status: response.status })
    }

    console.log("[v0] [SumUp Verify] SumUp status:", sumupData.status)

    if (sumupData.status === "PAID" && checkout.status !== "paid") {
      console.log("[v0] [SumUp Verify] Payment successful, promoting to order")

      // Update checkout with transaction ID
      await supabase
        .from("checkouts")
        .update({
          sumup_transaction_id: sumupData.transaction_id,
          status: "paid",
        })
        .eq("id", checkoutId)

      // Create order via existing orders API
      const orderPayload = {
        customerInfo: {
          email: checkout.email,
          firstName: checkout.first_name,
          lastName: checkout.last_name,
          phone: checkout.phone,
        },
        deliveryInfo: {
          date: checkout.delivery_date,
          timeSlot: checkout.delivery_time_slot,
          address: checkout.delivery_address,
        },
        items: checkout.cart_items,
        paymentMethod: "sumup",
        notes: checkout.notes,
        sumupCheckoutId: checkout.sumup_checkout_id,
        sumupTransactionId: sumupData.transaction_id,
      }

      console.log("[v0] [SumUp Verify] Creating order with payload")

      const orderResponse = await fetch(`${request.nextUrl.origin}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderPayload),
      })

      const orderData = await orderResponse.json()

      if (!orderResponse.ok) {
        console.error("[v0] [SumUp Verify] Failed to create order:", orderData)
        return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
      }

      console.log("[v0] [SumUp Verify] Order created:", orderData.orderNumber)

      // Link order to checkout
      await supabase.from("checkouts").update({ completed_order_id: orderData.orderId }).eq("id", checkoutId)

      return NextResponse.json({
        status: "PAID",
        orderNumber: orderData.orderNumber,
        amount: sumupData.amount,
        currency: sumupData.currency,
        transactionId: sumupData.transaction_id,
      })
    }

    if (sumupData.status === "PENDING") {
      await supabase.from("checkouts").update({ status: "pending" }).eq("id", checkoutId)
    } else if (sumupData.status === "FAILED") {
      await supabase.from("checkouts").update({ status: "failed" }).eq("id", checkoutId)
    }

    return NextResponse.json({
      status: sumupData.status,
      orderNumber: checkout.completed_order_id ? sumupData.checkout_reference : null,
      amount: sumupData.amount,
      currency: sumupData.currency,
      transactionId: sumupData.transaction_id,
    })
  } catch (error: any) {
    console.error("[v0] [SumUp Verify] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
