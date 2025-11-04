import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { buildEmail } from "@/lib/email/build"
import { emailCopy } from "@/lib/email/copy"
import { Resend } from "resend"
import { retryWithBackoff } from "@/lib/retry-utils"
import { sendAdminNotification } from "@/lib/admin-notifications"
import { createInvoiceAfterPayment } from "@/lib/hellocash/create-invoice-after-payment"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("[v0] [sumup-webhook] Received webhook:", body)

    const { event_type, resource_type, payload } = body

    if (event_type === "checkout.paid" && resource_type === "CHECKOUT") {
      const { checkout_reference, status, transaction_id } = payload

      if (status === "PAID") {
        const supabase = createAdminClient()

        const { data: checkout, error: checkoutError } = await supabase
          .from("checkouts")
          .select("*")
          .eq("sumup_checkout_id", checkout_reference)
          .single()

        if (checkoutError || !checkout) {
          console.error("[v0] [sumup-webhook] Checkout not found:", checkoutError)
          return NextResponse.json({ received: true, error: "Checkout not found" })
        }

        console.log("[v0] [sumup-webhook] Found checkout:", checkout.id, "version:", checkout.version)

        if (checkout.status === "processing" || checkout.status === "completed") {
          console.log("[v0] [sumup-webhook] Checkout already being processed")
          return NextResponse.json({ received: true, message: "Already processing" })
        }

        const { data: lockedCheckout, error: lockError } = await supabase
          .from("checkouts")
          .update({
            status: "processing",
            payment_status: "paid",
          })
          .eq("id", checkout.id)
          .eq("version", checkout.version)
          .select()
          .single()

        if (lockError || !lockedCheckout) {
          console.log("[v0] [sumup-webhook] Failed to acquire lock, another process is handling this")
          return NextResponse.json({ received: true, message: "Already being processed by another handler" })
        }

        console.log("[v0] [sumup-webhook] Lock acquired, version:", lockedCheckout.version)

        const { data: existingOrder } = await supabase
          .from("orders")
          .select("order_number")
          .eq("checkout_id", checkout.id)
          .single()

        if (existingOrder) {
          console.log("[v0] [sumup-webhook] Order already exists:", existingOrder.order_number)

          await supabase
            .from("checkouts")
            .update({
              status: "completed",
              order_number: existingOrder.order_number,
            })
            .eq("id", checkout.id)

          return NextResponse.json({ received: true, message: "Order already processed" })
        }

        const orderData = {
          customer_email: checkout.customer_email,
          customer_first_name: checkout.customer_first_name,
          customer_last_name: checkout.customer_last_name,
          customer_phone: checkout.customer_phone,
          delivery_method: checkout.delivery_method || "pickup",
          payment_method: "sumup",
          payment_status: "paid",
          status: "pending",
          total_amount: checkout.total_amount,
          items: checkout.items,
          notes: checkout.notes,
          delivery_date: checkout.delivery_date,
          delivery_time_slot: checkout.delivery_time_slot,
          delivery_address: checkout.delivery_address,
          pickup_location_id: checkout.pickup_location_id,
          checkout_id: checkout.id,
          transaction_id: transaction_id,
        }

        const newOrder = await retryWithBackoff(
          async () => {
            const { data, error } = await supabase.from("orders").insert(orderData).select().single()
            if (error) throw error
            return data
          },
          3,
          "Create order from webhook",
        )

        console.log("[v0] [sumup-webhook] Order created successfully:", newOrder.order_number)

        const invoiceResult = await createInvoiceAfterPayment(newOrder.id)
        if (!invoiceResult.success) {
          console.error("[v0] [sumup-webhook] Invoice creation failed:", invoiceResult.error)
        } else {
          console.log("[v0] [sumup-webhook] Invoice created:", invoiceResult.invoiceNumber)
        }

        await supabase
          .from("checkouts")
          .update({
            status: "completed",
            order_number: newOrder.order_number,
          })
          .eq("id", checkout.id)

        if (checkout.customer_email) {
          try {
            await retryWithBackoff(
              async () => {
                const vars = {
                  customerName: `${checkout.customer_first_name} ${checkout.customer_last_name}`,
                  orderNumber: newOrder.order_number,
                  orderDate: new Date(newOrder.created_at).toLocaleDateString("de-DE"),
                  paymentMethod: "sumup",
                  total: checkout.total_amount.toFixed(2),
                  orderItems: checkout.items || [],
                  deliveryMethod: checkout.delivery_method || "pickup",
                }

                const { subject, html } = buildEmail("orderConfirmation", vars, emailCopy)

                await resend.emails.send({
                  from: "Südfrüchte Hohenlohe <noreply@suedfruechte-hohenlohe.de>",
                  to: checkout.customer_email,
                  subject,
                  html,
                })
              },
              3,
              "Send confirmation email",
            )

            console.log("[v0] [sumup-webhook] Confirmation email sent")
          } catch (emailError: any) {
            console.error("[v0] [sumup-webhook] Failed to send email after retries:", emailError)

            await supabase.from("pending_emails").insert({
              order_id: newOrder.id,
              email: checkout.customer_email,
              type: "order_confirmation",
              retry_count: 0,
              scheduled_for: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            })

            await sendAdminNotification({
              type: "email_failed",
              severity: "warning",
              title: "E-Mail-Versand fehlgeschlagen",
              message: `Bestätigungs-E-Mail für Bestellung ${newOrder.order_number} konnte nicht versendet werden.`,
              metadata: {
                order_number: newOrder.order_number,
                customer_email: checkout.customer_email,
                error: emailError.message,
              },
            })
          }
        }

        return NextResponse.json({
          received: true,
          orderNumber: newOrder.order_number,
          message: "Order created successfully",
        })
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("[v0] [sumup-webhook] Error processing webhook:", error)

    await sendAdminNotification({
      type: "webhook_error",
      severity: "critical",
      title: "SumUp Webhook Fehler",
      message: `Webhook konnte nicht verarbeitet werden: ${error.message}`,
      metadata: { error: error.message, stack: error.stack },
    })

    return NextResponse.json({ received: true, error: error.message })
  }
}
