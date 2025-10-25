import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { buildEmail } from "@/lib/email/build"
import { emailCopy } from "@/lib/email/copy"
import { Resend } from "resend"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("[v0] [sumup-webhook] Received webhook:", body)

    // TODO: Verify webhook signature if SumUp provides one
    // const signature = request.headers.get("x-sumup-signature")
    // if (!verifySignature(body, signature)) {
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    // }

    const { event_type, resource_type, payload } = body

    if (event_type === "checkout.paid" && resource_type === "CHECKOUT") {
      const { checkout_reference, status, transaction_id } = payload

      if (status === "PAID") {
        const supabase = createAdminClient()

        const { data: checkout, error: checkoutError } = await supabase
          .from("checkouts")
          .update({
            payment_status: "paid",
            status: "completed",
          })
          .eq("sumup_checkout_id", checkout_reference)
          .select("*")
          .single()

        if (checkoutError) {
          console.error("[v0] [sumup-webhook] Failed to update checkout:", checkoutError)
          return NextResponse.json({ received: true, error: "Failed to update checkout" })
        }

        console.log("[v0] [sumup-webhook] Checkout marked as paid:", checkout_reference)

        if (checkout && checkout.customer_email) {
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

            console.log("[v0] [sumup-webhook] Receipt email sent")
          } catch (emailError) {
            console.error("[v0] [sumup-webhook] Failed to send receipt email:", emailError)
          }
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("[v0] [sumup-webhook] Error processing webhook:", error)
    return NextResponse.json({ received: true, error: error.message })
  }
}
