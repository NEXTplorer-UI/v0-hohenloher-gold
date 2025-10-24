import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SUMUP_API_BASE = "https://api.sumup.com/v0.1"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const checkoutId = searchParams.get("checkoutId")

    if (!checkoutId) {
      return NextResponse.json({ error: "Missing checkoutId parameter" }, { status: 400 })
    }

    const accessToken = process.env.SUMUP_ACCESS_TOKEN
    if (!accessToken) {
      console.error("[sumup] SUMUP_ACCESS_TOKEN not configured")
      return NextResponse.json({ error: "SumUp payment is not configured" }, { status: 500 })
    }

    console.log("[sumup] Verifying checkout:", checkoutId)

    const response = await fetch(`${SUMUP_API_BASE}/checkouts/${checkoutId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("[sumup] Verification failed:", data)
      return NextResponse.json({ error: data.message || "Failed to verify checkout" }, { status: response.status })
    }

    console.log("[sumup] Checkout status:", data.status)

    return NextResponse.json({
      status: data.status,
      orderNumber: data.checkout_reference,
      amount: data.amount,
      currency: data.currency,
      transactionId: data.transaction_id,
    })
  } catch (error: any) {
    console.error("[sumup] Error verifying checkout:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
