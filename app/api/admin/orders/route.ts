import { NextResponse } from "next/server"
import { getAdminClient } from "@/lib/supabase/admin"

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
    const supabase = getAdminClient()

    console.log("[v0] [admin/orders] Fetching orders with direct query...")

    // Build the query
    let query = supabase
      .from("orders")
      .select(`
        *,
        customer:customers(first_name, last_name, email, phone),
        order_items(
          id,
          product_id,
          quantity,
          unit_price,
          total_price,
          product_name,
          product_category,
          product_size,
          product:products(name, unit, image_url)
        )
      `)
      .order("created_at", { ascending: false })

    // Apply status filter
    if (status && status !== "all") {
      const dbStatus = status === "picked_up" ? "completed" : status
      query = query.eq("status", dbStatus)
    }

    // Apply search filter (search in order_number, customer name, email)
    if (q && q.trim() !== "") {
      // For search, we need to use a more complex approach since we can't directly search joined tables
      // We'll fetch all and filter in memory for now (can be optimized with RPC later if needed)
      const { data: allOrders, error: fetchError } = await query.range(0, 1000)

      if (fetchError) {
        console.error("[v0] [admin/orders] Query error:", fetchError)
        return NextResponse.json({ error: "Database error", details: fetchError.message }, { status: 500 })
      }

      // Filter by search query
      const searchLower = q.toLowerCase()
      const filtered = (allOrders ?? []).filter((order: any) => {
        const orderNumber = order.order_number?.toLowerCase() || ""
        const firstName = order.customer?.first_name?.toLowerCase() || ""
        const lastName = order.customer?.last_name?.toLowerCase() || ""
        const email = order.customer?.email?.toLowerCase() || ""

        return (
          orderNumber.includes(searchLower) ||
          firstName.includes(searchLower) ||
          lastName.includes(searchLower) ||
          email.includes(searchLower)
        )
      })

      // Apply pagination
      const paginated = filtered.slice(offset, offset + limit)

      console.log("[v0] [admin/orders] Fetched", paginated.length, "orders (filtered from", allOrders?.length, ")")

      const shaped = paginated.map((row: any) => ({
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
    }

    // No search query - apply pagination directly
    const { data, error } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error("[v0] [admin/orders] Query error:", error)
      return NextResponse.json({ error: "Database error", details: error.message }, { status: 500 })
    }

    console.log("[v0] [admin/orders] Fetched", data?.length || 0, "orders")

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
