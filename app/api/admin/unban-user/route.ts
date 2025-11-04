import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get user by email
    const { data: users, error: getUserError } = await supabase.auth.admin.listUsers()

    if (getUserError) {
      console.error("[v0] Error listing users:", getUserError)
      return NextResponse.json({ error: "Failed to find user" }, { status: 500 })
    }

    const user = users.users.find((u) => u.email === email)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Unban the user by setting ban_duration to 'none'
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      ban_duration: "none",
    })

    if (updateError) {
      console.error("[v0] Error unbanning user:", updateError)
      return NextResponse.json({ error: "Failed to unban user" }, { status: 500 })
    }

    console.log("[v0] User unbanned successfully:", email)

    return NextResponse.json({
      success: true,
      message: "User unbanned successfully",
      user: updatedUser,
    })
  } catch (error) {
    console.error("[v0] Unban user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
