import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    const supabase = createClient()

    // Call RPC function to unsubscribe
    const { data, error } = await supabase.rpc("unsubscribe_with_token", { token })

    if (error) {
      console.error("[v0] Error unsubscribing:", error)
      return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 })
    }

    const result = data as { success: boolean; email?: string; error?: string }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    console.log("[v0] Newsletter unsubscribed:", result.email)

    return NextResponse.json({
      success: true,
      message: "Sie wurden erfolgreich vom Newsletter abgemeldet.",
      email: result.email,
    })
  } catch (error) {
    console.error("[v0] Newsletter unsubscribe API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
