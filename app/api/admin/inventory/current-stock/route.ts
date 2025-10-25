import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/api-auth"

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    console.log("[v0] Loading current inventory stock from database...")

    const supabase = createAdminClient()

    const { data: movements, error } = await supabase
      .from("inventory_movements")
      .select("product_id, qty")
      .order("occurred_at", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching inventory movements:", error)
      throw error
    }

    console.log(`[v0] Found ${movements?.length || 0} inventory movements`)

    const stockMap = new Map<number, number>()

    movements?.forEach((movement) => {
      const existing = stockMap.get(movement.product_id) || 0
      stockMap.set(movement.product_id, existing + movement.qty)
    })

    const currentStock = Array.from(stockMap.entries()).map(([id, stock]) => ({
      id,
      stock, // Return actual stock including negatives
    }))

    console.log(`[v0] Calculated current stock for ${currentStock.length} products`)

    return NextResponse.json(
      {
        success: true,
        data: currentStock,
        totalProducts: currentStock.length,
        totalMovements: movements?.length || 0,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    )
  } catch (error) {
    console.error("[v0] Error calculating current stock:", error)
    return NextResponse.json({ error: "Failed to calculate current stock" }, { status: 500 })
  }
}
