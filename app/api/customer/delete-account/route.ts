import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server"
import { withErrorHandling } from "@/lib/errors/error-handler"
import { AuthenticationError, DatabaseError } from "@/lib/errors/api-errors"

export const dynamic = "force-dynamic"

export const POST = withErrorHandling(async () => {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new AuthenticationError()
  }

  const adminSupabase = createAdminClient()

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
    special_requests: "Account gelöscht auf Anfrage des Nutzers (GDPR Art. 17)",
    user_id: null,
  }

  const { error: customerError } = await adminSupabase.from("customers").update(anonymizedData).eq("user_id", user.id)

  if (customerError) {
    console.error("[v0] Error anonymizing customer:", customerError)
    throw new DatabaseError("Fehler beim Anonymisieren der Kundendaten", customerError)
  }

  // Anonymize orders (keep for accounting, but remove personal data)
  const { error: ordersError } = await adminSupabase
    .from("orders")
    .update({
      notes: "Kundendaten anonymisiert (GDPR Art. 17)",
      user_id: null,
    })
    .eq("user_id", user.id)

  if (ordersError) {
    console.error("[v0] Error anonymizing orders:", ordersError)
  }

  // Delete profile
  const { error: profileError } = await adminSupabase.from("profiles").delete().eq("id", user.id)

  if (profileError) {
    console.error("[v0] Error deleting profile:", profileError)
  }

  try {
    const { error: banError } = await adminSupabase.auth.admin.updateUserById(user.id, {
      ban_duration: "876000h", // Ban for 100 years (effectively permanent)
    })

    if (banError) {
      console.error("[v0] Error banning auth user:", banError.message)
      // If banning fails, try to sign out the user at least
      await supabase.auth.signOut()
      throw new DatabaseError("Fehler beim Deaktivieren des Accounts", banError)
    }
  } catch (error) {
    console.error("[v0] Error banning auth user:", error)
    throw new DatabaseError("Fehler beim Deaktivieren des Accounts")
  }

  // Sign out the user
  await supabase.auth.signOut()

  return NextResponse.json({
    success: true,
    message: "Account erfolgreich gelöscht. Ihre Daten wurden anonymisiert.",
  })
})
