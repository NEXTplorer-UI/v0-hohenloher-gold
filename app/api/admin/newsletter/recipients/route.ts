import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/api-auth"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)

    const body = await request.json()
    const { filters } = body

    console.log("[v0] Recipient filters:", filters)

    const supabase = createAdminClient()

    // Build query based on filters
    let query = supabase.from("customers").select("id", { count: "exact", head: true })

    // Always require valid email
    query = query.not("email", "is", null).neq("email", "")

    if (!filters.allCustomers) {
      // Build OR conditions for consents
      const orConditions: string[] = []

      if (filters.newsletterConsent) {
        orConditions.push("newsletter_subscribed.eq.true,newsletter_confirmed.eq.true")
      }
      if (filters.marketingConsent) {
        orConditions.push("marketing_consent.eq.true")
      }
      if (filters.reminderConsent) {
        orConditions.push("reminder_notifications.eq.true")
      }

      // If no consents are selected, return 0
      if (orConditions.length === 0) {
        console.log("[v0] No consents selected, returning 0")
        return NextResponse.json({ count: 0 })
      }

      // Apply OR filter for consents
      query = query.or(orConditions.join(","))
    }

    const { count, error } = await query

    if (error) {
      console.error("[v0] Error fetching recipient count:", error)
      return NextResponse.json({ error: "Failed to fetch recipient count", count: 0 }, { status: 500 })
    }

    console.log("[v0] Found recipients:", count)

    return NextResponse.json({ count: count || 0 })
  } catch (error) {
    console.error("[v0] Error fetching recipient count:", error)
    return NextResponse.json({ error: "Failed to load recipient count", count: 0 }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const allCustomers = searchParams.get("allCustomers") === "true"
    const newsletterConsent = searchParams.get("newsletterConsent") === "true"
    const marketingConsent = searchParams.get("marketingConsent") === "true"
    const reminderConsent = searchParams.get("reminderConsent") === "true"

    const supabase = createAdminClient()

    // Build query based on filters
    let query = supabase.from("customers").select("id", { count: "exact", head: true })

    // Always require valid email
    query = query.not("email", "is", null).neq("email", "")

    if (!allCustomers) {
      // Build OR conditions for consents
      const orConditions: string[] = []

      if (newsletterConsent) {
        orConditions.push("newsletter_subscribed.eq.true,newsletter_confirmed.eq.true")
      }
      if (marketingConsent) {
        orConditions.push("marketing_consent.eq.true")
      }
      if (reminderConsent) {
        orConditions.push("reminder_notifications.eq.true")
      }

      // If no consents are selected, return 0
      if (orConditions.length === 0) {
        return NextResponse.json({ count: 0 })
      }

      // Apply OR filter for consents
      query = query.or(orConditions.join(","))
    }

    const { count, error } = await query

    if (error) {
      console.error("[v0] Error fetching recipient count:", error)
      return NextResponse.json({ error: "Failed to fetch recipient count", count: 0 }, { status: 500 })
    }

    return NextResponse.json({ count: count || 0 })
  } catch (error) {
    console.error("[v0] Error fetching recipient count:", error)
    return NextResponse.json({ error: "Failed to load recipient count", count: 0 }, { status: 500 })
  }
}
