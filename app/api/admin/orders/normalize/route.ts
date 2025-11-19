import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  console.log("[v0] [normalize] ===== API ROUTE HIT =====")
  
  try {
    const { searchParams } = new URL(request.url)
    const includeIgnored = searchParams.get('includeIgnored') === 'true'
    console.log("[v0] [normalize] includeIgnored:", includeIgnored)
    
    console.log("[v0] [normalize] Step 1: Creating server client...")
    const supabase = await createServerClient()
    
    console.log("[v0] [normalize] Step 2: Checking authentication...")
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log("[v0] [normalize] No user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.log("[v0] [normalize] User authenticated:", user.id)

    console.log("[v0] [normalize] Step 3: Checking admin role...")
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      console.log("[v0] [normalize] User is not admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.log("[v0] [normalize] User is admin")
    
    console.log("[v0] [normalize] Step 4: Starting database query...")
    
    let query = supabase
      .from("orders")
      .select(`
        id,
        order_number,
        customer_id,
        pickup_location,
        pickup_location_normalized,
        distribution_person_id,
        pickup_date,
        notes,
        status,
        mapping_ignored
      `)
      .or("pickup_location_normalized.is.null,distribution_person_id.is.null")
      .neq("status", "cancelled")
    
    if (!includeIgnored) {
      query = query.or("mapping_ignored.is.null,mapping_ignored.eq.false")
    }
    
    const { data: orders, error } = await query
      .order("created_at", { ascending: false })
      .limit(500)

    console.log("[v0] [normalize] Step 5: Query completed")

    if (error) {
      console.error("[v0] [normalize] Database error:", error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log(`[v0] [normalize] Step 6: Found ${orders?.length || 0} orders`)

    if (orders && orders.length > 0) {
      const customerIds = [...new Set(orders.map(o => o.customer_id).filter(Boolean))]
      console.log(`[v0] [normalize] Step 7: Loading ${customerIds.length} customers...`)
      
      const { data: customers } = await supabase
        .from("customers")
        .select("id, first_name, last_name, email, phone")
        .in("id", customerIds)

      if (customers) {
        const customerMap = new Map(customers.map(c => [c.id, c]))
        orders.forEach(order => {
          const customer = customerMap.get(order.customer_id)
          if (customer) {
            (order as any).customers = {
              name: `${customer.first_name} ${customer.last_name}`.trim(),
              email: customer.email,
            }
          }
        })
        console.log("[v0] [normalize] Step 8: Customer data attached")
      }
    }

    console.log("[v0] [normalize] Step 9: Returning response")
    return NextResponse.json({ orders: orders || [] })
    
  } catch (error: any) {
    console.error("[v0] [normalize] CRITICAL ERROR:", error)
    console.error("[v0] [normalize] Error stack:", error?.stack)
    console.error("[v0] [normalize] Error message:", error?.message)
    
    return NextResponse.json(
      { 
        error: error?.message || "Failed to fetch orders for normalization",
        details: error?.stack || "No stack trace available"
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    
    const body = await request.json()
    
    const {
      orderIds,
      normalizedLocation,
      canonicalLocationId,
      distributionPersonId,
      createMapping,
    } = body

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: "orderIds array is required" },
        { status: 400 }
      )
    }

    console.log(`[v0] [normalize] Updating ${orderIds.length} orders...`)

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        pickup_location_normalized: normalizedLocation,
        distribution_person_id: distributionPersonId || null,
      })
      .in("id", orderIds)

    if (updateError) throw updateError

    if (createMapping && canonicalLocationId) {
      const { data: firstOrder } = await supabase
        .from("orders")
        .select("pickup_location")
        .eq("id", orderIds[0])
        .single()

      if (firstOrder?.pickup_location) {
        await supabase
          .from("pickup_location_mappings")
          .insert({
            variant: firstOrder.pickup_location,
            canonical_location_id: canonicalLocationId,
          })
          .select()
          .then(({ error }) => {
            if (error && !error.message.includes("duplicate key")) {
              console.error("[v0] [normalize] Mapping creation error:", error)
            }
          })
      }
    }

    console.log(`[v0] [normalize] Successfully updated ${orderIds.length} orders`)

    return NextResponse.json({ success: true, updatedCount: orderIds.length })
  } catch (error: any) {
    console.error("[v0] [normalize] Error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to normalize orders" },
      { status: 500 }
    )
  }
}
