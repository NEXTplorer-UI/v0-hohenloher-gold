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

    console.log("[v0] [admin/orders] Fetching orders directly from database...")

    // Build the query
    let query = supabase
      .from("orders")
      .select(`
        id,
        order_number,
        customer_id,
        status,
        total,
        delivery_method,
        pickup_location,
        payment_method,
        payment_status,
        notes,
        created_at,
        qr_code_url,
        customers:customer_id (
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply status filter
    if (status && status !== "all") {
      const dbStatus = status === "picked_up" ? "completed" : status
      query = query.eq("status", dbStatus)
    }

    // Apply search filter
    if (q) {
      query = query.or(
        `order_number.ilike.%${q}%,customers.first_name.ilike.%${q}%,customers.last_name.ilike.%${q}%,customers.email.ilike.%${q}%`,
      )
    }

    const { data: ordersData, error: ordersError } = await query

    if (ordersError) {
      console.error("[v0] [admin/orders] Orders fetch error:", ordersError)
      return NextResponse.json({ error: "Database error", details: ordersError.message }, { status: 500 })
    }

    console.log("[v0] [admin/orders] Fetched", ordersData?.length || 0, "orders")

    // Fetch order items for each order
    const orderIds = (ordersData ?? []).map((o: any) => o.id)
    const { data: itemsData, error: itemsError } = await supabase
      .from("order_items")
      .select("*")
      .in("order_id", orderIds)

    if (itemsError) {
      console.error("[v0] [admin/orders] Order items fetch error:", itemsError)
    }

    // Group items by order_id
    const itemsByOrderId = (itemsData ?? []).reduce((acc: any, item: any) => {
      if (!acc[item.order_id]) {
        acc[item.order_id] = []
      }
      acc[item.order_id].push({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      })
      return acc
    }, {})

    const withQR = (ordersData ?? []).filter((row: any) => row.qr_code_url)
    const withoutQR = (ordersData ?? []).filter((row: any) => !row.qr_code_url)
    console.log("[v0] [admin/orders] Orders with qr_code_url:", withQR.length)
    console.log("[v0] [admin/orders] Orders without qr_code_url:", withoutQR.length)

    const shaped = (ordersData ?? []).map((row: any) => ({
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
      customer: row.customers ?? { first_name: "", last_name: "", email: "", phone: null },
      order_items: itemsByOrderId[row.id] ?? [],
    }))

    console.log("[v0] [admin/orders] Successfully shaped orders")
    return NextResponse.json(shaped, { status: 200 })
  } catch (e: any) {
    console.error("[v0] [admin/orders] Unexpected:", e)
    return NextResponse.json({ error: "Server error", details: e?.message }, { status: 500 })
  }
}
