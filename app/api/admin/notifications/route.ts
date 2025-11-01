import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const unreadOnly = searchParams.get("unreadOnly") === "true"

    // Fetch notifications
    let query = supabase.from("admin_notifications").select("*").order("created_at", { ascending: false }).limit(limit)

    if (unreadOnly) {
      query = query.eq("is_read", false)
    }

    const { data: notifications, error } = await query

    if (error) {
      console.error("[Admin Notifications API] Error fetching notifications:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error("[Admin Notifications API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { notificationId, isRead } = await request.json()

    // Update notification
    const { error } = await supabase
      .from("admin_notifications")
      .update({
        is_read: isRead,
        read_at: isRead ? new Date().toISOString() : null,
      })
      .eq("id", notificationId)

    if (error) {
      console.error("[Admin Notifications API] Error updating notification:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Admin Notifications API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
