import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, firstName, lastName, phone, street, houseNumber, zip, city, isTest } = body

    console.log("[v0] [create-account] Creating account for:", email)

    // Create Supabase client
    const supabase = await createClient()

    // Determine redirect URL based on environment
    const redirectUrl =
      process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
      (request.headers.get("host")?.includes("localhost")
        ? `http://localhost:${process.env.PORT || 3000}`
        : `https://${request.headers.get("host")}`)

    // Create auth account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${redirectUrl}/customer/account-confirmed`,
        data: {
          first_name: firstName,
          last_name: lastName,
          phone,
        },
      },
    })

    if (authError) {
      console.error("[v0] [create-account] Auth error:", authError)
      return NextResponse.json({ success: false, error: authError.message }, { status: 400 })
    }

    console.log("[v0] [create-account] Account created successfully:", authData.user?.id)

    // Link user to customer record if exists
    if (authData.user) {
      try {
        const { error: linkError } = await supabase
          .from("customers")
          .update({ user_id: authData.user.id })
          .eq("email", email)
          .is("user_id", null)

        if (linkError) {
          console.error("[v0] [create-account] Error linking customer:", linkError)
          // Don't fail the request if linking fails
        } else {
          console.log("[v0] [create-account] Customer linked to user account")
        }
      } catch (linkErr) {
        console.error("[v0] [create-account] Exception linking customer:", linkErr)
      }
    }

    return NextResponse.json({
      success: true,
      user: authData.user,
      message: "Account created successfully. Please check your email to confirm your account.",
    })
  } catch (error) {
    console.error("[v0] [create-account] Unexpected error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
