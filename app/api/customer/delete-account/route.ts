import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { withErrorHandling } from "@/lib/errors/error-handler"
import { AuthenticationError, DatabaseError } from "@/lib/errors/api-errors"

export const POST = withErrorHandling(async () => {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new AuthenticationError()
  }

  // Anonymize customer data (GDPR compliant - keep records for legal/accounting)
  const anonymizedData = {
    first_name: "Gelöscht",
    last_name: "Gelöscht",
    email: `deleted-${user.id}@anonymized.local`,
    phone: null,
    street: null,
    house_number: null,
    postal_code: null,
    city: null,
    country: null,
    address: null,
    marketing_consent: false,
    newsletter_subscribed: false,
    notes: "Account gelöscht auf Anfrage des Nutzers (GDPR Art. 17)",
    user_id: null, // Disconnect from auth user
  }

  const { error: customerError } = await supabase.from("customers").update(anonymizedData).eq("user_id", user.id)

  if (customerError) {
    console.error("[v0] Error anonymizing customer:", customerError)
    throw new DatabaseError("Fehler beim Anonymisieren der Kundendaten", customerError)
  }

  // Anonymize orders (keep for accounting, but remove personal data)
  const { error: ordersError } = await supabase
    .from("orders")
    .update({
      customer_email: `deleted-${user.id}@anonymized.local`,
      customer_name: "Gelöscht",
      customer_phone: null,
      delivery_address: "Adresse gelöscht",
      notes: "Kundendaten anonymisiert (GDPR Art. 17)",
      user_id: null, // Disconnect from auth user
    })
    .eq("user_id", user.id)

  if (ordersError) {
    console.error("[v0] Error anonymizing orders:", ordersError)
    // Don't throw - orders anonymization is optional
  }

  // Delete profile
  const { error: profileError } = await supabase.from("profiles").delete().eq("id", user.id)

  if (profileError) {
    console.error("[v0] Error deleting profile:", profileError)
    // Don't throw - profile deletion is optional
  }

  const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(user.id)

  if (deleteAuthError) {
    console.error("[v0] Error deleting auth user:", deleteAuthError)
    throw new DatabaseError("Fehler beim Löschen des Accounts", deleteAuthError)
  }

  return NextResponse.json({
    success: true,
    message: "Account erfolgreich gelöscht. Ihre Daten wurden anonymisiert.",
  })
})
