import { createServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function DELETE(request: NextRequest, { params }: { params: { presetId: string } }) {
  const supabase = await createServerClient()

  const { error } = await supabase.from("report_presets").delete().eq("id", params.presetId)

  if (error) {
    console.error("[report-presets] Error deleting preset:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
