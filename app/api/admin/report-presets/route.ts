import { createServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const supabase = await createServerClient()

  const { data: presets, error } = await supabase
    .from("report_presets")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[report-presets] Error fetching presets:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ presets })
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()

  const body = await request.json()
  const {
    name,
    description,
    columns,
    column_order,
    column_widths,
    filters,
    group_by,
    aggregations,
    show_aggregations,
    wrap_text,
    excel_options,
  } = body

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: preset, error } = await supabase
    .from("report_presets")
    .insert({
      name,
      description,
      columns,
      column_order,
      column_widths,
      filters,
      group_by,
      aggregations,
      show_aggregations,
      wrap_text,
      excel_options,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error("[report-presets] Error creating preset:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ preset })
}
