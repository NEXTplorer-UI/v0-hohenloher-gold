import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    console.log("[v0] [/api/articles] GET request received")

    const supabase = createAdminClient()

    console.log("[v0] [/api/articles] Fetching articles...")

    const { data, error } = await supabase.from("articles").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] [/api/articles] Database error:", error)
      throw error
    }

    console.log("[v0] [/api/articles] Successfully fetched", data?.length || 0, "articles")

    return NextResponse.json(data || [], {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    console.error("[v0] [/api/articles] Error fetching articles:", error)
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    )
  }
}
