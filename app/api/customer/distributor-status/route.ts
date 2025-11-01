import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Discount table: boxes ordered → boxes discounted
const DISCOUNT_TABLE: Record<number, number> = {
  25: 2,
  50: 4,
  75: 7,
  100: 10,
  125: 13,
  150: 16,
  175: 19,
  200: 22,
}

function calculateDiscount(totalBoxes: number): number {
  // Find the highest threshold that applies
  const thresholds = Object.keys(DISCOUNT_TABLE)
    .map(Number)
    .sort((a, b) => b - a)

  for (const threshold of thresholds) {
    if (totalBoxes >= threshold) {
      return DISCOUNT_TABLE[threshold]
    }
  }

  return 0
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get profile to check if user is a distributor
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, is_distributor, distributor_code, first_name, last_name, email")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // If not a distributor, return basic info
    if (!profile.is_distributor) {
      return NextResponse.json({
        isDistributor: false,
        profile,
      })
    }

    // Get pickup location for this distributor
    const { data: pickupLocation, error: locationError } = await supabase
      .from("pickup_locations")
      .select("*")
      .eq("distributor_id", user.id)
      .eq("is_active", true)
      .single()

    // Calculate total discounted boxes
    // Get all completed orders for this distributor
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(
        `
        id,
        total,
        order_time,
        order_items (
          quantity,
          product_category
        )
      `,
      )
      .eq("user_id", user.id)
      .eq("status", "completed")

    let totalBoxesOrdered = 0
    let totalDiscountedBoxes = 0

    if (orders && !ordersError) {
      // Calculate total boxes from all orders
      for (const order of orders) {
        const orderBoxes = order.order_items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0
        totalBoxesOrdered += orderBoxes

        // Calculate discount for this order
        const discount = calculateDiscount(orderBoxes)
        totalDiscountedBoxes += discount
      }
    }

    return NextResponse.json({
      isDistributor: true,
      profile,
      pickupLocation: pickupLocation || null,
      stats: {
        totalBoxesOrdered,
        totalDiscountedBoxes,
        currentDiscount: calculateDiscount(totalBoxesOrdered),
      },
      discountTable: DISCOUNT_TABLE,
    })
  } catch (error) {
    console.error("Error fetching distributor status:", error)
    return NextResponse.json({ error: "Failed to fetch distributor status" }, { status: 500 })
  }
}
