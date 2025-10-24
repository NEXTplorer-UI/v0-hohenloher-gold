import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      console.error("[get-customer] Missing Supabase environment variables")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    // Get JWT from Authorization header
    const authHeader = req.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const jwt = authHeader.split(" ")[1]

    // Verify JWT and get user
    const { data: userInfo, error: userErr } = await supabase.auth.getUser(jwt)
    if (userErr || !userInfo.user) {
      console.error("[get-customer] Auth error:", userErr)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = userInfo.user

    // 1) Try to find customer by user_id (cleanest approach)
    const { data: customers, error } = await supabase.from("customers").select("*").eq("user_id", user.id).limit(1)

    if (error) {
      console.error("[get-customer] Database error:", error)
      throw error
    }

    // 2) If no customer found by user_id, try email_normalized
    if (!customers || customers.length === 0) {
      const email = (user.email ?? "").toLowerCase().trim()
      if (!email) {
        return NextResponse.json({ customer: null })
      }

      const { data: byEmail, error: err2 } = await supabase
        .from("customers")
        .select("*")
        .eq("email_normalized", email)
        .order("updated_at", { ascending: false })
        .limit(1)

      if (err2) {
        console.error("[get-customer] Email lookup error:", err2)
        throw err2
      }

      // If found by email and not yet linked, link it to user_id
      if (byEmail && byEmail.length === 1 && !byEmail[0].user_id) {
        console.log("[get-customer] Linking customer to user_id:", user.id)
        await supabase.from("customers").update({ user_id: user.id }).eq("id", byEmail[0].id)
      }

      return NextResponse.json({ customer: byEmail?.[0] ?? null })
    }

    return NextResponse.json({ customer: customers[0] })
  } catch (e: any) {
    console.error("[get-customer] Unexpected error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
