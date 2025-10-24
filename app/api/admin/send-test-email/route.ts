import { NextResponse } from "next/server"
import { buildEmail, type EmailTemplateId } from "@/lib/email/build"
import { EmailService } from "@/lib/email/email-service"
import type { TemplateVars } from "@/lib/email/engine"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { templateId, to, vars } = body as {
      templateId: EmailTemplateId
      to: string
      vars: TemplateVars
    }

    // Validate input
    if (!templateId || !to) {
      return NextResponse.json({ ok: false, error: "Missing templateId or to" }, { status: 400 })
    }

    // Build email
    const { subject, html } = buildEmail(templateId, vars || {})

    // Send test email with [TEST] prefix
    await EmailService.sendEmail({
      to,
      subject: `[TEST] ${subject}`,
      html,
    })

    console.log("[v0] Test email sent successfully to:", to)

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("[v0] Error sending test email:", error)
    return NextResponse.json({ ok: false, error: error.message || "Server error" }, { status: 500 })
  }
}
