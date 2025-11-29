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

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        customers (
          id,
          first_name,
          last_name,
          email
        ),
        order_items (
          id,
          quantity,
          unit_price,
          product_name
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

    const pdfResponse = await fetch(
      `https://api.hellocash.business/api/v1/invoices/${order.hellocash_invoice_id}/pdf?cancellation=false&locale=de_DE`,
      {
        headers: {
          Authorization: `Bearer ${process.env.HELLOCASH_API_TOKEN}`,
          Accept: "application/json",
        },
      },
    )

    if (!pdfResponse.ok) {
      console.error("[v0] Failed to fetch PDF from HelloCash:", await pdfResponse.text())
      return NextResponse.json({ error: "Failed to fetch invoice from HelloCash" }, { status: 500 })
    }

    const pdfData = await pdfResponse.json()
    const pdfBase64 = pdfData.pdf_base64_encoded

    if (!pdfBase64) {
      console.error("[v0] No pdf_base64_encoded in HelloCash response")
      return NextResponse.json({ error: "Invalid PDF response from HelloCash" }, { status: 500 })
    }

    console.log(`[v0] PDF fetched successfully, base64 length: ${pdfBase64.length}`)

    const orderDate = new Date(order.created_at).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })

    const orderItems = order.order_items.map((item: any) => ({
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price,
    }))

    const emailVars = {
      customerName: `${order.customers.first_name} ${order.customers.last_name}`,
      orderNumber: order.order_number,
      invoiceNumber: order.hellocash_invoice_number || "N/A",
      orderDate,
      paymentMethod: order.payment_method || "cash",
      orderItems,
      total: order.total,
    }

    // Build email
    const { subject, html } = buildEmail("paymentReceipt", emailVars, emailCopy)

    const pdfSizeEstimate = (pdfBase64.length * 3) / 4 // Estimate decoded size
    const attachment =
      pdfSizeEstimate <= 3 * 1024 * 1024
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
