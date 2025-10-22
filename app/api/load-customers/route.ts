import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] ===== LOAD CUSTOMERS API CALLED =====")

    console.log("[v0] Creating admin client...")
    const supabase = createAdminClient()
    console.log("[v0] Admin client created")

    console.log("[v0] Querying customers table...")
    const { data, error } = await supabase
      .from("customers")
      .select(`
        *,
        orders:orders(count)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Supabase error loading customers:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      return NextResponse.json(
        {
          error: `Fehler beim Laden der Kunden: ${error.message}`,
          details: error.details,
          hint: error.hint,
        },
        { status: 500 },
      )
    }

    console.log("[v0] Raw data received:", data?.length || 0, "customers")

    const processedData =
      data?.map((customer) => ({
        ...customer,
        order_count: customer.orders?.[0]?.count || customer.total_orders || 0,
      })) || []

    console.log("[v0] Successfully loaded and processed customers:", processedData?.length || 0)

    return NextResponse.json({
      success: true,
      count: processedData?.length || 0,
      data: processedData,
    })
  } catch (error) {
    console.error("[v0] Unexpected error in load-customers API:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack")
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
