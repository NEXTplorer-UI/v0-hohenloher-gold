import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { withErrorHandling } from "@/lib/errors/error-handler"
import { AuthenticationError, DatabaseError } from "@/lib/errors/api-errors"

export const dynamic = "force-dynamic"

export const GET = withErrorHandling(async () => {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new AuthenticationError()
  }

  // Fetch all user data
  const [customerData, ordersData, profileData] = await Promise.all([
    supabase.from("customers").select("*").eq("user_id", user.id).single(),
    supabase
      .from("orders")
      .select(
        `
        *,
        order_items (
          *,
          products (name, sku)
        )
      `,
      )
      .eq("user_id", user.id),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
  ])

  if (customerData.error && customerData.error.code !== "PGRST116") {
    throw new DatabaseError("Fehler beim Laden der Kundendaten", customerData.error)
  }
  if (ordersData.error) {
    throw new DatabaseError("Fehler beim Laden der Bestellungen", ordersData.error)
  }

  // Compile all data
  const exportData = {
    export_date: new Date().toISOString(),
    user_id: user.id,
    email: user.email,
    profile: profileData.data || null,
    customer: customerData.data || null,
    orders: ordersData.data || [],
    gdpr_notice:
      "Dies ist ein Export Ihrer personenbezogenen Daten gemäß GDPR Artikel 20 (Recht auf Datenübertragbarkeit).",
  }

  // Return as JSON download
  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="hohenloher-gold-daten-${user.id}-${Date.now()}.json"`,
    },
  })
})
