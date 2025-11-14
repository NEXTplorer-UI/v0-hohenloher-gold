import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "resolved"

    if (type === "resolved") {
      const { error } = await supabase.from("admin_notifications").delete().eq("is_resolved", true)

      if (error) throw error

      return NextResponse.json({ success: true, message: "Gelöste Benachrichtigungen gelöscht" })
    } else if (type === "all") {
      const { error } = await supabase
        .from("admin_notifications")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000") // Delete all

      if (error) throw error

      return NextResponse.json({ success: true, message: "Alle Benachrichtigungen gelöscht" })
    } else {
      return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("[Admin Notifications Delete] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
