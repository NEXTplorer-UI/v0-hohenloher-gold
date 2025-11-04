import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!url || !key) {
    throw new Error("Supabase ENV fehlt (URL/Service-Role-Key)")
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

function normalizeStatusForUI(dbStatus: string) {
  // DB uses: pending, confirmed, ready, completed, cancelled
  // UI uses "picked_up" -> map back
  if (dbStatus === "completed") return "picked_up"
  return dbStatus
}

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    console.log("[v0] [admin/orders] API called")

    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q") ?? ""
    const status = searchParams.get("status") ?? ""
    const limit = Number(searchParams.get("limit") ?? 200)
    const offset = Number(searchParams.get("offset") ?? 0)

    console.log("[v0] [admin/orders] Creating admin client...")
    const supabase = createAdminClient()

    console.log("[v0] [admin/orders] Calling RPC get_admin_orders...")
    const { data, error } = await supabase.rpc("get_admin_orders", {
      q,
      status_filter: status === "all" ? null : status === "picked_up" ? "completed" : status,
      limit_count: limit,
      offset_count: offset,
    })

    if (error) {
      console.error("[v0] [admin/orders] RPC error:", error)
      return NextResponse.json({ error: "Database error", details: error.message }, { status: 500 })
    }

    console.log("[v0] [admin/orders] Fetched", data?.length || 0, "orders")

    const withQR = (data ?? []).filter((row: any) => row.qr_code_url)
    const withoutQR = (data ?? []).filter((row: any) => !row.qr_code_url)
    console.log("[v0] [admin/orders] Orders with qr_code_url in raw data:", withQR.length)
    console.log("[v0] [admin/orders] Orders without qr_code_url in raw data:", withoutQR.length)
    if (withQR.length > 0) {
      console.log("[v0] [admin/orders] Sample order with QR:", {
        order_number: withQR[0].order_number,
        qr_code_url: withQR[0].qr_code_url,
      })
    }

    const shaped = (data ?? []).map((row: any) => ({
      id: row.id,
      order_number: row.order_number,
      customer_id: row.customer_id,
      status: normalizeStatusForUI(row.status),
      total: Number(row.total),
      delivery_method: row.delivery_method,
      pickup_location: row.pickup_location,
      payment_method: row.payment_method,
      payment_status: row.payment_status,
      notes: row.notes,
      created_at: row.created_at,
      qr_code_url: row.qr_code_url,
      customer: row.customer ?? { first_name: "", last_name: "", email: "", phone: null },
      order_items: Array.isArray(row.order_items) ? row.order_items : [],
    }))

    console.log("[v0] [admin/orders] Successfully shaped orders")
    return NextResponse.json(shaped, { status: 200 })
  } catch (e: any) {
    console.error("[v0] [admin/orders] Unexpected:", e)
    return NextResponse.json({ error: "Server error", details: e?.message }, { status: 500 })
  }
}
