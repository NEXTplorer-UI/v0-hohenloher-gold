import { NextResponse } from "next/server"
import { getAdminClient } from "@/lib/supabase/admin"
import { syncInvoiceStatus } from "@/lib/hellocash/sync-invoice-status"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(req: Request) {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[cron] Starting helloCash invoice sync...")

    const supabase = getAdminClient()

    // Find orders that need syncing:
    // - payment_status = 'pending'
    // - created in last 48 hours
    // - has hellocash_invoice_id
    // - not synced in last 30 minutes (or never synced)
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, order_number, hellocash_invoice_id, pos_synced_at")
      .eq("payment_status", "pending")
      .not("hellocash_invoice_id", "is", null)
      .gte("created_at", fortyEightHoursAgo)
      .or(`pos_synced_at.is.null,pos_synced_at.lt.${thirtyMinutesAgo}`)

    if (error) {
      throw new Error(`Failed to fetch orders: ${error.message}`)
    }

    console.log(`[cron] Found ${orders?.length || 0} orders to sync`)

    if (!orders || orders.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No orders to sync",
        synced: 0,
      })
    }

    // Sync each order
    const results = await Promise.allSettled(orders.map((order) => syncInvoiceStatus(order.id)))

    const successful = results.filter((r) => r.status === "fulfilled").length
    const failed = results.filter((r) => r.status === "rejected").length

    console.log(`[cron] Sync complete: ${successful} successful, ${failed} failed`)

    return NextResponse.json({
      success: true,
      message: `Synced ${successful} orders, ${failed} failed`,
      synced: successful,
      failed,
      total: orders.length,
    })
  } catch (error: any) {
    console.error("[cron] Sync error:", error)
    return NextResponse.json({ error: error.message || "Sync failed" }, { status: 500 })
  }
}
