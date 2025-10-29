import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/api-auth"
import { APIError } from "@/lib/errors/api-errors"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: NextRequest) {
  console.log("[v0] Newsletter stats API called")

  try {
    console.log("[v0] Newsletter stats: Checking authentication...")
    await requireAdmin(request)
    console.log("[v0] Newsletter stats: Authentication successful")

    console.log("[v0] Loading newsletter statistics...")

    const supabase = createAdminClient()

    console.log("[v0] Querying customers table for newsletter subscribers...")
    const { data: subscribers, error: subscribersError } = await supabase
      .from("customers")
      .select("id, email, created_at, newsletter_subscribed")
      .eq("newsletter_subscribed", true)

    if (subscribersError) {
      console.error("[v0] Error loading subscribers:", subscribersError)
      return NextResponse.json({ error: "Failed to load subscribers", details: subscribersError }, { status: 500 })
    }

    console.log("[v0] Found subscribers:", subscribers?.length || 0)

    // Calculate stats
    const totalSubscribers = subscribers?.length || 0

    // Calculate new subscribers in last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const newSubscribers30d = subscribers?.filter((sub) => new Date(sub.created_at) >= thirtyDaysAgo).length || 0

    // Calculate new subscribers in last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const newSubscribers7d = subscribers?.filter((sub) => new Date(sub.created_at) >= sevenDaysAgo).length || 0

    const { data: emailStats, error: emailStatsError } = await supabase.from("email_sends").select("*")

    let openRate = 0
    let clickRate = 0
    let bounceRate = 0

    if (!emailStatsError && emailStats && emailStats.length > 0) {
      const totalSent = emailStats.filter((e) => e.status === "sent").length
      const totalOpened = emailStats.filter((e) => e.opened_at !== null).length
      const totalClicked = emailStats.filter((e) => e.clicked_at !== null).length
      const totalBounced = emailStats.filter((e) => e.bounced_at !== null).length

      if (totalSent > 0) {
        openRate = Math.round((totalOpened / totalSent) * 100)
        clickRate = Math.round((totalClicked / totalSent) * 100)
        bounceRate = Math.round((totalBounced / totalSent) * 100)
      }

      console.log("[v0] Email tracking stats:", {
        totalSent,
        totalOpened,
        totalClicked,
        totalBounced,
        openRate,
        clickRate,
        bounceRate,
      })
    }

    const { data: newsletterSends, error: newsletterSendsError } = await supabase
      .from("newsletter_sends")
      .select("id")
      .eq("status", "completed")

    const newslettersSent = newsletterSends?.length || 0

    console.log("[v0] Newsletter stats loaded successfully:", {
      subscribers: totalSubscribers,
      new30d: newSubscribers30d,
      new7d: newSubscribers7d,
      newslettersSent,
      openRate,
      clickRate,
    })

    const response = {
      subscribers: totalSubscribers,
      newSubscribers30d,
      newSubscribers7d,
      newslettersSent,
      openRate,
      clickRate,
      bounceRate,
      subscribersList:
        subscribers?.map((sub) => ({
          id: sub.id,
          email: sub.email,
          subscribed_at: sub.created_at,
          source: "website",
        })) || [],
    }

    console.log("[v0] Returning newsletter stats response")
    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] Newsletter stats API error:", error)

    if (error instanceof APIError) {
      console.error("[v0] Newsletter stats API error:", error.message, "Status:", error.statusCode)
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details },
        { status: error.statusCode },
      )
    }

    console.error("[v0] Newsletter stats unexpected error:", error instanceof Error ? error.message : String(error))
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}
