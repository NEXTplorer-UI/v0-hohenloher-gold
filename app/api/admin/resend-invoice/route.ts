import { createServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email/email-service"
import { buildEmail } from "@/lib/email/build"
import { emailCopy } from "@/lib/email/copy"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 })
    }

    console.log(`[v0] Resending invoice for order ${orderId}`)

    // Fetch order with HelloCash invoice ID
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        customers (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      console.error("[v0] Order not found:", orderError)
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (!order.hellocash_invoice_id) {
      console.log("[v0] No HelloCash invoice found for this order")
      return NextResponse.json({ error: "No invoice exists for this order" }, { status: 400 })
    }

    if (!order.customers?.email) {
      console.log("[v0] No customer email found")
      return NextResponse.json({ error: "Customer has no email address" }, { status: 400 })
    }

    console.log(`[v0] Fetching invoice ${order.hellocash_invoice_id} from HelloCash`)

    // Fetch PDF from HelloCash
    const pdfResponse = await fetch(
      `https://api.hellocash.business/api/v1/invoices/${order.hellocash_invoice_id}/pdf?cancellation=false&locale=de_DE`,
      {
        headers: {
          Authorization: `Bearer ${process.env.HELLOCASH_API_TOKEN}`,
        },
      },
    )

    if (!pdfResponse.ok) {
      console.error("[v0] Failed to fetch PDF from HelloCash:", await pdfResponse.text())
      return NextResponse.json({ error: "Failed to fetch invoice from HelloCash" }, { status: 500 })
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()
    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64")

    console.log(`[v0] PDF fetched successfully, size: ${pdfBuffer.byteLength} bytes`)

    // Prepare email variables
    const emailVars = {
      customerName: `${order.customers.first_name} ${order.customers.last_name}`,
      orderNumber: order.order_number,
      invoiceNumber: order.hellocash_invoice_number || "N/A",
    }

    // Build email
    const { subject, html } = buildEmail("paymentReceipt", emailVars, emailCopy)

    // Send email with PDF attachment (skip if >3MB)
    const attachment =
      pdfBuffer.byteLength <= 3 * 1024 * 1024
        ? {
            filename: `Rechnung_${order.hellocash_invoice_number || order.order_number}.pdf`,
            content: pdfBase64,
          }
        : null

    if (!attachment) {
      console.log("[v0] PDF too large (>3MB), sending email without attachment")
    }

    const emailResult = await sendEmail({
      to: order.customers.email,
      subject,
      html,
      attachments: attachment ? [attachment] : undefined,
    })

    if (emailResult.success) {
      console.log("[v0] Invoice email resent successfully")
      return NextResponse.json({
        success: true,
        message: "Invoice email sent successfully",
        pdfAttached: !!attachment,
      })
    } else {
      console.error("[v0] Failed to send email:", emailResult.error)
      return NextResponse.json({ error: emailResult.error || "Failed to send email" }, { status: 500 })
    }
  } catch (error) {
    console.error("[v0] Error in resend-invoice route:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
