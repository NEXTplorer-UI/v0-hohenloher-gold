import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase environment variables")
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text()
    let customerData: any
    try {
      customerData = JSON.parse(bodyText || "{}")
    } catch {
      console.error("[/api/crm/customer] Invalid JSON body")
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400, headers: { "content-type": "application/json" } },
      )
    }

    const missing: string[] = []
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL")
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY")
    if (missing.length) {
      console.error("[/api/crm/customer] Missing env:", missing)
      return NextResponse.json(
        { error: `Missing env: ${missing.join(", ")}` },
        { status: 500, headers: { "content-type": "application/json" } },
      )
    }

    console.log("[/api/crm/customer] Saving customer to CRM:", customerData.email)

    const supabase = getServiceClient()

    const fullAddress = `${customerData.street} ${customerData.houseNumber}, ${customerData.zip} ${customerData.city}`
    const accountStatus = customerData.createAccount ? "has_account" : "no_account"
    const reminderNotifications = customerData.emailReminder || false

    const now = new Date().toISOString()
    const consentAt = customerData.emailUpdates ? now : null
    const consentIp = customerData.emailUpdates
      ? request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null
      : null
    const consentUa = customerData.emailUpdates ? request.headers.get("user-agent") : null

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

    const { data: existingCustomers, error: checkError } = await supabase
      .from("customers")
      .select("id, user_id")
      .eq("email_normalized", customerData.email.toLowerCase().trim())

    if (checkError) {
      console.error("[/api/crm/customer] Error checking existing customer:", checkError)
      return NextResponse.json(
        { success: false, error: checkError.message },
        { status: 500, headers: { "content-type": "application/json" } },
      )
    }

    let result
    if (existingCustomers && existingCustomers.length > 0) {
      const existingCustomer = existingCustomers[0]
      console.log("[/api/crm/customer] Updating existing customer:", existingCustomer.id)

      const updateRecord = { ...customerRecord }
      delete updateRecord.created_at

      result = await supabase
        .from("customers")
        .update(updateRecord)
        .eq("email_normalized", customerData.email.toLowerCase().trim())
        .select()
    } else {
      console.log("[/api/crm/customer] Creating new customer for email:", customerData.email)
      result = await supabase.from("customers").insert(customerRecord).select()
    }

    const { data, error } = result

    if (error) {
      console.error("[/api/crm/customer] Error saving customer to CRM:", error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: { "content-type": "application/json" } },
      )
    }

    console.log("[/api/crm/customer] Customer saved to CRM successfully")
    return NextResponse.json({ success: true, data }, { status: 200, headers: { "content-type": "application/json" } })
  } catch (err: any) {
    console.error("[/api/crm/customer] Uncaught ERROR:", err?.stack || err?.message || err)

    return NextResponse.json(
      { error: err?.message ?? "Unbekannter Serverfehler" },
      { status: 500, headers: { "content-type": "application/json" } },
    )
  }
}
