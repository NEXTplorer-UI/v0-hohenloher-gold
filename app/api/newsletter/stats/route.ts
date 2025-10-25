import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
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
      .select("id, email, created_at, newsletter_subscribed, newsletter_confirmed, newsletter_confirmed_at")
      .eq("newsletter_subscribed", true)
      .eq("newsletter_confirmed", true)
      .not("newsletter_confirmed_at", "is", null)

    if (subscribersError) {
      console.error("[v0] Error loading subscribers:", subscribersError)
      return NextResponse.json({ error: "Failed to load subscribers", details: subscribersError }, { status: 500 })
    }

    console.log("[v0] Found subscribers:", subscribers?.length || 0)

    // For now, we'll use placeholder data for sent newsletters and open rates
    // In a real system, you'd track these in separate tables
    const totalSubscribers = subscribers?.length || 0
    const newslettersSent = 0 // TODO: Track in newsletter_campaigns table
    const openRate = 0 // TODO: Track email opens

    console.log("[v0] Newsletter stats loaded successfully:", {
      subscribers: totalSubscribers,
      sent: newslettersSent,
      openRate: openRate,
    })

    const response = {
      subscribers: totalSubscribers,
      newslettersSent,
      openRate,
      subscribersList:
        subscribers?.map((sub) => ({
          id: sub.id,
          email: sub.email,
          subscribed_at: sub.created_at,
          source: "website",
          confirmed_at: sub.newsletter_confirmed_at,
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
