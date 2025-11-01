import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { buildEmail } from "@/lib/email/build"
import { emailCopy } from "@/lib/email/copy"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient()

    const { data: pendingEmail, error: fetchError } = await supabase
      .from("pending_emails")
      .select(`
        *,
        orders (
          *
        )
      `)
      .eq("id", params.id)
      .single()

    if (fetchError || !pendingEmail) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 })
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
        to: pendingEmail.email,
        subject,
        html,
      })

      // Delete from pending emails
      await supabase.from("pending_emails").delete().eq("id", params.id)

      return NextResponse.json({ success: true })
    } catch (emailError: any) {
      // Update retry count and error
      await supabase
        .from("pending_emails")
        .update({
          retry_count: pendingEmail.retry_count + 1,
          last_error: emailError.message,
          scheduled_for: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })
        .eq("id", params.id)

      return NextResponse.json({ error: emailError.message }, { status: 500 })
    }
  } catch (error: any) {
    console.error("[v0] Failed to retry email:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
