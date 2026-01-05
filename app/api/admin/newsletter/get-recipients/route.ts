import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/api-auth"

export async function POST(request: Request) {
  try {
    // Check authentication
    await requireAdmin(request)

    const body = await request.json()
    const { filters } = body

    const supabase = createAdminClient()

    // Start with base query
    let query = supabase.from("customers").select("id, email, first_name, last_name")

    // Apply consent filters (if not all customers)
    if (!filters.allCustomers) {
      const consentFilters = []
      if (filters.newsletterConsent) consentFilters.push("newsletter_subscribed.eq.true")
      if (filters.marketingConsent) consentFilters.push("marketing_consent.eq.true")
      if (filters.reminderConsent) consentFilters.push("reminder_notifications.eq.true")

      if (consentFilters.length === 0) {
        console.log("[v0] No consents selected, returning 0")
        return NextResponse.json({ recipients: [] })
      }

      // Apply OR logic for consents
      query = query.or(consentFilters.join(",")).not("email", "is", null).neq("email", "")
    } else {
      query = query.not("email", "is", null).neq("email", "")
    }

    const { data: customers, error } = await query

    if (error) {
      console.error("[v0] Error fetching customers:", error)
      return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
    }

    let recipients = customers || []
    console.log("[v0] Found customers matching consent filters:", recipients.length)

    // Filter by active orders if needed
    if (filters.activeOrdersOnly) {
      const { data: ordersData } = await supabase
        .from("orders")
        .select("customer_id")
        .in("status", filters.orderStatuses || ["confirmed", "ready_for_pickup"])
        .in(
          "customer_id",
          recipients.map((c: any) => c.id),
        )

      const customerIdsWithOrders = new Set(ordersData?.map((o: any) => o.customer_id) || [])
      recipients = recipients.filter((c: any) => customerIdsWithOrders.has(c.id))
      console.log("[v0] After active orders filter:", recipients.length)
    }

    // Filter by pickup locations if specified
    if (filters.pickupLocationNames && filters.pickupLocationNames.length > 0) {
      const normalizedNames = filters.pickupLocationNames.map((name: string) =>
        name.trim().toLowerCase().split(",")[0].trim(),
      )

      const { data: matchingOrders } = await supabase
        .from("orders")
        .select("customer_id, pickup_location_normalized, pickup_location_id, pickup_locations(name)")
        .in(
          "customer_id",
          recipients.map((c: any) => c.id),
        )

      if (matchingOrders) {
        const customerIdsWithMatchingLocations = new Set<string>()

        matchingOrders.forEach((order: any) => {
          // Try to match via JOIN first (if pickup_location_id is correct)
          if (order.pickup_locations?.name) {
            const locationName = order.pickup_locations.name.trim().toLowerCase().split(",")[0].trim()
            if (normalizedNames.includes(locationName)) {
              customerIdsWithMatchingLocations.add(order.customer_id)
            }
          }

          // Fallback: match via pickup_location_normalized
          if (order.pickup_location_normalized) {
            const normalizedLocation = order.pickup_location_normalized.trim().toLowerCase().split(",")[0].trim()
            if (normalizedNames.includes(normalizedLocation)) {
              customerIdsWithMatchingLocations.add(order.customer_id)
            }
          }
        })

        recipients = recipients.filter((c: any) => customerIdsWithMatchingLocations.has(c.id))
        console.log("[v0] After pickup location filter:", recipients.length)
      }
    }

    // Filter by distribution persons if specified
    if (filters.distributionPersonIds && filters.distributionPersonIds.length > 0) {
      const { data: matchingOrders } = await supabase
        .from("orders")
        .select("customer_id")
        .in("distribution_person_id", filters.distributionPersonIds)
        .in(
          "customer_id",
          recipients.map((c: any) => c.id),
        )

      const { data: matchingCustomers } = await supabase
        .from("customers")
        .select("id")
        .in("default_distribution_person_id", filters.distributionPersonIds)
        .in(
          "id",
          recipients.map((c: any) => c.id),
        )

      const customerIdsWithMatchingDistribution = new Set<string>()
      matchingOrders?.forEach((o: any) => customerIdsWithMatchingDistribution.add(o.customer_id))
      matchingCustomers?.forEach((c: any) => customerIdsWithMatchingDistribution.add(c.id))

      recipients = recipients.filter((c: any) => customerIdsWithMatchingDistribution.has(c.id))
      console.log("[v0] After distribution person filter:", recipients.length)
    }

    console.log("[v0] Final recipients count:", recipients.length)

    return NextResponse.json({ recipients })
  } catch (error: any) {
    console.error("[v0] Error in get-recipients:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
