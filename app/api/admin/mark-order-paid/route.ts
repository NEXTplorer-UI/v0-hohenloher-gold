import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/api-auth"
import { createInvoiceAfterPayment } from "@/lib/hellocash/create-invoice-after-payment"
import { Resend } from "resend"
import { buildEmail } from "@/lib/email/build"
import { emailCopy } from "@/lib/email/copy"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    console.log("[v0] [mark-order-paid] Starting mark as paid process")

    const { orderId, paymentMethod, createInvoice = true, discountPercent, testMode, cashierId } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 })
    }

    if (testMode) {
      console.log("[v0] [mark-order-paid] Test mode enabled - creating TEST invoice")
    }

    if (discountPercent) {
      console.log("[v0] [mark-order-paid] Discount percent:", discountPercent)
    }

    if (cashierId) {
      console.log("[v0] [mark-order-paid] Cashier ID:", cashierId)
    }

    const supabase = createAdminClient()

    // Fetch order with all necessary data
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*, order_items(*, products(*)), customers(*)")
      .eq("id", orderId)
      .single()

    if (fetchError || !order) {
      console.error("[v0] [mark-order-paid] Error fetching order:", fetchError)
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Check if already paid
    if (order.payment_status === "paid") {
      return NextResponse.json({ error: "Order is already marked as paid" }, { status: 400 })
    }

    console.log("[v0] [mark-order-paid] Order found:", order.order_number)
    console.log("[v0] [mark-order-paid] Payment method:", paymentMethod || order.payment_method)
    console.log("[v0] [mark-order-paid] Create invoice:", createInvoice)

    let invoiceResult = null
    if (createInvoice) {
      // STEP 1: Create HelloCash invoice FIRST
      console.log("[v0] [mark-order-paid] Step 1: Creating HelloCash invoice...")
      invoiceResult = await createInvoiceAfterPayment(orderId, paymentMethod, testMode, discountPercent, cashierId)

      if (!invoiceResult.success) {
        console.error("[v0] [mark-order-paid] Invoice creation failed:", invoiceResult.error)
        return NextResponse.json(
          {
            error: "Failed to create invoice",
            details: invoiceResult.error,
          },
          { status: 500 },
        )
      }

      console.log(
        "[v0] [mark-order-paid] Invoice created successfully:",
        invoiceResult.invoiceId,
        invoiceResult.invoiceNumber,
      )
    } else {
      console.log("[v0] [mark-order-paid] Skipping invoice creation (createInvoice=false)")
    }

    // STEP 2: Update payment status
    console.log("[v0] [mark-order-paid] Step 2: Updating payment status...")
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
      })
      .eq("id", orderId)

    if (updateError) {
      console.error("[v0] [mark-order-paid] Error updating payment status:", updateError)
      return NextResponse.json({ error: "Failed to update payment status" }, { status: 500 })
    }

    console.log("[v0] [mark-order-paid] Payment status updated to 'paid'")

    if (!createInvoice) {
      console.log("[v0] [mark-order-paid] Skipping email (no invoice created)")
      return NextResponse.json({
        success: true,
        message: "Order marked as paid (no invoice created)",
      })
    }

    // STEP 3: Send payment receipt email with invoice attachment
    if (!order.customers?.email) {
      console.warn("[v0] [mark-order-paid] No customer email, skipping email")
      return NextResponse.json({
        success: true,
        message: "Order marked as paid, but no email sent (no customer email)",
        invoiceId: invoiceResult?.invoiceId,
        invoiceNumber: invoiceResult?.invoiceNumber,
      })
    }

    console.log("[v0] [mark-order-paid] Step 3: Sending payment receipt email...")

    try {
      const emailVars = {
        customerName: `${order.customers.first_name} ${order.customers.last_name}`,
        orderNumber: order.order_number,
        orderDate: new Date(order.created_at).toLocaleDateString("de-DE"),
        paymentMethod: paymentMethod || order.payment_method || "unbekannt",
        total: order.total.toFixed(2),
        orderItems: order.order_items.map((item: any) => ({
          product_name: item.products?.name || item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })),
      }

      const { subject, html } = buildEmail("paymentReceipt", emailVars, emailCopy)

      // Fetch invoice PDF as attachment
      const attachments = []
      const helloCashToken = process.env.HELLOCASH_API_TOKEN

      if (helloCashToken && invoiceResult?.invoiceId) {
        try {
          console.log("[v0] [mark-order-paid] Fetching invoice PDF...")
          console.log("[v0] [mark-order-paid] Invoice ID:", invoiceResult.invoiceId)
          console.log(
            "[v0] [mark-order-paid] API endpoint:",
            `https://api.hellocash.business/api/v1/invoices/${invoiceResult.invoiceId}/pdf`,
          )

          const pdfResponse = await fetch(
            `https://api.hellocash.business/api/v1/invoices/${invoiceResult.invoiceId}/pdf?cancellation=false&locale=de_DE`,
            {
              headers: {
                Authorization: `Bearer ${helloCashToken}`,
              },
            },
          )

          console.log("[v0] [mark-order-paid] PDF response status:", pdfResponse.status)
          console.log("[v0] [mark-order-paid] PDF response headers:", Object.fromEntries(pdfResponse.headers.entries()))

          if (pdfResponse.ok) {
            console.log("[v0] [mark-order-paid] Converting PDF to buffer...")
            const pdfBuffer = await pdfResponse.arrayBuffer() // This is correct - arrayBuffer() returns Promise<ArrayBuffer>
            console.log("[v0] [mark-order-paid] PDF buffer size:", pdfBuffer.byteLength, "bytes")

            if (pdfBuffer.byteLength === 0) {
              console.error("[v0] [mark-order-paid] PDF buffer is empty!")
            } else {
              attachments.push({
                filename: `Rechnung_${order.order_number}.pdf`,
                content: Buffer.from(pdfBuffer),
              })
              console.log(
                "[v0] [mark-order-paid] Invoice PDF attached successfully, size:",
                pdfBuffer.byteLength,
                "bytes",
              )
            }
          } else {
            const errorText = await pdfResponse.text()
            console.error("[v0] [mark-order-paid] Failed to fetch invoice PDF:", pdfResponse.status)
            console.error("[v0] [mark-order-paid] Error response:", errorText)
          }
        } catch (pdfError) {
          console.error("[v0] [mark-order-paid] Error fetching invoice PDF:", pdfError)
          console.error("[v0] [mark-order-paid] Error stack:", pdfError instanceof Error ? pdfError.stack : "No stack")
        }
      } else {
        console.log("[v0] [mark-order-paid] Skipping PDF fetch - Token or Invoice ID missing")
        console.log("[v0] [mark-order-paid] Token available:", !!helloCashToken)
        console.log("[v0] [mark-order-paid] Invoice ID:", invoiceResult?.invoiceId)
      }

      console.log("[v0] [mark-order-paid] Total attachments to send:", attachments.length)

      // Send email to customer
      await resend.emails.send({
        from: "Südfrüchte Hohenlohe <noreply@suedfruechte-hohenlohe.de>",
        to: order.customers.email,
        subject,
        html,
        attachments,
      })

      console.log("[v0] [mark-order-paid] Payment receipt email sent to:", order.customers.email)

      // Send copy to admin
      const adminEmail = process.env.SUMUP_PAY_TO_EMAIL || "info@suedfruechte-hohenlohe.de"
      await resend.emails.send({
        from: "Südfrüchte Hohenlohe <noreply@suedfruechte-hohenlohe.de>",
        to: adminEmail,
        subject: `[KOPIE] ${subject}`,
        html,
        attachments,
      })

      console.log("[v0] [mark-order-paid] Admin copy sent to:", adminEmail)

      return NextResponse.json({
        success: true,
        message: "Order marked as paid and payment receipt sent",
        invoiceId: invoiceResult?.invoiceId,
        invoiceNumber: invoiceResult?.invoiceNumber,
      })
    } catch (emailError) {
      console.error("[v0] [mark-order-paid] Error sending email:", emailError)
      return NextResponse.json(
        {
          success: true,
          warning: "Order marked as paid but email failed",
          invoiceId: invoiceResult?.invoiceId,
          invoiceNumber: invoiceResult?.invoiceNumber,
          emailError: emailError instanceof Error ? emailError.message : "Unknown error",
        },
        { status: 200 },
      )
    }
  } catch (error) {
    console.error("[v0] [mark-order-paid] Error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
