import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/api-auth"

export async function POST(request: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    // Check admin authentication
    const adminCheck = await requireAdmin()
    if (adminCheck) return adminCheck

    const { orderId } = params
    const { reason } = await request.json()

    if (!reason || reason.trim() === "") {
      return NextResponse.json({ error: "Stornierungsgrund erforderlich" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get order with helloCash invoice ID
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("hellocash_invoice_id, order_number")
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Bestellung nicht gefunden" }, { status: 404 })
    }

    if (!order.hellocash_invoice_id) {
      return NextResponse.json({ error: "Keine helloCash-Rechnung vorhanden" }, { status: 400 })
    }

    const helloCashToken = process.env.HELLOCASH_API_TOKEN
    if (!helloCashToken) {
      return NextResponse.json({ error: "helloCash API nicht konfiguriert" }, { status: 500 })
    }

    // Call helloCash cancellation API
    const helloCashResponse = await fetch(
      `https://api.hellocash.business/api/v1/invoices/${order.hellocash_invoice_id}/cancellation`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${helloCashToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cancellation_cashier_id: 838,
          cancellation_reason: reason,
          cancellation_payment_method: "cash",
        }),
      },
    )

    if (!helloCashResponse.ok) {
      const errorText = await helloCashResponse.text()
      console.error("[v0] helloCash cancellation failed:", errorText)
      return NextResponse.json(
        { error: "Stornierung in helloCash fehlgeschlagen" },
        { status: helloCashResponse.status },
      )
    }

    const cancellationData = await helloCashResponse.json()

    // Update order status in database
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "cancelled",
        hellocash_status: "cancelled",
        admin_notes: `Storniert: ${reason}\nStorno-Nummer: ${cancellationData.cancellation_details?.number || "N/A"}`,
      })
      .eq("id", orderId)

    if (updateError) {
      console.error("[v0] Failed to update order status:", updateError)
      return NextResponse.json({ error: "Fehler beim Aktualisieren der Bestellung" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Rechnung erfolgreich storniert",
      cancellation: cancellationData.cancellation_details,
    })
  } catch (error) {
    console.error("[v0] Error cancelling invoice:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unbekannter Fehler" }, { status: 500 })
  }
}
