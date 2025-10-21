import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  try {
    // Use centralized admin client utility
    const supabase = createAdminClient()

    console.log("[v0] Server: Loading customers with service role key")

    const { data, error } = await supabase
      .from("customers")
      .select(`
        *,
        orders:orders(count)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Server: Error loading customers:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const processedData =
      data?.map((customer) => ({
        ...customer,
        // Ensure order_count matches the actual count from the relationship
        order_count: customer.orders?.[0]?.count || customer.total_orders || 0,
      })) || []

    console.log("[v0] Server: Successfully loaded customers:", processedData?.length || 0)
    return NextResponse.json({
      success: true,
      count: processedData?.length || 0,
      data: processedData,
    })
  } catch (error) {
    console.error("[v0] Server: Error during customer loading:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
