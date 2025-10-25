import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { verifySumUpCheckout } from "@/lib/sumup/verify"
import { buildEmail } from "@/lib/email/build"
import { emailCopy } from "@/lib/email/copy"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

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
      const { error: updateError } = await supabase
        .from("checkouts")
        .update({
          payment_status: "paid",
          status: "completed",
        })
        .eq("id", checkout.id)

      if (updateError) {
        console.error("[v0] [SumUp Return] Failed to update checkout:", updateError)
      }

      if (checkout.customer_email) {
        try {
          const vars = {
            customerName: `${checkout.customer_first_name} ${checkout.customer_last_name}`,
            orderNumber: checkout.temp_order_number,
            orderDate: new Date(checkout.created_at).toLocaleDateString("de-DE"),
            paymentMethod: "card",
            total: checkout.total_amount.toFixed(2),
            orderItems: checkout.items || [],
          }

          const { subject, html } = buildEmail("paymentReceipt", vars, emailCopy)

          await resend.emails.send({
            from: "Südfrüchte Hohenlohe <noreply@suedfruechte-hohenlohe.de>",
            to: checkout.customer_email,
            subject,
            html,
          })

          console.log("[v0] [SumUp Return] Receipt email sent")
        } catch (emailError) {
          console.error("[v0] [SumUp Return] Failed to send receipt email:", emailError)
        }
      }

      return NextResponse.redirect(
        new URL(`/order-confirmation?tempOrderNumber=${checkout.temp_order_number}`, req.url),
      )
    } else {
      const { error: updateError } = await supabase
        .from("checkouts")
        .update({
          payment_status: result.status === "FAILED" ? "failed" : "cancelled",
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
