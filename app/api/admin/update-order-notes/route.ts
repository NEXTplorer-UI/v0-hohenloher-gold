import { type NextRequest, NextResponse } from "next/server"
import { getAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { orderId, adminNotes } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 })
    }

    console.log(`[v0] Updating admin notes for order ${orderId}`)

    const supabase = getAdminClient()

    const { data: order, error } = await supabase
      .from("orders")
      .update({ admin_notes: adminNotes })
      .eq("id", orderId)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating admin notes:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[v0] Admin notes updated successfully for order ${orderId}`)

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error("[v0] Error in update-order-notes:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
