import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAdminClient } from "@/lib/supabase/admin"
import { withErrorHandling } from "@/lib/errors/error-handler"
import { AuthenticationError, DatabaseError } from "@/lib/errors/api-errors"

export const dynamic = "force-dynamic"

export const POST = withErrorHandling(async () => {
  console.log("[v0] DELETE ACCOUNT: Starting account deletion process")

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    console.log("[v0] DELETE ACCOUNT: Not authenticated", authError)
    throw new AuthenticationError()
  }

  console.log("[v0] DELETE ACCOUNT: User authenticated", user.email, user.id)

  const adminSupabase = getAdminClient()

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

  console.log("[v0] DELETE ACCOUNT: Anonymizing customer data for user_id:", user.id)

  const { error: customerError } = await adminSupabase.from("customers").update(anonymizedData).eq("user_id", user.id)

  if (customerError) {
    console.error("[v0] DELETE ACCOUNT: Error anonymizing customer:", customerError)
    throw new DatabaseError("Fehler beim Anonymisieren der Kundendaten", customerError)
  }

  console.log("[v0] DELETE ACCOUNT: Customer data anonymized successfully")

  console.log("[v0] DELETE ACCOUNT: Anonymizing orders for user_id:", user.id)

  const { error: ordersError } = await adminSupabase
    .from("orders")
    .update({
      notes: "Kundendaten anonymisiert (GDPR Art. 17)",
      user_id: null,
    })
    .eq("user_id", user.id)

  if (ordersError) {
    console.error("[v0] DELETE ACCOUNT: Error anonymizing orders:", ordersError)
  } else {
    console.log("[v0] DELETE ACCOUNT: Orders anonymized successfully")
  }

  console.log("[v0] DELETE ACCOUNT: Deleting profile for user_id:", user.id)

  const { error: profileError } = await adminSupabase.from("profiles").delete().eq("id", user.id)

  if (profileError) {
    console.error("[v0] DELETE ACCOUNT: Error deleting profile:", profileError)
  } else {
    console.log("[v0] DELETE ACCOUNT: Profile deleted successfully")
  }

  console.log("[v0] DELETE ACCOUNT: Banning auth user:", user.id)

  try {
    const { error: banUserError } = await adminSupabase.auth.admin.updateUserById(user.id, {
      ban_duration: "876000h", // 100 years = permanent ban
      email: `deleted-${user.id}@anonymized.local`, // Change email so original can be reused
    })

    if (banUserError) {
      console.error("[v0] DELETE ACCOUNT: Error banning auth user:", banUserError)
      throw new DatabaseError("Fehler beim Sperren des Auth-Accounts", banUserError)
    }

    console.log("[v0] DELETE ACCOUNT: Auth user banned successfully")
  } catch (error) {
    console.error("[v0] DELETE ACCOUNT: Exception banning auth user:", error)
    throw new DatabaseError("Fehler beim Sperren des Auth-Accounts")
  }

  console.log("[v0] DELETE ACCOUNT: Signing out user")
  await supabase.auth.signOut()

  console.log("[v0] DELETE ACCOUNT: Account deletion completed successfully")

  return NextResponse.json({
    success: true,
    message: "Account erfolgreich gelöscht. Ihre Daten wurden anonymisiert.",
  })
})
