import { type NextRequest, NextResponse } from "next/server"
import { createServerClient, requireAdmin } from "@/lib/supabase/server"

// PATCH endpoint to mark an order as ignored for mapping
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const supabase = await createServerClient()
    const { id } = await params

    const { data, error } = await supabase
      .from("orders")
      .update({ mapping_ignored: true })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, order: data })
  } catch (error: any) {
    console.error("[orders/ignore] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to ignore order" },
      { status: error.status || 500 }
    )
  }
}
