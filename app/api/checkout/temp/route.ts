import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    console.log("[v0] [Checkout] Creating temporary checkout")

    const body = await request.json()
    const {
      paymentMethod,
      email,
      firstName,
      lastName,
      phone,
      deliveryDate,
      deliveryTimeSlot,
      deliveryAddress,
      cartItems,
      totalAmount,
      notes,
      siteUrl,
    } = body

    console.log("[v0] [Checkout] Request data:", {
      paymentMethod,
      email,
      itemCount: cartItems?.length,
      totalAmount,
    })

    // Validation
    if (!paymentMethod || !email || !cartItems || !totalAmount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get site URL for return URL
    let returnUrl = "http://localhost:3000"
    if (siteUrl && typeof siteUrl === "string" && siteUrl.startsWith("http")) {
      returnUrl = siteUrl
    } else {
      try {
        const requestUrl = new URL(request.url)
        returnUrl = requestUrl.origin
      } catch (e) {
        console.error("[v0] [Checkout] Failed to parse request URL:", e)
      }
    }

    console.log("[v0] [Checkout] Using return URL:", returnUrl)

    const supabase = createAdminClient()

    // Calculate expiry (24 hours from now)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    // Get metadata from request
    const userAgent = request.headers.get("user-agent") || undefined
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined
    const referrer = request.headers.get("referer") || undefined

    const { data: checkout, error: checkoutError } = await supabase
      .from("checkouts")
      .insert({
        status: "initiated",
        payment_method: paymentMethod,
        email: email.toLowerCase().trim(),
        first_name: firstName,
        last_name: lastName,
        phone,
        delivery_date: deliveryDate,
        delivery_time_slot: deliveryTimeSlot,
        delivery_address: deliveryAddress,
        cart_items: cartItems,
        total_amount: totalAmount,
        notes,
        expires_at: expiresAt.toISOString(),
        user_agent: userAgent,
        ip_address: ipAddress,
        referrer: referrer,
      })
      .select()
      .single()

    if (checkoutError) {
      console.error("[v0] [Checkout] Failed to create checkout:", checkoutError)
      return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 })
    }

    console.log("[v0] [Checkout] Created checkout:", checkout.id, "with temp number:", checkout.temp_order_number)

    // If SumUp payment, create SumUp checkout
    if (paymentMethod === "sumup") {
      console.log("[v0] [Checkout] Creating SumUp checkout")

      const sumupAccessToken = process.env.SUMUP_ACCESS_TOKEN
      const sumupPayToEmail = process.env.SUMUP_PAY_TO_EMAIL
      const sumupMerchantCode = process.env.SUMUP_MERCHANT_CODE

      if (!sumupAccessToken) {
        console.error("[v0] [Checkout] SumUp not configured")
        return NextResponse.json({ error: "SumUp payment is not configured" }, { status: 500 })
      }

      // Build SumUp checkout payload
      const sumupPayload: any = {
        checkout_reference: checkout.id,
        amount: Number.parseFloat(totalAmount.toFixed(2)),
        currency: "EUR",
        description: `Bestellung ${checkout.temp_order_number} - Südfruechte Hohenlohe`,
        return_url: `${returnUrl}/payments/sumup/return?checkoutId=${checkout.id}`,
      }

      // Add merchant identification
      if (sumupMerchantCode) {
        sumupPayload.merchant_code = sumupMerchantCode
      } else if (sumupPayToEmail) {
        sumupPayload.pay_to_email = sumupPayToEmail
      }

      console.log("[v0] [Checkout] SumUp payload:", {
        ...sumupPayload,
        return_url: sumupPayload.return_url.substring(0, 50) + "...",
      })

      // Create SumUp checkout
      const sumupResponse = await fetch("https://api.sumup.com/v0.1/checkouts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sumupAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sumupPayload),
      })

      const sumupData = await sumupResponse.json()

      if (!sumupResponse.ok) {
        console.error("[v0] [Checkout] SumUp checkout creation failed:", sumupData)

        // Update checkout status to failed
        await supabase.from("checkouts").update({ status: "failed" }).eq("id", checkout.id)

        return NextResponse.json(
          { error: sumupData.message || "Failed to create SumUp checkout" },
          { status: sumupResponse.status },
        )
      }

      console.log("[v0] [Checkout] SumUp checkout created:", sumupData.id)

      // Update checkout with SumUp checkout ID
      const { error: updateError } = await supabase
        .from("checkouts")
        .update({
          sumup_checkout_id: sumupData.id,
          status: "pending",
        })
        .eq("id", checkout.id)

      if (updateError) {
        console.error("[v0] [Checkout] Failed to update checkout with SumUp ID:", updateError)
      }

      return NextResponse.json({
        success: true,
        checkoutId: checkout.id,
        tempOrderNumber: checkout.temp_order_number,
        sumupCheckoutId: sumupData.id,
      })
    }

    return NextResponse.json({
      success: true,
      checkoutId: checkout.id,
      tempOrderNumber: checkout.temp_order_number,
    })
  } catch (error) {
    console.error("[v0] [Checkout] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
