import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/auth/api-auth"

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    console.log("[v0] Loading newsletter statistics...")

    const supabase = createAdminClient()

    const { data: subscribers, error: subscribersError } = await supabase
      .from("newsletter_subscribers")
      .select("id, email, subscribed_at, source, confirmed_at")
      .eq("is_active", true)
      .not("confirmed_at", "is", null)

    if (subscribersError) {
      console.error("[v0] Error loading subscribers:", subscribersError)
      return NextResponse.json({ error: "Failed to load subscribers" }, { status: 500 })
    }

    // For now, we'll use placeholder data for sent newsletters and open rates
    // In a real system, you'd track these in separate tables
    const totalSubscribers = subscribers?.length || 0
    const newslettersSent = 0 // TODO: Track in newsletter_campaigns table
    const openRate = 0 // TODO: Track email opens

    console.log("[v0] Newsletter stats loaded:", {
      subscribers: totalSubscribers,
      sent: newslettersSent,
      openRate: openRate,
    })

    return NextResponse.json({
      subscribers: totalSubscribers,
      newslettersSent,
      openRate,
      subscribersList: subscribers || [],
    })
  } catch (error) {
    console.error("[v0] Newsletter stats API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
