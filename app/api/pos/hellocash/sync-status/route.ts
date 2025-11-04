import { NextResponse } from "next/server"
import { syncInvoiceStatus } from "@/lib/hellocash/sync-invoice-status"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orderId, token } = body

    let orderIdToSync = orderId

    // If token provided instead of orderId, look up order
    if (token && !orderId) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      const { data: order, error } = await supabase.from("orders").select("id").eq("pickup_token", token).single()

      if (error || !order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 })
      }

      orderIdToSync = order.id
    }

    if (!orderIdToSync) {
      return NextResponse.json({ error: "orderId or token required" }, { status: 400 })
    }

    // Sync invoice status
    const result = await syncInvoiceStatus(orderIdToSync)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[sync-status] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to sync status" }, { status: 500 })
  }
}
