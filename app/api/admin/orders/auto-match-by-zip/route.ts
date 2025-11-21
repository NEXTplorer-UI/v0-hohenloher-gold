import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    console.log("[v0] [auto-match-zip] Starting ZIP-based auto-matching...")

    const supabase = await createServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: locations, error: locationsError } = await supabase
      .from("pickup_locations")
      .select(`
        id, 
        name, 
        address, 
        postal_code,
        location_persons (
          person_id
        )
      `)
      .eq("is_active", true)

    if (locationsError) throw locationsError

    console.log("[v0] [auto-match-zip] Loaded locations:", locations?.length || 0)

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        customer_id,
        pickup_location,
        pickup_location_normalized,
        distribution_person_id,
        status,
        mapping_ignored
      `)
      .or("pickup_location_normalized.is.null,distribution_person_id.is.null")
      .neq("status", "cancelled")
      .or("mapping_ignored.is.null,mapping_ignored.eq.false")
      .order("created_at", { ascending: false })
      .limit(500)

    if (ordersError) throw ordersError

    console.log("[v0] [auto-match-zip] Loaded orders:", orders?.length || 0)

    if (!orders || orders.length === 0) {
      return NextResponse.json({
        success: true,
        matchCount: 0,
        matches: [],
      })
    }

    const customerIds = [...new Set(orders.map((o) => o.customer_id).filter(Boolean))]
    console.log(`[v0] [auto-match-zip] Loading ${customerIds.length} customers...`)

    const { data: customers } = await supabase
      .from("customers")
      .select("id, first_name, last_name, postal_code")
      .in("id", customerIds)

    const customerMap = new Map(customers?.map((c) => [c.id, c]) || [])

    const calculateZipDistance = (zip1: string | null, zip2: string | null): number => {
      if (!zip1 || !zip2) return 99999 // Very large distance if no ZIP

      // Extract first 2 digits for comparison
      const num1 = Number.parseInt(zip1.substring(0, 2))
      const num2 = Number.parseInt(zip2.substring(0, 2))

      if (isNaN(num1) || isNaN(num2)) return 99999

      return Math.abs(num1 - num2)
    }

    const matches: Record<
      string,
      {
        orderId: string
        orderNumber: string
        customerZip: string | null
        bestLocationId: string
        bestLocationName: string
        bestLocationAddress: string
        distributionPersonId: string | null
        distance: number
        confidence: "high" | "medium" | "low"
      }
    > = {}

    for (const order of orders) {
      const customer = customerMap.get(order.customer_id)
      const customerZip = customer?.postal_code

      if (!customerZip || !locations || locations.length === 0) {
        console.log("[v0] [auto-match-zip] Skipping order (no ZIP):", order.order_number)
        continue
      }

      let bestMatch: (typeof locations)[0] | null = null
      let bestDistance = 99999

      for (const location of locations) {
        const distance = calculateZipDistance(customerZip, location.postal_code)

        if (distance < bestDistance) {
          bestDistance = distance
          bestMatch = location
        }
      }

      if (bestMatch) {
        let confidence: "high" | "medium" | "low" = "low"
        if (bestDistance < 5) confidence = "high"
        else if (bestDistance < 20) confidence = "medium"

        const distributionPersonId = bestMatch.location_persons?.[0]?.person_id || null

        matches[order.id] = {
          orderId: order.id,
          orderNumber: order.order_number,
          customerZip,
          bestLocationId: bestMatch.id,
          bestLocationName: bestMatch.name,
          bestLocationAddress: bestMatch.address,
          distributionPersonId,
          distance: bestDistance,
          confidence,
        }

        console.log(
          `[v0] [auto-match-zip] Matched ${order.order_number}: ${customerZip} → ${bestMatch.name} (dist: ${bestDistance})`,
        )
      }
    }

    console.log(`[v0] [auto-match-zip] Total matches: ${Object.keys(matches).length}`)

    return NextResponse.json({
      success: true,
      matchCount: Object.keys(matches).length,
      matches: Object.values(matches),
    })
  } catch (error: any) {
    console.error("[v0] [auto-match-zip] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
