import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { withErrorHandling } from "@/lib/errors/error-handler"
import { AuthenticationError, DatabaseError } from "@/lib/errors/api-errors"

export const dynamic = "force-dynamic"

function convertToCSV(data: any[], headers: string[]): string {
  if (!data || data.length === 0) {
    return headers.join(",") + "\n"
  }

  const csvRows = [headers.join(",")]

  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header]
      if (value === null || value === undefined) return ""
      if (typeof value === "object") return JSON.stringify(value).replace(/"/g, '""')
      return `"${String(value).replace(/"/g, '""')}"`
    })
    csvRows.push(values.join(","))
  }

  return csvRows.join("\n")
}

export const GET = withErrorHandling(async () => {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new AuthenticationError()
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (customerError && customerError.code !== "PGRST116") {
    throw new DatabaseError("Fehler beim Laden der Kundendaten", customerError)
  }

  const [ordersData, profileData, checkoutsData, commissionsData, pendingEmailsData] = await Promise.all([
    supabase
      .from("orders")
      .select(
        `
        *,
        order_items (
          *
        )
      `,
      )
      .eq("user_id", user.id),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("checkouts")
      .select("*")
      .eq("customer_id", customer?.id || ""),
    supabase.from("distributor_commissions").select("*").eq("distributor_id", user.id),
    supabase.from("pending_emails").select("*").eq("email_to", user.email),
  ])

  if (ordersData.error) {
    throw new DatabaseError("Fehler beim Laden der Bestellungen", ordersData.error)
  }

  const timestamp = new Date().toISOString().split("T")[0]

  // Profile CSV
  const profileCSV = convertToCSV(profileData.data ? [profileData.data] : [], [
    "id",
    "email",
    "first_name",
    "last_name",
    "phone",
    "address",
    "city",
    "postal_code",
    "role",
    "is_distributor",
    "distributor_code",
    "created_at",
    "updated_at",
  ])

  const customerCSV = convertToCSV(customer ? [customer] : [], [
    "id",
    "user_id",
    "email",
    "first_name",
    "last_name",
    "phone",
    "address",
    "street",
    "house_number",
    "city",
    "postal_code",
    "country",
    "newsletter_subscribed",
    "newsletter_confirmed",
    "newsletter_subscribed_at",
    "newsletter_unsubscribed_at",
    "newsletter_source",
    "marketing_consent",
    "marketing_consent_at",
    "marketing_consent_ip",
    "marketing_consent_ua",
    "reminder_notifications",
    "total_orders",
    "total_spent",
    "last_order_date",
    "customer_status",
    "customer_segment",
    "registration_date",
    "created_at",
    "updated_at",
  ])

  // Orders CSV
  const ordersCSV = convertToCSV(ordersData.data || [], [
    "id",
    "order_number",
    "order_time",
    "status",
    "payment_status",
    "payment_method",
    "delivery_method",
    "subtotal",
    "shipping_cost",
    "total",
    "pickup_date",
    "pickup_location",
    "notes",
    "admin_notes",
    "email_notifications",
    "pickup_reminders",
    "created_at",
    "updated_at",
  ])

  // Order Items CSV
  const orderItems = ordersData.data?.flatMap((order) =>
    order.order_items.map((item: any) => ({
      order_id: order.id,
      order_number: order.order_number,
      ...item,
    })),
  )
  const orderItemsCSV = convertToCSV(orderItems || [], [
    "order_id",
    "order_number",
    "id",
    "product_id",
    "product_name",
    "product_category",
    "product_size",
    "quantity",
    "unit_price",
    "total_price",
    "expected_delivery_date",
    "created_at",
  ])

  // Checkouts CSV (contains IP, user agent, referrer)
  const checkoutsCSV = convertToCSV(checkoutsData.data || [], [
    "id",
    "status",
    "email",
    "first_name",
    "last_name",
    "phone",
    "total_amount",
    "payment_method",
    "delivery_date",
    "delivery_time_slot",
    "ip_address",
    "user_agent",
    "referrer",
    "notes",
    "created_at",
    "updated_at",
    "completed_order_id",
  ])

  // Distributor Commissions CSV (if applicable)
  const commissionsCSV = convertToCSV(commissionsData.data || [], [
    "id",
    "order_id",
    "commission_amount",
    "commission_rate",
    "status",
    "paid_at",
    "created_at",
  ])

  // Pending Emails CSV (communication history)
  const pendingEmailsCSV = convertToCSV(pendingEmailsData.data || [], [
    "id",
    "email_type",
    "email_to",
    "order_id",
    "scheduled_for",
    "sent_at",
    "failed_at",
    "retry_count",
    "last_error",
    "created_at",
  ])

  const readme = `HOHENLOHER GOLD - DATENEXPORT
================================

Exportdatum: ${new Date().toISOString()}
Nutzer-ID: ${user.id}
E-Mail: ${user.email}

GDPR-HINWEIS:
Dies ist ein vollständiger Export Ihrer personenbezogenen Daten gemäß GDPR Artikel 20 (Recht auf Datenübertragbarkeit).

ENTHALTENE DATEIEN:
-------------------
1. profil.csv - Ihr Benutzerprofil
2. kundendaten.csv - Ihre Kundenstammdaten (inkl. Marketing-Consent-Tracking)
3. bestellungen.csv - Ihre Bestellhistorie
4. bestellpositionen.csv - Details zu Ihren Bestellungen
5. checkouts.csv - Checkout-Sessions (inkl. IP-Adressen, User-Agent)
6. provisionen.csv - Verteiler-Provisionen (falls zutreffend)
7. email-kommunikation.csv - E-Mail-Kommunikationshistorie

DATENSCHUTZ:
------------
Alle in diesen Dateien enthaltenen Daten unterliegen der DSGVO.
Bei Fragen wenden Sie sich bitte an: datenschutz@hohenloher-gold.de

Weitere Informationen: https://hohenloher-gold.de/privacy
`

  const exportPackage = `${readme}

=== PROFIL.CSV ===
${profileCSV}

=== KUNDENDATEN.CSV ===
${customerCSV}

=== BESTELLUNGEN.CSV ===
${ordersCSV}

=== BESTELLPOSITIONEN.CSV ===
${orderItemsCSV}

=== CHECKOUTS.CSV ===
${checkoutsCSV}

=== PROVISIONEN.CSV ===
${commissionsCSV}

=== EMAIL-KOMMUNIKATION.CSV ===
${pendingEmailsCSV}
`

  return new NextResponse(exportPackage, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hohenloher-gold-datenexport-${timestamp}.txt"`,
    },
  })
})
