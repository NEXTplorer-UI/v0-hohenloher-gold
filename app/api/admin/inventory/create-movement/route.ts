import { type NextRequest, NextResponse } from "next/server"
import { createManualMovement } from "@/lib/inventory/movement-service"
import { requireAdmin } from "@/lib/auth/api-auth"
import { createAdminClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const { productId, qty, reason, referenceId, occurredAt } = await request.json()

    if (!productId || !qty || !reason) {
      return NextResponse.json({ error: "Product ID, quantity, and reason are required" }, { status: 400 })
    }

    console.log(`[v0] Creating manual inventory movement: Product ${productId} (${qty})`)

    const movement = await createManualMovement(
      Number.parseInt(productId),
      Number.parseInt(qty), // Already signed (positive or negative)
      reason,
      referenceId || `MANUAL-${Date.now()}`,
      authResult.user.id, // UUID from auth
      occurredAt,
    )

    const supabase = createAdminClient()

    const { data: movements, error: stockError } = await supabase
      .from("inventory_movements")
      .select("qty")
      .eq("product_id", productId)

    let newStock = 0
    if (!stockError && movements) {
      newStock = movements.reduce((sum: number, m: any) => sum + m.qty, 0)
      console.log(`[v0] Calculated new stock for product ${productId}: ${newStock}`)
    }

    await supabase.rpc("refresh_product_availability").catch((err: any) => {
      console.warn("[v0] Could not refresh product_availability view:", err.message)
    })

    return NextResponse.json({
      success: true,
      data: movement,
      newStock, // Return authoritative stock
    })
  } catch (error) {
    console.error("[v0] Error creating inventory movement:", error)
    return NextResponse.json({ error: "Failed to create inventory movement" }, { status: 500 })
  }
}
