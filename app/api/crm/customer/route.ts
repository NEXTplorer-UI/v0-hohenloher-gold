import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] API: customer route called")

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[v0] API: Missing Supabase environment variables")
      return NextResponse.json(
        {
          success: false,
          error: "Server configuration error: Missing Supabase credentials",
        },
        { status: 500 },
      )
    }

    const customerData = await request.json()

    console.log("[v0] API: Saving customer to CRM:", customerData)

    const supabase = createAdminClient()
    console.log("[v0] API: Supabase admin client created successfully")

    // Create full address string
    const fullAddress = `${customerData.street} ${customerData.houseNumber}, ${customerData.zip} ${customerData.city}`

    // Determine account status based on createAccount flag
    const accountStatus = customerData.createAccount ? "has_account" : "no_account"

    // Map reminder settings
    const reminderNotifications = customerData.emailReminder || false

    const now = new Date().toISOString()
    const consentAt = customerData.emailUpdates ? now : null
    const consentIp = customerData.emailUpdates
      ? request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null
      : null
    const consentUa = customerData.emailUpdates ? request.headers.get("user-agent") : null

    // Prepare customer data for Supabase
    const customerRecord = {
      first_name: customerData.firstName,
      last_name: customerData.lastName,
      email: customerData.email,
      phone: customerData.phone,
      street: customerData.street,
      house_number: customerData.houseNumber,
      postal_code: customerData.zip,
      city: customerData.city,
      address: fullAddress,
      favorite_categories: customerData.category ? [customerData.category] : [],
      customer_segment: "new",
      marketing_consent: customerData.emailUpdates,
      marketing_consent_at: consentAt,
      marketing_consent_ip: consentIp,
      marketing_consent_ua: consentUa,
      account_status: accountStatus,
      reminder_notifications: reminderNotifications,
      created_at: new Date().toISOString(),
    }

    console.log("[v0] API: Customer record with status fields:", {
      account_status: accountStatus,
      reminder_notifications: reminderNotifications,
      email: customerData.email,
    })

    const { data: existingCustomers, error: checkError } = await supabase
      .from("customers")
      .select("id, user_id")
      .eq("email_normalized", customerData.email.toLowerCase().trim())

    if (checkError) {
      console.error("[v0] API: Error checking existing customer:", checkError)
      return NextResponse.json({ success: false, error: checkError.message }, { status: 500 })
    }

    let result
    if (existingCustomers && existingCustomers.length > 0) {
      const existingCustomer = existingCustomers[0]
      console.log("[v0] API: Updating existing customer:", existingCustomer.id)

      // Don't update created_at for existing customers
      const updateRecord = { ...customerRecord }
      delete updateRecord.created_at

      result = await supabase
        .from("customers")
        .update(updateRecord)
        .eq("email_normalized", customerData.email.toLowerCase().trim())
        .select()
    } else {
      console.log("[v0] API: Creating new customer for email:", customerData.email)
      result = await supabase.from("customers").insert(customerRecord).select()
    }

    const { data, error } = result

    if (error) {
      console.error("[v0] API: Error saving customer to CRM:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    console.log("[v0] API: Customer saved to CRM successfully:", data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] API: CRM save error:", error)
    const errorMessage = error instanceof Error ? error.message : "Internal server error"
    console.error("[v0] API: Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
