import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    console.log("[v0] [/api/articles] GET request received")

    let supabase
    try {
      supabase = createAdminClient()
      console.log("[v0] [/api/articles] Admin client created successfully")
    } catch (clientError) {
      console.error("[v0] [/api/articles] Failed to create admin client:", clientError)
      return NextResponse.json(
        { error: "Failed to initialize database client" },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      )
    }

    console.log("[v0] [/api/articles] Fetching articles from database...")

    const { data, error } = await supabase.from("articles").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] [/api/articles] Database error:", error)
      return NextResponse.json(
        { error: "Database query failed", details: error.message },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      )
    }

    console.log("[v0] [/api/articles] Successfully fetched", data?.length || 0, "articles")

    return NextResponse.json(data || [], {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error: any) {
    console.error("[v0] [/api/articles] Unexpected error:", error)
    console.error("[v0] [/api/articles] Error stack:", error?.stack)
    return NextResponse.json(
      { error: "Internal server error", message: error?.message || "Unknown error" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    )
  }
}
