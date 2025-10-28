import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin, createAdminClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const supabase = await createAdminClient()

  try {
    // Get newsletter sends with email send details
    const { data: sends, error } = await supabase
      .from("newsletter_sends")
      .select(
        `
        id,
        subject,
        recipient_count,
        sent_at,
        created_at
      `,
      )
      .order("sent_at", { ascending: false })
      .limit(50)

    if (error) throw error

    // Get email send stats for each newsletter
    const sendsWithStats = await Promise.all(
      (sends || []).map(async (send) => {
        const { data: emailSends } = await supabase
          .from("email_sends")
          .select("status")
          .eq("newsletter_send_id", send.id)

        const stats = {
          sent: emailSends?.filter((e) => e.status === "sent").length || 0,
          failed: emailSends?.filter((e) => e.status === "failed").length || 0,
          pending: emailSends?.filter((e) => e.status === "pending").length || 0,
        }

        return {
          ...send,
          stats,
        }
      }),
    )

    return NextResponse.json({ sends: sendsWithStats })
  } catch (error) {
    console.error("[v0] Error fetching send history:", error)
    return NextResponse.json({ error: "Failed to fetch send history" }, { status: 500 })
  }
}
