import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("[sumup-webhook] Received webhook:", body)

    // TODO: Verify webhook signature if SumUp provides one
    // const signature = request.headers.get("x-sumup-signature")
    // if (!verifySignature(body, signature)) {
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    // }

    const { event_type, resource_type, payload } = body

    if (event_type === "checkout.paid" && resource_type === "CHECKOUT") {
      const { checkout_reference, status, transaction_id } = payload

      if (status === "PAID") {
        const supabaseUrl = process.env.SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
          console.error("[sumup-webhook] Supabase credentials missing")
          return NextResponse.json({ error: "Database configuration missing" }, { status: 500 })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const { error } = await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            status: "confirmed",
          })
          .eq("order_number", checkout_reference)

        if (error) {
          console.error("[sumup-webhook] Failed to update order:", error)
          return NextResponse.json({ error: "Failed to update order status" }, { status: 500 })
        }

        console.log("[sumup-webhook] Order marked as paid:", checkout_reference)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("[sumup-webhook] Error processing webhook:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
