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
      .select("product_id, inventory_raw_id, qty, qty_grams")
      .order("occurred_at", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching inventory movements:", error)
      throw error
    }

    console.log(`[v0] Found ${movements?.length || 0} inventory movements`)

    const stockMap = new Map<number, number>()
    const rawStockMap = new Map<number, number>()

    movements?.forEach((movement) => {
      if (movement.product_id) {
        const existing = stockMap.get(movement.product_id) || 0
        stockMap.set(movement.product_id, existing + movement.qty)
      }

      if (movement.inventory_raw_id && movement.qty_grams) {
        const existing = rawStockMap.get(movement.inventory_raw_id) || 0
        rawStockMap.set(movement.inventory_raw_id, existing + movement.qty_grams)
      }
    })

    const currentStock = Array.from(stockMap.entries()).map(([id, stock]) => ({
      id,
      stock,
    }))

    const rawStock = Array.from(rawStockMap.entries()).map(([id, stock_grams]) => ({
      id,
      stock_grams,
    }))

    console.log(
      `[v0] Calculated current stock for ${currentStock.length} products and ${rawStock.length} raw stock groups`,
    )

    return NextResponse.json(
      {
        success: true,
        data: currentStock,
        rawStock: rawStock,
        totalProducts: currentStock.length,
        totalRawStockGroups: rawStock.length,
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
