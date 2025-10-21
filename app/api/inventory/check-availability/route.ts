import { type NextRequest, NextResponse } from "next/server"
import { getCurrentStock } from "@/lib/inventory/movement-service"

export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json()

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 })
    }

    const availabilityResults = await Promise.all(
      items.map(async (item: { productId: number; productName: string; quantity: number }) => {
        const currentStock = await getCurrentStock(item.productId)
        const available = currentStock >= item.quantity

        return {
          productName: item.productName,
          requestedQuantity: item.quantity,
          availableStock: currentStock,
          available,
        }
      }),
    )

    const allAvailable = availabilityResults.every((result) => result.available)

    return NextResponse.json({
      available: allAvailable,
      items: availabilityResults,
    })
  } catch (error) {
    console.error("[v0] Error checking availability:", error)
    return NextResponse.json({ error: "Failed to check availability" }, { status: 500 })
  }
}
