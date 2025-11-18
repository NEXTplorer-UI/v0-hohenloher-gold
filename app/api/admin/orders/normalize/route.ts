import { NextResponse } from "next"
import { requireAdmin } from "@/lib/supabase/server"
import { getAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  console.log("[v0] [normalize-api] === API ROUTE HIT ===")
  
  try {
    console.log("[v0] [normalize-api] Step 1: Starting...")
    
    const adminClient = await requireAdmin()
    console.log("[v0] [normalize-api] Step 2: Admin check passed")

    const supabase = getAdminClient()
    console.log("[v0] [normalize-api] Step 3: Got admin client")

    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, order_number, pickup_location, pickup_location_normalized, distribution_person_id, notes, status")
      .is("pickup_location_normalized", null)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(100)

    console.log("[v0] [normalize-api] Step 4: Query executed", { 
      ordersCount: orders?.length || 0,
      hasError: !!error 
    })

    if (error) {
      console.error("[v0] [normalize-api] Query error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] [normalize-api] Step 5: Returning response with", orders?.length, "orders")
    return NextResponse.json({ 
      orders: orders || [],
      count: orders?.length || 0 
    })
    
  } catch (error: any) {
    console.error("[v0] [normalize-api] CATCH BLOCK:", error.message)
    console.error("[v0] [normalize-api] Stack:", error.stack)
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
    
    const supabase = getAdminClient()
    
    const body = await request.json()
    
    const {
      orderIds,
      normalizedLocation,
      pickupLocationId,
      distributionPersonId,
      createMapping,
    } = body

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: "orderIds array is required" },
        { status: 400 }
      )
    }

    console.log(`[v0] [normalize-api] Updating ${orderIds.length} orders...`)

    // Update orders
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        pickup_location_normalized: normalizedLocation,
        pickup_location_id: pickupLocationId,
        distribution_person_id: distributionPersonId || null,
      })
      .in("id", orderIds)

    if (updateError) throw updateError

    // Create mapping if requested
    if (createMapping && normalizedLocation && pickupLocationId) {
      // Get the first order to extract the variant
      const { data: firstOrder } = await supabase
        .from("orders")
        .select("pickup_location")
        .eq("id", orderIds[0])
        .single()

      if (firstOrder?.pickup_location) {
        // Try to insert, ignore if already exists
        await supabase
          .from("pickup_location_mappings")
          .insert({
            variant: firstOrder.pickup_location,
            pickup_location_id: pickupLocationId,
            distribution_person_id: distributionPersonId || null,
          })
          .select()
          // Ignore duplicate key errors
          .then(({ error }) => {
            if (error && !error.message.includes("duplicate key")) {
              console.error("[v0] [normalize-api] Mapping creation error:", error)
            }
          })
      }
    }

    console.log(`[v0] [normalize-api] Successfully updated ${orderIds.length} orders`)

    return NextResponse.json({ success: true, updatedCount: orderIds.length })
  } catch (error: any) {
    console.error("[v0] [normalize-api] Error:", error)
    console.error("[v0] [normalize-api] Error stack:", error.stack)
    return NextResponse.json(
      { error: "Failed to normalize orders", message: error.message },
      { status: 500 }
    )
  }
}
