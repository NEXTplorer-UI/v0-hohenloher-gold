import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

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
      // Bereits bezahlt ist OK für diese Aktion
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

    // const helloCashStatus = await fetch(`${HELLOCASH_API_BASE}/invoices/${order.hellocash_invoice_id}`)
    // if (helloCashStatus.data.status !== 'paid') {
    //   return NextResponse.json({ error: "Zahlung in helloCash noch nicht bestätigt" }, { status: 400 })
    // }

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
