import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type CheckEmailResponse = {
  existsInAuth: boolean
  existsInCRM: boolean
  userId?: string | null
  customerId?: string | null
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Missing email" }, { status: 400 })
    }
    const emailNorm = normalizeEmail(email)

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // Admin-Client mit Service-Role (Server ONLY!)
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // AUTH: via RPC prüfen (keine PostgREST-Schema-Probleme mehr)
    const { data: authExists, error: authErr } = await supabaseAdmin.rpc("auth_email_exists", { p_email: emailNorm })

    if (authErr) {
      console.error("[check-email] RPC error:", authErr)
      // Wir brechen nicht ab – melden nur "unknown" statt 500
    }

    // CRM/Customers: in public.customers prüfen
    // versuche zuerst email_normalized, fallback auf email
    const { data: crmHit1, error: crmErr1 } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("email_normalized", emailNorm)
      .maybeSingle()

    let existsInCRM = !!crmHit1?.id

    if (!existsInCRM) {
      const { data: crmHit2, error: crmErr2 } = await supabaseAdmin
        .from("customers")
        .select("id")
        .eq("email", email) // unsauberer Fallback, falls email_normalized leer ist
        .maybeSingle()

      if (crmErr2) {
        console.warn("[check-email] customers fallback error:", crmErr2)
      }
      existsInCRM = !!crmHit2?.id
    }

    return NextResponse.json({
      existsInAuth: Boolean(authExists),
      existsInCRM,
      error: null,
    })
  } catch (e: any) {
    console.error("[check-email] Unexpected error:", e?.message || e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
