import { type NextRequest, NextResponse } from "next/server"
import { createManualMovement } from "@/lib/inventory/movement-service"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
      user.id, // UUID from auth
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
