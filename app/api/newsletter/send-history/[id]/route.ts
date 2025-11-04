import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin, createAdminClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { id } = await params
  const supabase = await createAdminClient()

  try {
    // Return empty data for now - send details will be tracked via Resend API in the future
    return NextResponse.json({
      send: null,
      emailSends: [],
    })
  } catch (error) {
    console.error("[v0] Error fetching send details:", error)
    return NextResponse.json({ error: "Failed to fetch send details" }, { status: 500 })
  }
}
