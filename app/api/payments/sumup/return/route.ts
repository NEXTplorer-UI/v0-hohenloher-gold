import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { verifySumUpCheckout } from "@/lib/sumup/verify"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const checkoutId = searchParams.get("checkoutId")

    console.log("[v0] [SumUp Return] Checkout ID:", checkoutId)

    if (!checkoutId) {
      return NextResponse.redirect(new URL("/checkout?error=missing_checkout_id", req.url))
    }

    const result = await verifySumUpCheckout(checkoutId)
    console.log("[v0] [SumUp Return] Payment status:", result.status)

    const supabase = createAdminClient()

    const { data: checkout, error: checkoutError } = await supabase
      .from("checkouts")
      .select("*")
      .eq("sumup_checkout_id", checkoutId)
      .single()

    if (checkoutError || !checkout) {
      console.error("[v0] [SumUp Return] Checkout not found:", checkoutError)
      return NextResponse.redirect(new URL("/checkout?error=checkout_not_found", req.url))
    }

    if (result.status === "PAID") {
      await supabase
        .from("checkouts")
        .update({
          payment_status: "paid",
          status: "processing",
        })
        .eq("id", checkout.id)

      // Redirect to order processing page to show progress
      return NextResponse.redirect(new URL(`/order-processing?checkoutId=${checkout.id}&source=sumup`, req.url))
    } else {
      const { error: updateError } = await supabase
        .from("checkouts")
        .update({
          payment_status: result.status === "FAILED" ? "failed" : "cancelled",
          status: result.status === "FAILED" ? "failed" : "cancelled",
        })
        .eq("id", checkout.id)

      if (updateError) {
        console.error("[v0] [SumUp Return] Failed to update checkout:", updateError)
      }

      return NextResponse.redirect(
        new URL(`/checkout?error=payment_${result.status.toLowerCase()}&checkoutId=${checkout.id}`, req.url),
      )
    }
  } catch (error) {
    console.error("[v0] [SumUp Return] Error:", error)
    return NextResponse.redirect(new URL("/checkout?error=verification_failed", req.url))
  }
}
