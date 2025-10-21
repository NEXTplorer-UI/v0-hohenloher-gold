import { type NextRequest, NextResponse } from "next/server"
import { createManualMovement } from "@/lib/inventory/movement-service"
import { requireAdmin } from "@/lib/auth/api-auth"

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

    return NextResponse.json({
      success: true,
      data: movement,
    })
  } catch (error) {
    console.error("[v0] Error creating inventory movement:", error)
    return NextResponse.json({ error: "Failed to create inventory movement" }, { status: 500 })
  }
}
