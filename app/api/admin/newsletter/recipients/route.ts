import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/api-auth"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface RecipientFilters {
  allCustomers: boolean
  newsletterConsent: boolean
  marketingConsent: boolean
  reminderConsent: boolean
  pickupLocationNames?: string[]
  distributionPersonIds?: string[]
  activeOrdersOnly?: boolean
  orderStatuses?: string[]
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)

    const body = await request.json()
    const filters: RecipientFilters = body.filters

    console.log("[v0] Recipient filters:", filters)

    const supabase = createAdminClient()

    let query = supabase.from("customers").select("id, email", { count: "exact" })

    query = query.not("email", "is", null).neq("email", "")

    if (!filters.allCustomers) {
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

      if (orConditions.length === 0) {
        console.log("[v0] No consents selected, returning 0")
        return NextResponse.json({ count: 0 })
      }

      query = query.or(orConditions.join(","))
    }

    const { data: customers, error: customersError } = await query

    if (customersError) {
      console.error("[v0] Error fetching customers:", customersError)
      return NextResponse.json({ error: "Failed to fetch customers", count: 0 }, { status: 500 })
    }

    if (!customers || customers.length === 0) {
      return NextResponse.json({ count: 0 })
    }

    let customerIds = customers.map((c) => c.id)

    if (filters.pickupLocationNames && filters.pickupLocationNames.length > 0) {
      const { data: pickupOrders, error: pickupError } = await supabase
        .from("orders")
        .select("customer_id, pickup_location_id, pickup_location_normalized")
        .in("customer_id", customerIds)

      if (pickupError) {
        console.error("[v0] Error fetching pickup orders:", pickupError)
        return NextResponse.json({ error: "Failed to filter by pickup location", count: 0 }, { status: 500 })
      }

      const matchingCustomerIds = new Set<string>()

      pickupOrders?.forEach((order) => {
        const normalizedName = order.pickup_location_normalized?.split(",")[0]?.trim() || ""

        if (filters.pickupLocationNames?.some((name) => name.trim().toLowerCase() === normalizedName.toLowerCase())) {
          matchingCustomerIds.add(order.customer_id)
        }
      })

      customerIds = customerIds.filter((id) => matchingCustomerIds.has(id))

      if (customerIds.length === 0) {
        return NextResponse.json({ count: 0 })
      }
    }

    if (filters.distributionPersonIds && filters.distributionPersonIds.length > 0) {
      const { data: personOrders, error: personError } = await supabase
        .from("orders")
        .select("customer_id")
        .in("customer_id", customerIds)
        .in("distribution_person_id", filters.distributionPersonIds)

      if (personError) {
        console.error("[v0] Error fetching distribution person orders:", personError)
        return NextResponse.json({ error: "Failed to filter by distribution person", count: 0 }, { status: 500 })
      }

      const matchingCustomerIds = new Set(personOrders?.map((o) => o.customer_id) || [])

      const { data: defaultPersonCustomers } = await supabase
        .from("customers")
        .select("id")
        .in("id", customerIds)
        .in("default_distribution_person_id", filters.distributionPersonIds)

      defaultPersonCustomers?.forEach((c) => matchingCustomerIds.add(c.id))

      customerIds = customerIds.filter((id) => matchingCustomerIds.has(id))

      if (customerIds.length === 0) {
        return NextResponse.json({ count: 0 })
      }
    }

    if (filters.activeOrdersOnly) {
      const statusesToCheck =
        filters.orderStatuses && filters.orderStatuses.length > 0 ? filters.orderStatuses : ["confirmed", "ready"]

      const { data: activeOrders, error: ordersError } = await supabase
        .from("orders")
        .select("customer_id")
        .in("customer_id", customerIds)
        .in("status", statusesToCheck)
        .neq("payment_status", "cancelled")

      if (ordersError) {
        console.error("[v0] Error fetching active orders:", ordersError)
        return NextResponse.json({ error: "Failed to filter by active orders", count: 0 }, { status: 500 })
      }

      const matchingCustomerIds = new Set(activeOrders?.map((o) => o.customer_id) || [])
      customerIds = customerIds.filter((id) => matchingCustomerIds.has(id))

      if (customerIds.length === 0) {
        return NextResponse.json({ count: 0 })
      }
    }

    console.log("[v0] Found recipients:", customerIds.length)

    return NextResponse.json({ count: customerIds.length })
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
    const pickupLocationNames = searchParams.getAll("pickupLocationNames")
    const distributionPersonIds = searchParams.getAll("distributionPersonIds")
    const activeOrdersOnly = searchParams.get("activeOrdersOnly") === "true"
    const orderStatuses = searchParams.getAll("orderStatuses")

    const filters: RecipientFilters = {
      allCustomers: allCustomers,
      newsletterConsent: newsletterConsent,
      marketingConsent: marketingConsent,
      reminderConsent: reminderConsent,
      pickupLocationNames: pickupLocationNames.length > 0 ? pickupLocationNames : undefined,
      distributionPersonIds: distributionPersonIds.length > 0 ? distributionPersonIds : undefined,
      activeOrdersOnly: activeOrdersOnly,
      orderStatuses: orderStatuses.length > 0 ? orderStatuses : undefined,
    }

    console.log("[v0] Recipient filters:", filters)

    const supabase = createAdminClient()

    let query = supabase.from("customers").select("id, email", { count: "exact" })

    query = query.not("email", "is", null).neq("email", "")

    if (!filters.allCustomers) {
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

      if (orConditions.length === 0) {
        console.log("[v0] No consents selected, returning 0")
        return NextResponse.json({ count: 0 })
      }

      query = query.or(orConditions.join(","))
    }

    const { data: customers, error: customersError } = await query

    if (customersError) {
      console.error("[v0] Error fetching customers:", customersError)
      return NextResponse.json({ error: "Failed to fetch customers", count: 0 }, { status: 500 })
    }

    if (!customers || customers.length === 0) {
      return NextResponse.json({ count: 0 })
    }

    let customerIds = customers.map((c) => c.id)

    if (filters.pickupLocationNames && filters.pickupLocationNames.length > 0) {
      const { data: pickupOrders, error: pickupError } = await supabase
        .from("orders")
        .select("customer_id, pickup_location_id, pickup_location_normalized")
        .in("customer_id", customerIds)

      if (pickupError) {
        console.error("[v0] Error fetching pickup orders:", pickupError)
        return NextResponse.json({ error: "Failed to filter by pickup location", count: 0 }, { status: 500 })
      }

      const matchingCustomerIds = new Set<string>()

      pickupOrders?.forEach((order) => {
        const normalizedName = order.pickup_location_normalized?.split(",")[0]?.trim() || ""

        if (filters.pickupLocationNames?.some((name) => name.trim().toLowerCase() === normalizedName.toLowerCase())) {
          matchingCustomerIds.add(order.customer_id)
        }
      })

      customerIds = customerIds.filter((id) => matchingCustomerIds.has(id))

      if (customerIds.length === 0) {
        return NextResponse.json({ count: 0 })
      }
    }

    if (filters.distributionPersonIds && filters.distributionPersonIds.length > 0) {
      const { data: personOrders, error: personError } = await supabase
        .from("orders")
        .select("customer_id")
        .in("customer_id", customerIds)
        .in("distribution_person_id", filters.distributionPersonIds)

      if (personError) {
        console.error("[v0] Error fetching distribution person orders:", personError)
        return NextResponse.json({ error: "Failed to filter by distribution person", count: 0 }, { status: 500 })
      }

      const matchingCustomerIds = new Set(personOrders?.map((o) => o.customer_id) || [])

      const { data: defaultPersonCustomers } = await supabase
        .from("customers")
        .select("id")
        .in("id", customerIds)
        .in("default_distribution_person_id", filters.distributionPersonIds)

      defaultPersonCustomers?.forEach((c) => matchingCustomerIds.add(c.id))

      customerIds = customerIds.filter((id) => matchingCustomerIds.has(id))

      if (customerIds.length === 0) {
        return NextResponse.json({ count: 0 })
      }
    }

    if (filters.activeOrdersOnly) {
      const statusesToCheck =
        filters.orderStatuses && filters.orderStatuses.length > 0 ? filters.orderStatuses : ["confirmed", "ready"]

      const { data: activeOrders, error: ordersError } = await supabase
        .from("orders")
        .select("customer_id")
        .in("customer_id", customerIds)
        .in("status", statusesToCheck)
        .neq("payment_status", "cancelled")

      if (ordersError) {
        console.error("[v0] Error fetching active orders:", ordersError)
        return NextResponse.json({ error: "Failed to filter by active orders", count: 0 }, { status: 500 })
      }

      const matchingCustomerIds = new Set(activeOrders?.map((o) => o.customer_id) || [])
      customerIds = customerIds.filter((id) => matchingCustomerIds.has(id))

      if (customerIds.length === 0) {
        return NextResponse.json({ count: 0 })
      }
    }

    console.log("[v0] Found recipients:", customerIds.length)

    return NextResponse.json({ count: customerIds.length })
  } catch (error) {
    console.error("[v0] Error fetching recipient count:", error)
    return NextResponse.json({ error: "Failed to load recipient count", count: 0 }, { status: 500 })
  }
}
