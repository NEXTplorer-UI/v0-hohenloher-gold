import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const body = await request.json()
    const { inventoryRawId, qtyGrams, reason } = body

    console.log("[v0] [RAW STOCK API] Received request:", {
      inventoryRawId,
      qtyGrams,
      reason,
    })

    if (!inventoryRawId || !qtyGrams || !reason) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] [RAW STOCK API] Calling RPC update_raw_stock_grams with:", {
      raw_id: inventoryRawId,
      grams_delta: qtyGrams,
    })

    const { error: updateError } = await supabase.rpc("update_raw_stock_grams", {
      raw_id: inventoryRawId,
      grams_delta: qtyGrams,
    })

    if (updateError) {
      console.error("[v0] [RAW STOCK API] Error updating raw stock:", updateError)
      throw updateError
    }

    console.log("[v0] [RAW STOCK API] RPC call successful, creating movement record")

    const { error: movementError } = await supabase.from("inventory_movements").insert({
      inventory_raw_id: inventoryRawId,
      qty_grams: qtyGrams,
      movement_type: "raw",
      reason: reason,
      reference_id: `MANUAL-${Date.now()}`,
      occurred_at: new Date().toISOString(),
      created_by: user.id,
    })

    if (movementError) {
      console.error("[v0] [RAW STOCK API] Error creating movement:", movementError)
      throw movementError
    }

    console.log("[v0] [RAW STOCK API] Fetching updated stock value")

    const { data: updatedStock, error: fetchError } = await supabase
      .from("inventory_raw_stock")
      .select("stock_grams")
      .eq("id", inventoryRawId)
      .single()

    if (fetchError) {
      console.error("[v0] [RAW STOCK API] Error fetching updated stock:", fetchError)
      throw fetchError
    }

    console.log("[v0] [RAW STOCK API] Returning newStock:", updatedStock.stock_grams)

    return NextResponse.json({
      success: true,
      newStock: updatedStock.stock_grams,
    })
  } catch (error: any) {
    console.error("[v0] [RAW STOCK API] Error in raw-stock movement POST:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
