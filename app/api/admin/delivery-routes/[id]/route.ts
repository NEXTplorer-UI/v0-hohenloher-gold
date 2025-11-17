import { createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, region, color, display_order, notes, is_active } = body

    const { data: route, error } = await supabase
      .from("delivery_routes")
      .update({
        name,
        region,
        color,
        display_order,
        notes,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ route })
  } catch (error: any) {
    console.error("[API] Error updating delivery route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { error } = await supabase
      .from("delivery_routes")
      .delete()
      .eq("id", params.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[API] Error deleting delivery route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
