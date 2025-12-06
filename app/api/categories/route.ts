import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching categories:", error)
      return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
    }

    console.log(`[v0] Found ${data?.length || 0} active categories`)

    return NextResponse.json(
      { categories: data || [] },
      {
        headers: {
          "Cache-Control": "public, max-age=60, must-revalidate",
          "CDN-Cache-Control": "public, max-age=60",
        },
      },
    )
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
