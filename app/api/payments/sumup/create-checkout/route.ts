import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SUMUP_API_BASE = "https://api.sumup.com/v0.1"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, currency, orderNumber, customerEmail } = body

    if (!amount || !currency || !orderNumber) {
      return NextResponse.json({ error: "Missing required fields: amount, currency, orderNumber" }, { status: 400 })
    }

    const accessToken = process.env.SUMUP_ACCESS_TOKEN
    if (!accessToken) {
      console.error("[sumup] SUMUP_ACCESS_TOKEN not configured")
      return NextResponse.json({ error: "SumUp payment is not configured" }, { status: 500 })
    }

    const checkoutPayload = {
      checkout_reference: orderNumber,
      amount: Number(amount),
      currency: currency.toUpperCase(),
      merchant_code: process.env.SUMUP_MERCHANT_CODE || undefined,
      description: `Bestellung ${orderNumber}`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin}/payments/sumup/return`,
      ...(customerEmail && { customer_email: customerEmail }),
    }

    console.log("[sumup] Creating checkout:", checkoutPayload)

    const response = await fetch(`${SUMUP_API_BASE}/checkouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(checkoutPayload),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("[sumup] Checkout creation failed:", data)
      return NextResponse.json(
        { error: data.message || "Failed to create SumUp checkout" },
        { status: response.status },
      )
    }

    console.log("[sumup] Checkout created successfully:", data.id)

    return NextResponse.json({
      checkoutId: data.id,
      checkoutUrl: `https://gateway.sumup.com/checkout/${data.id}`,
    })
  } catch (error: any) {
    console.error("[sumup] Error creating checkout:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
