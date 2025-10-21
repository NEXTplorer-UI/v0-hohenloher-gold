import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest, { params }: { params: { orderNumber: string } }) {
  try {
    const { orderNumber } = params

    if (!orderNumber) {
      return NextResponse.json({ success: false, error: "Order number is required" }, { status: 400 })
    }

    console.log("[v0] API: Fetching order details for:", orderNumber)

    const supabase = createAdminClient()

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        customers (
          first_name,
          last_name,
          email,
          phone
        ),
        order_items (
          *
        )
      `)
      .eq("order_number", orderNumber)
      .single()

    if (orderError) {
      console.error("[v0] API: Error fetching order:", orderError)
      return NextResponse.json({ success: false, error: orderError.message }, { status: 500 })
    }

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 })
    }

    console.log("[v0] API: Order details fetched successfully:", {
      orderNumber: order.order_number,
      orderTime: order.order_time,
      itemCount: order.order_items?.length || 0,
    })

    return NextResponse.json({
      success: true,
      order: order,
    })
  } catch (error) {
    console.error("[v0] API: Order fetch error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
