import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/auth/api-auth"
import { getAdminClient } from "@/lib/supabase/admin"

function normalizeStatusForUI(dbStatus: string): string {
  if (dbStatus === "completed") return "picked_up"
  return dbStatus
}

export async function GET(req: NextRequest) {
  try {
    console.log("[v0] [admin/orders] API called")

    const authResult = await requireAdmin(req)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q") ?? ""
    const status = searchParams.get("status") ?? ""
    const limit = Number(searchParams.get("limit") ?? 50)
    const offset = Number(searchParams.get("offset") ?? 0)

    console.log("[v0] [admin/orders] Creating admin client...")
    const supabase = getAdminClient()

    console.log("[v0] [admin/orders] Fetching orders with params:", { limit, offset, q, status })

    const { data, error } = await supabase.rpc("admin_orders_search", {
      limit_count: limit,
      offset_count: offset,
      search_query: q || null,
      status_filter: status || null,
    })

    if (error) {
      console.error("[v0] [admin/orders] RPC error:", error)
      return NextResponse.json({ error: "Database error", details: error.message }, { status: 500 })
    }

    if (!Array.isArray(data)) {
      console.error("[v0] [admin/orders] Data is not an array:", typeof data)
      return NextResponse.json({ orders: [], total: 0 })
    }

    console.log("[v0] [admin/orders] RPC found", data.length, "orders")

    // The RPC function returns all matching results, we can estimate total from results
    const totalCount = data.length

    const shaped = data.map((row: any) => ({
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
      hellocash_invoice_id: row.hellocash_invoice_id,
      hellocash_invoice_number: row.hellocash_invoice_number,
      customer: {
        first_name: row.customer_first_name || "",
        last_name: row.customer_last_name || "",
        email: row.customer_email || "",
        phone: row.customer_phone || null,
        special_requests: row.customer_special_requests || null,
      },
      order_items: Array.isArray(row.order_items) ? row.order_items : [],
    }))

    console.log("[v0] [admin/orders] Successfully shaped orders")

    return NextResponse.json(
      { orders: shaped, total: totalCount || 0 },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    )
  } catch (error) {
    console.error("[v0] [admin/orders] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
