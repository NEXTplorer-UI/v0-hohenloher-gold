import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

function jsonError(message: string, status = 500) {
  console.error("[v0] [admin/stats] Error:", message)
  return NextResponse.json({ success: false, error: message }, { status, headers: { "Cache-Control": "no-store" } })
}

export async function GET(request: NextRequest) {
  console.log("[v0] [admin/stats] API called")

  try {
    const supabase = createAdminClient()

    const { count: articlesCount, error: articlesError } = await supabase
      .from("articles")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")

    if (articlesError) {
      console.error("[v0] [admin/stats] Articles query error:", articlesError)
      return jsonError(`Failed to fetch articles: ${articlesError.message}`, 500)
    }

    // Fetch total customers count
    const { count: customersCount, error: customersError } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })

    if (customersError) {
      console.error("[v0] [admin/stats] Customers query error:", customersError)
      return jsonError(`Failed to fetch customers: ${customersError.message}`, 500)
    }

    console.log("[v0] [admin/stats] Stats fetched successfully:", {
      articles: articlesCount,
      customers: customersCount,
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          publishedArticles: articlesCount || 0,
          totalCustomers: customersCount || 0,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error: any) {
    console.error("[v0] [admin/stats] Unexpected error:", error)
    return jsonError(error.message || "Internal server error", 500)
  }
}
