import { getAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/api-auth"

export async function DELETE(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    console.log("[v0] Server: Starting to delete all customers with service role key")

    const supabase = getAdminClient()

    // Delete all customers
    const { error } = await supabase.from("customers").delete().neq("id", "00000000-0000-0000-0000-000000000000") // Delete all records

    if (error) {
      console.log("[v0] Server: Error deleting customers:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Server: Successfully deleted all customers")
    return NextResponse.json({ success: true, message: "All customers deleted successfully" })
  } catch (error) {
    console.log("[v0] Server: Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
