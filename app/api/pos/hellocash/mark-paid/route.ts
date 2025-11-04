import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createInvoiceAfterPayment } from "@/lib/hellocash/create-invoice-after-payment"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json({ error: "Token fehlt" }, { status: 400 })
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

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
      .select("id, order_number, hellocash_invoice_id, status")
      .eq("pickup_token", token)
      .single()

    if (!order) {
      return NextResponse.json({ error: "Order nicht gefunden" }, { status: 404 })
    }

    const invoiceResult = await createInvoiceAfterPayment(order.id)

    if (!invoiceResult.success) {
      console.error("[mark-paid] Invoice creation failed:", invoiceResult.error)
      // Continue with status update even if invoice creation fails
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "paid",
        hellocash_status: "paid",
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
