import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/auth/api-auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] [load-customers] API called")

    console.log("[v0] [load-customers] Checking admin authentication...")
    try {
      await requireAdmin(request)
      console.log("[v0] [load-customers] Admin authentication successful")
    } catch (authError) {
      console.error("[v0] [load-customers] Admin authentication failed:", authError)
      return NextResponse.json(
        { error: "Unauthorized", details: authError instanceof Error ? authError.message : "Not authorized" },
        { status: 401 },
      )
    }

    console.log("[v0] [load-customers] Creating admin client...")
    const supabase = createAdminClient()
    console.log("[v0] [load-customers] Admin client created successfully")

    console.log("[v0] [load-customers] Querying customers table...")
    const { data, error } = await supabase
      .from("customers")
      .select(`
        id,
        first_name,
        last_name,
        email,
        email_normalized,
        phone,
        street,
        house_number,
        postal_code,
        city,
        country,
        address,
        customer_segment,
        account_status,
        customer_status,
        registration_date,
        total_orders,
        total_spent,
        last_order_date,
        preferred_products,
        favorite_categories,
        marketing_consent,
        marketing_consent_at,
        newsletter_subscribed,
        newsletter_subscribed_at,
        newsletter_confirmed,
        newsletter_unsubscribed_at,
        reminder_notifications,
        special_requests,
        referral_source,
        distribution_system_benefits,
        created_at,
        updated_at
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] [load-customers] Supabase error:", {
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

    console.log("[v0] [load-customers] Successfully fetched", data?.length || 0, "customers")

    const processedData =
      data?.map((customer) => ({
        ...customer,
        tags: [],
        order_count: customer.total_orders || 0,
        newsletter_subscription: customer.newsletter_subscribed || false,
      })) || []

    console.log("[v0] [load-customers] Returning", processedData?.length || 0, "processed customers")

    return NextResponse.json({
      success: true,
      count: processedData?.length || 0,
      data: processedData,
    })
  } catch (error) {
    console.error("[v0] [load-customers] Unexpected error:", error)
    console.error("[v0] [load-customers] Error stack:", error instanceof Error ? error.stack : "No stack")
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
