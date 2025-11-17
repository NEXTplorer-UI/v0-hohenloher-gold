import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { assignments } = await request.json()

    if (!Array.isArray(assignments)) {
      return NextResponse.json({ error: "Invalid assignments format" }, { status: 400 })
    }

    const updates = await Promise.all(
      assignments.map(async (assignment: { product_id: number; inventory_raw_id: number | null }) => {
        const { error } = await supabase
          .from("products")
          .update({ 
            inventory_raw_id: assignment.inventory_raw_id,
            is_raw_stock_managed: assignment.inventory_raw_id !== null
          })
          .eq("id", assignment.product_id)

        if (error) {
          console.error(`Error updating product ${assignment.product_id}:`, error)
          return { success: false, product_id: assignment.product_id, error: error.message }
        }

        return { success: true, product_id: assignment.product_id }
      })
    )

    const successCount = updates.filter(u => u.success).length
    const failures = updates.filter(u => !u.success)

    return NextResponse.json({
      success: successCount > 0,
      message: `${successCount} Produkt(e) erfolgreich zugeordnet`,
      updated: successCount,
      failures: failures
    })
  } catch (error) {
    console.error("Error assigning products:", error)
    return NextResponse.json(
      { error: "Fehler beim Zuordnen der Produkte" },
      { status: 500 }
    )
  }
}
