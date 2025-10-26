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

    console.log("[v0] Newsletter stats loaded successfully:", {
      subscribers: totalSubscribers,
      new30d: newSubscribers30d,
      new7d: newSubscribers7d,
    })

    const response = {
      subscribers: totalSubscribers,
      newSubscribers30d,
      newSubscribers7d,
      newslettersSent: 0, // TODO: Track in newsletter_campaigns table
      openRate: 0, // TODO: Track email opens
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
