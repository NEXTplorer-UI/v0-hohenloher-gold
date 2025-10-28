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
    // Get newsletter send details
    const { data: send, error: sendError } = await supabase.from("newsletter_sends").select("*").eq("id", id).single()

    if (sendError) throw sendError

    // Get all email sends for this newsletter
    const { data: emailSends, error: emailsError } = await supabase
      .from("email_sends")
      .select("*")
      .eq("newsletter_send_id", id)
      .order("created_at", { ascending: false })

    if (emailsError) throw emailsError

    return NextResponse.json({
      send,
      emailSends: emailSends || [],
    })
  } catch (error) {
    console.error("[v0] Error fetching send details:", error)
    return NextResponse.json({ error: "Failed to fetch send details" }, { status: 500 })
  }
}
