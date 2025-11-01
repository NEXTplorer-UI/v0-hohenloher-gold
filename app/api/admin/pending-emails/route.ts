import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data: emails, error } = await supabase
      .from("pending_emails")
      .select(`
        *,
        orders (
          order_number
        )
      `)
      .order("scheduled_for", { ascending: true })

    if (error) throw error

    return NextResponse.json({ emails })
  } catch (error: any) {
    console.error("[v0] Failed to fetch pending emails:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
