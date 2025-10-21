import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createMovementsFromOrder } from "@/lib/inventory/movement-service"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Server: Updating order status")

    const { orderId, status, paymentStatus } = await request.json()

    if (!orderId || (!status && !paymentStatus)) {
      return NextResponse.json({ error: "Order ID and at least one status field required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: currentOrder, error: fetchError } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single()

    if (fetchError) {
      console.error("[v0] Server: Error fetching current order:", fetchError)
      return NextResponse.json({ error: "Failed to fetch current order" }, { status: 500 })
    }

    const previousStatus = currentOrder.status

    const updateData: any = {}
    if (status) updateData.status = status
    if (paymentStatus) updateData.payment_status = paymentStatus

    const { data, error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .select("*, customers(*)")
      .single()

    if (error) {
      console.error("[v0] Server: Error updating order status:", error)
      return NextResponse.json({ error: "Failed to update order status" }, { status: 500 })
    }

    console.log("[v0] Server: Order status updated successfully:", orderId)

    if (status && status !== previousStatus) {
      try {
        if (status === "confirmed" && previousStatus !== "confirmed") {
          await createMovementsFromOrder(
            currentOrder.order_number,
            currentOrder.order_items.map((item: any) => ({
              product_name: item.product_name,
              product_category: item.product_category,
              quantity: item.quantity,
              unit_price: item.unit_price,
            })),
            "Ausgang",
            "Bestellung bestätigt",
          )
          console.log(`[v0] Created outgoing inventory movements for confirmed order ${currentOrder.order_number}`)
        } else if (status === "cancelled" && previousStatus === "confirmed") {
          await createMovementsFromOrder(
            currentOrder.order_number,
            currentOrder.order_items.map((item: any) => ({
              product_name: item.product_name,
              product_category: item.product_category,
              quantity: item.quantity,
              unit_price: item.unit_price,
            })),
            "Eingang",
            "Bestellung storniert - Lager zurückgebucht",
          )
          console.log(`[v0] Created reversal inventory movements for cancelled order ${currentOrder.order_number}`)
        }
      } catch (movementError) {
        console.error(`[v0] Failed to create inventory movements for status change:`, movementError)
      }
    }

    return NextResponse.json({ success: true, order: data })
  } catch (error) {
    console.error("[v0] Server: Error in update-order-status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
