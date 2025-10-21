import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function PUT(request: NextRequest) {
  try {
    const customerData = await request.json()

    console.log("[v0] API: Updating customer:", customerData.id)
    console.log("[v0] API: Customer data received:", {
      account_status: customerData.account_status,
      reminder_notifications: customerData.reminder_notifications,
      newsletter_subscription: customerData.newsletter_subscription,
    })

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("customers")
      .update({
        first_name: customerData.first_name,
        last_name: customerData.last_name,
        email: customerData.email,
        phone: customerData.phone,
        street: customerData.street,
        house_number: customerData.house_number,
        postal_code: customerData.postal_code,
        city: customerData.city,
        tags: customerData.tags || [],
        account_status: customerData.account_status || "no_account",
        customer_status: customerData.customer_status || "active",
        newsletter_subscription: customerData.newsletter_subscription || false,
        reminder_notifications: customerData.reminder_notifications || false,
        special_requests: customerData.special_requests,
        referral_source: customerData.referral_source,
        last_activity: new Date().toISOString(),
      })
      .eq("id", customerData.id)
      .select()

    if (error) {
      console.error("[v0] API: Error updating customer:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    console.log("[v0] API: Customer updated successfully:", data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] API: Customer update error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
