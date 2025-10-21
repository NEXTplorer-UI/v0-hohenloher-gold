import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    const supabase = createClient()

    // Call RPC function to confirm subscription
    const { data, error } = await supabase.rpc("confirm_subscription", { token })

    if (error) {
      console.error("[v0] Error confirming subscription:", error)
      return NextResponse.json({ error: "Failed to confirm subscription" }, { status: 500 })
    }

    const result = data as { success: boolean; email?: string; error?: string }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    console.log("[v0] Newsletter subscription confirmed for:", result.email)

    return NextResponse.json({
      success: true,
      message: "Ihre Newsletter-Anmeldung wurde erfolgreich bestätigt!",
      email: result.email,
    })
  } catch (error) {
    console.error("[v0] Newsletter confirm API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
