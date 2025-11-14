import { NextResponse } from "next/server"
import { getAdminClient } from "@/lib/supabase/admin"
import { createInvoiceAfterPayment } from "@/lib/hellocash/create-invoice-after-payment"
import { buildEmail } from "@/lib/email/build"
import { emailCopy } from "@/lib/email/copy"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const { token, paymentMethod = "cash" } = await req.json()

    if (!token) {
      return NextResponse.json({ error: "Token fehlt" }, { status: 400 })
    }

    const supabase = getAdminClient()

    const { data: validation } = await supabase.rpc("validate_qr_code", {
      p_pickup_token: token,
    })

    if (!validation?.valid) {
      if (validation?.error === "already_paid") {
        return NextResponse.json({
          ok: true,
          hellocash_status: "paid",
          message: "Bestellung war bereits als bezahlt markiert",
        })
      }

      return NextResponse.json(
        {
          error: validation?.error || "invalid_token",
          message: validation?.message || "Ungültiger QR-Code",
        },
        { status: 400 },
      )
    }

    const { data: order } = await supabase
      .from("orders")
      .select(`
        *,
        customer:customers(*),
        order_items(*, products(*))
      `)
      .eq("pickup_token", token)
      .single()

    if (!order) {
      return NextResponse.json({ error: "Order nicht gefunden" }, { status: 404 })
    }

    const invoiceResult = await createInvoiceAfterPayment(order.id)

    if (!invoiceResult.success) {
      console.error("[mark-paid] Invoice creation failed:", invoiceResult.error)
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "paid",
        hellocash_status: "paid",
        payment_status: "paid",
        payment_method: paymentMethod, // Store selected payment method
        pos_synced_at: new Date().toISOString(),
      })
      .eq("id", order.id)

    if (updateError) {
      console.error("[mark-paid] Update error:", updateError)
      return NextResponse.json(
        {
          error: "Fehler beim Aktualisieren",
          message: updateError.message,
        },
        { status: 500 },
      )
    }

    await supabase.rpc("log_qr_scan", {
      p_order_id: order.id,
      p_source: "pos",
      p_scan_result: "payment_confirmed",
      p_ip: req.headers.get("x-forwarded-for")?.split(",")[0] || null,
      p_user_agent: req.headers.get("user-agent") || null,
    })

    try {
      console.log("[mark-paid] Sending payment receipt email to", order.customer.email)

      const emailVars = {
        customerName: `${order.customer.first_name || ""} ${order.customer.last_name || ""}`.trim(),
        orderNumber: order.order_number || "",
        orderId: order.order_number || "",
        orderDate: order.created_at ? new Date(order.created_at).toLocaleDateString("de-DE") : "",
        orderTotal: order.total ? order.total.toFixed(2) : "0.00",
        total: order.total ? order.total.toFixed(2) : "0.00",
        paymentMethod:
          paymentMethod === "cash"
            ? "Bar"
            : paymentMethod === "card"
              ? "Karte"
              : paymentMethod === "ec"
                ? "EC-Karte"
                : "SumUp",
        paymentStatus: "paid",
        orderItems: (order.order_items || []).map((item: any) => ({
          product_name: item.products?.name || item.product_name || "Unbekanntes Produkt",
          quantity: item.quantity || 0,
          unit_price: item.unit_price || 0,
          total_price: item.total_price || item.quantity * item.unit_price || 0,
          product_size: item.product_size || item.products?.unit || null,
        })),
      }

      const { subject, html } = buildEmail("paymentReceipt", emailVars, emailCopy)

      // Fetch invoice PDF if available
      let attachments: Array<{ filename: string; content: string }> | undefined

      if (invoiceResult.success && order.hellocash_invoice_id) {
        try {
          const helloCashToken = process.env.HELLOCASH_API_TOKEN
          if (helloCashToken) {
            const pdfResponse = await fetch(
              `https://api.hellocash.business/api/v1/invoices/${order.hellocash_invoice_id}/pdf?cancellation=false&locale=de_DE`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${helloCashToken}`,
                  Accept: "application/json",
                },
              },
            )

            if (pdfResponse.ok) {
              const pdfData = await pdfResponse.json()
              attachments = [
                {
                  filename: `Rechnung_${order.order_number}.pdf`,
                  content: pdfData.pdf_base64_encoded,
                },
              ]
              console.log("[mark-paid] Invoice PDF attached to email")
            }
          }
        } catch (pdfError) {
          console.error("[mark-paid] Error fetching PDF:", pdfError)
        }
      }

      await resend.emails.send({
        from: "Südfrüchte Hohenlohe <noreply@suedfruechte-hohenlohe.de>",
        to: order.customer.email,
        subject,
        html,
        attachments,
      })

      console.log("[mark-paid] Payment receipt email sent successfully")
    } catch (emailError) {
      console.error("[mark-paid] Failed to send email:", emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      ok: true,
      hellocash_status: "paid",
      order_number: order.order_number,
      invoice_number: invoiceResult.invoiceNumber,
    })
  } catch (error: any) {
    console.error("[mark-paid] Error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
      },
      { status: 500 },
    )
  }
}
