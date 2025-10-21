import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] API: check-email route called")

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[v0] API: Missing Supabase environment variables")
      return NextResponse.json(
        {
          error: "Server configuration error: Missing Supabase credentials",
        },
        { status: 500 },
      )
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    console.log("[v0] API: Checking email existence:", email)

    const supabase = createAdminClient()
    console.log("[v0] API: Supabase admin client created successfully")

    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

    let existsInAuth = false
    if (authError) {
      console.error("[v0] API: Error checking auth users:", authError)
    } else {
      existsInAuth = authUsers.users.some((user) => user.email?.toLowerCase() === email.toLowerCase())
    }

    // Check if email exists in customers table
    const { data: existingCustomer, error: customerError } = await supabase
      .from("customers")
      .select("id, email")
      .eq("email", email.toLowerCase())
      .maybeSingle()

    if (customerError) {
      console.error("[v0] API: Error checking customer email:", customerError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    const existsInCRM = !!existingCustomer

    console.log("[v0] API: Email check result:", { email, existsInAuth, existsInCRM })
    return NextResponse.json({
      existsInAuth,
      existsInCRM,
      exists: existsInAuth || existsInCRM,
      customer: existingCustomer,
    })
  } catch (error) {
    console.error("[v0] API: Email check error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("[v0] API: Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json(
      {
        error: "Internal server error",
        details: errorMessage,
      },
      { status: 500 },
    )
  }
}
