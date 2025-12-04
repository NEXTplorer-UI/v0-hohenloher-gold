import { type NextRequest, NextResponse } from "next/server"
import { getAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const startTime = Date.now()

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

    console.log("[/api/crm/customer] Saving customer to CRM:", customerData.email)

    const supabase = getAdminClient()

    const emailNormalized = customerData.email.toLowerCase().trim()

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
      country: "DE",
      address: fullAddress,
      favorite_categories: customerData.category ? [customerData.category] : [],
      customer_segment: "new",
      marketing_consent: customerData.emailUpdates,
      marketing_consent_at: consentAt,
      marketing_consent_ip: consentIp,
      marketing_consent_ua: consentUa,
      account_status: accountStatus,
      reminder_notifications: reminderNotifications,
      updated_at: now,
    }

    const { data: existingCustomer, error: checkError } = await supabase
      .from("customers")
      .select("id, user_id")
      .eq("email_normalized", emailNormalized)
      .maybeSingle()

    if (checkError && checkError.code !== "PGRST116") {
      console.error("[/api/crm/customer] Error checking existing customer:", checkError)
      return NextResponse.json(
        { success: false, error: checkError.message },
        { status: 500, headers: { "content-type": "application/json" } },
      )
    }

    let result
    if (existingCustomer) {
      console.log("[/api/crm/customer] Updating existing customer:", existingCustomer.id)

      result = await supabase.from("customers").update(customerRecord).eq("id", existingCustomer.id).select().single()
    } else {
      console.log("[/api/crm/customer] Creating new customer for email:", customerData.email)

      const insertRecord = {
        ...customerRecord,
        created_at: now,
      }

      result = await supabase.from("customers").insert(insertRecord).select().single()
    }

    const { data, error } = result

    if (error) {
      console.error("[/api/crm/customer] Error saving customer to CRM:", error)

      if (error.code === "23505") {
        return NextResponse.json(
          { success: false, error: "Customer with this email already exists" },
          { status: 409, headers: { "content-type": "application/json" } },
        )
      }

      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: { "content-type": "application/json" } },
      )
    }

    const tookMs = Date.now() - startTime
    console.log("[/api/crm/customer] Customer saved to CRM successfully in", tookMs, "ms")

    return NextResponse.json(
      { success: true, data, tookMs },
      { status: 200, headers: { "content-type": "application/json" } },
    )
  } catch (err: any) {
    console.error("[/api/crm/customer] Uncaught ERROR:", err?.stack || err?.message || err)

    return NextResponse.json(
      { error: err?.message ?? "Unbekannter Serverfehler" },
      { status: 500, headers: { "content-type": "application/json" } },
    )
  }
}

export async function PUT(req: Request) {
  console.log("[v0] [/api/crm/customer PUT] Request received")
  try {
    const payload = await req.json()
    console.log("[v0] [/api/crm/customer PUT] RAW PAYLOAD RECEIVED:", JSON.stringify(payload))

    const { id, payload: updatePayload } = payload

    if (!id || !updatePayload) {
      console.error("[v0] [/api/crm/customer PUT] Missing id or payload")
      return NextResponse.json({ error: "Missing id/payload" }, { status: 400 })
    }

    console.log("[v0] [/api/crm/customer PUT] Updating customer:", id)

    const supabase = getAdminClient()

    const allowedFields = [
      "first_name",
      "last_name",
      "email",
      "phone",
      "street",
      "house_number",
      "postal_code",
      "city",
      "country",
      "address",
      "notes",
      "newsletter_subscribed",
      "newsletter_subscribed_at",
      "newsletter_unsubscribed_at",
      "marketing_consent",
      "marketing_consent_at",
      "marketing_consent_ip",
      "marketing_consent_ua",
      "reminder_notifications",
      "email_notifications",
      "pickup_reminders",
      "customer_segment",
      "customer_status",
      "account_status",
      "referral_source",
      "favorite_categories",
      "preferred_products",
      "default_pickup_location_id",
      "default_distribution_person_id",
      "special_requests",
      "distribution_system_benefits",
    ]

    const updatedPayload: any = {}
    for (const key of allowedFields) {
      if (key in updatePayload) {
        updatedPayload[key] = updatePayload[key]
      }
    }

    if ("newsletter_subscribed" in updatePayload) {
      updatedPayload.newsletter_subscribed = updatePayload.newsletter_subscribed

      if (updatePayload.newsletter_subscribed === false) {
        // User unsubscribed - set timestamp
        updatedPayload.newsletter_unsubscribed_at = new Date().toISOString()
      } else if (updatePayload.newsletter_subscribed === true) {
        // User subscribed - clear timestamp
        updatedPayload.newsletter_unsubscribed_at = null
      }
    }

    console.log("[v0] [/api/crm/customer PUT] Payload being sent to database:", JSON.stringify(updatedPayload))

    const { data, error } = await supabase.from("customers").update(updatedPayload).eq("id", id).select().single()

    if (error) {
      console.error("[v0] [/api/crm/customer PUT] Database error:", error)
      return NextResponse.json({ error: "Database error", details: error.message }, { status: 500 })
    }

    console.log("[v0] [/api/crm/customer PUT] Customer updated successfully")
    return NextResponse.json({ ok: true, data })
  } catch (e) {
    console.error("[v0] [/api/crm/customer PUT] Unexpected error:", e)
    return NextResponse.json(
      {
        error: "Unexpected error",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    )
  }
}

export async function DELETE(req: Request) {
  console.log("[v0] [/api/crm/customer DELETE] Request received")
  try {
    const { id } = await req.json()

    if (!id) {
      console.error("[v0] [/api/crm/customer DELETE] Missing id")
      return NextResponse.json({ error: "Missing id" }, { status: 400 })
    }

    console.log("[v0] [/api/crm/customer DELETE] Deleting customer:", id)

    const supabase = getAdminClient()
    const { error } = await supabase.from("customers").delete().eq("id", id)

    if (error) {
      console.error("[v0] [/api/crm/customer DELETE] Database error:", error)
      return NextResponse.json({ error: "Database error", details: error.message }, { status: 500 })
    }

    console.log("[v0] [/api/crm/customer DELETE] Customer deleted successfully")
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[v0] [/api/crm/customer DELETE] Unexpected error:", e)
    return NextResponse.json(
      {
        error: "Unexpected error",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    )
  }
}
