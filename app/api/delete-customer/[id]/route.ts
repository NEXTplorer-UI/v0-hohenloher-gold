import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = params.id

    console.log("[v0] API: Deleting customer:", customerId)

    const supabase = createAdminClient()

    const { data, error } = await supabase.from("customers").delete().eq("id", customerId).select()

    if (error) {
      console.error("[v0] API: Error deleting customer:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 })
    }

    console.log("[v0] API: Customer deleted successfully:", data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] API: Customer delete error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
