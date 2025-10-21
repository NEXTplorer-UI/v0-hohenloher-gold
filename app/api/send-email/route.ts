import { type NextRequest, NextResponse } from "next/server"
import { EmailService } from "@/lib/email/email-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, subject, html, attachments } = body

    if (!to || !subject || !html) {
      return NextResponse.json({ error: "Missing required fields: to, subject, html" }, { status: 400 })
    }

    const success = await EmailService.sendEmail({
      to,
      subject,
      html,
      attachments,
    })

    if (success) {
      return NextResponse.json({ message: "Email sent successfully" })
    } else {
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
    }
  } catch (error) {
    console.error("[v0] Email API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
