import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin, createAdminClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const supabase = await createAdminClient()

  try {
    // Return empty array for now - send history will be tracked via Resend API in the future
    return NextResponse.json({ sends: [] })
  } catch (error) {
    console.error("[v0] Error fetching send history:", error)
    return NextResponse.json({ error: "Failed to fetch send history" }, { status: 500 })
  }
}
