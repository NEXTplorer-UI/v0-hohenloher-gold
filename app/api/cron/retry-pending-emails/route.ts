import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { buildEmail } from "@/lib/email/build"
import { emailCopy } from "@/lib/email/copy"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Get pending emails that are due for retry
    const { data: pendingEmails, error: fetchError } = await supabase
      .from("pending_emails")
      .select(`
        *,
        orders (
          *
        )
      `)
      .lte("scheduled_for", new Date().toISOString())
      .is("sent_at", null)
      .is("failed_at", null)
      .order("scheduled_for", { ascending: true })
      .limit(10)

    if (fetchError) throw fetchError

    console.log(`[v0] [Cron] Found ${pendingEmails?.length || 0} pending emails to retry`)

    let successCount = 0
    let failCount = 0

    for (const pendingEmail of pendingEmails || []) {
      if (pendingEmail.retry_count >= pendingEmail.max_retries) {
        // Mark as failed
        await supabase.from("pending_emails").update({ failed_at: new Date().toISOString() }).eq("id", pendingEmail.id)
        continue
      }

      const order = pendingEmail.orders

      try {
        const vars = {
          customerName: `${order.customer_first_name} ${order.customer_last_name}`,
          orderNumber: order.order_number,
          orderDate: new Date(order.created_at).toLocaleDateString("de-DE"),
          paymentMethod: order.payment_method,
          total: order.total_amount.toFixed(2),
          orderItems: order.items || [],
          deliveryMethod: order.delivery_method,
        }

        const { subject, html } = buildEmail("orderConfirmation", vars, emailCopy)

        await resend.emails.send({
          from: "Südfrüchte Hohenlohe <noreply@suedfruechte-hohenlohe.de>",
          to: pendingEmail.email_to,
          subject,
          html,
        })

        // Mark as sent
        await supabase.from("pending_emails").update({ sent_at: new Date().toISOString() }).eq("id", pendingEmail.id)

        successCount++
        console.log(`[v0] [Cron] Successfully sent email for order ${order.order_number}`)
      } catch (emailError: any) {
        failCount++
        console.error(`[v0] [Cron] Failed to send email for order ${order.order_number}:`, emailError)

        // Update retry count and error
        const newRetryCount = pendingEmail.retry_count + 1
        const nextRetry = new Date(Date.now() + Math.pow(2, newRetryCount) * 5 * 60 * 1000) // Exponential backoff

        await supabase
          .from("pending_emails")
          .update({
            retry_count: newRetryCount,
            last_error: emailError.message,
            scheduled_for: nextRetry.toISOString(),
          })
          .eq("id", pendingEmail.id)
      }
    }

    return NextResponse.json({
      success: true,
      processed: pendingEmails?.length || 0,
      successful: successCount,
      failed: failCount,
    })
  } catch (error: any) {
    console.error("[v0] [Cron] Error processing pending emails:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
