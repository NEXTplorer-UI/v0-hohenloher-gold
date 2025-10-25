import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SUMUP_API_BASE = "https://api.sumup.com/v0.1"

function safeGetOriginFromRequestUrl(req: NextRequest): string | null {
  try {
    const u = new URL(req.url)
    return u.origin
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  console.log("[v0] [SumUp] Create checkout API called")

  try {
    const body = await request.json()
    const { amount, currency, orderNumber, customerEmail, siteUrl: clientSiteUrl } = body

    console.log("[v0] [SumUp] Request data:", { amount, currency, orderNumber, customerEmail, clientSiteUrl })

    if (!amount || !currency || !orderNumber) {
      console.log("[v0] [SumUp] Missing required fields")
      return NextResponse.json({ error: "Missing required fields: amount, currency, orderNumber" }, { status: 400 })
    }

    const accessToken = process.env.SUMUP_ACCESS_TOKEN
    const merchantCode = process.env.SUMUP_MERCHANT_CODE
    const payToEmail = process.env.SUMUP_PAY_TO_EMAIL

    console.log("[v0] [SumUp] Environment check:", {
      hasAccessToken: !!accessToken,
      hasMerchantCode: !!merchantCode,
      hasPayToEmail: !!payToEmail,
    })

    if (!accessToken) {
      console.error("[v0] [SumUp] SUMUP_ACCESS_TOKEN not configured")
      return NextResponse.json({ error: "SumUp payment is not configured" }, { status: 500 })
    }

    let siteUrl = "http://localhost:3000"
    let urlSource = "localhost fallback"

    if (clientSiteUrl && typeof clientSiteUrl === "string" && clientSiteUrl.startsWith("http")) {
      siteUrl = clientSiteUrl
      urlSource = "client-provided"
    } else {
      const originFromUrl = safeGetOriginFromRequestUrl(request)
      if (originFromUrl) {
        siteUrl = originFromUrl
        urlSource = "request.url"
      } else if (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.startsWith("http")) {
        siteUrl = process.env.NEXT_PUBLIC_SITE_URL
        urlSource = "environment variable"
      }
    }

    console.log("[v0] [SumUp] URL resolution:", { urlSource, siteUrl })

    const checkoutPayload: any = {
      checkout_reference: orderNumber,
      amount: Number(amount),
      currency: currency.toUpperCase(),
      description: `Bestellung ${orderNumber}`,
      return_url: `${siteUrl}/payments/sumup/return`,
      ...(customerEmail && { customer_email: customerEmail }),
    }

    // Add either merchant_code or pay_to_email (at least one is required by SumUp)
    if (merchantCode) {
      checkoutPayload.merchant_code = merchantCode
      console.log("[v0] [SumUp] Using merchant_code")
    } else if (payToEmail) {
      checkoutPayload.pay_to_email = payToEmail
      console.log("[v0] [SumUp] Using pay_to_email:", payToEmail)
    } else {
      console.error("[v0] [SumUp] Neither SUMUP_MERCHANT_CODE nor SUMUP_PAY_TO_EMAIL is configured")
      return NextResponse.json({ error: "SumUp merchant configuration missing" }, { status: 500 })
    }

    console.log("[v0] [SumUp] Creating checkout with payload:", JSON.stringify(checkoutPayload, null, 2))

    const response = await fetch(`${SUMUP_API_BASE}/checkouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(checkoutPayload),
    })

    console.log("[v0] [SumUp] API response status:", response.status)

    const data = await response.json()
    console.log("[v0] [SumUp] API response data:", JSON.stringify(data, null, 2))

    if (!response.ok) {
      console.error("[v0] [SumUp] Checkout creation failed:", data)
      return NextResponse.json(
        { error: data.message || "Failed to create SumUp checkout" },
        { status: response.status },
      )
    }

    console.log("[v0] [SumUp] Checkout created successfully:", data.id)

    return NextResponse.json({
      checkoutId: data.id,
      checkoutUrl: `https://gateway.sumup.com/checkout/${data.id}`,
    })
  } catch (error: any) {
    console.error("[v0] [SumUp] Error creating checkout:", error)
    console.error("[v0] [SumUp] Error stack:", error.stack)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
