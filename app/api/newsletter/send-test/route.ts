import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { buildEmail } from "@/lib/email/build"
import { requireAdmin } from "@/lib/auth/api-auth"
import { markdownToHtml } from "@/lib/markdown"

const resend = new Resend(process.env.RESEND_API_KEY)

interface Attachment {
  filename: string
  url: string
  size: number
  type: string
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const { subject, content, imageUrl, attachment, testEmail } = await request.json()

    console.log(`[v0] [send-test] Sending test email to ${testEmail}`)
    console.log(
      `[v0] [send-test] Attachment received:`,
      attachment
        ? {
            filename: attachment.filename,
            url: attachment.url,
            type: attachment.type,
            size: attachment.size,
          }
        : "No attachment",
    )

    if (!subject || !content || !testEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(testEmail)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
    }

    const htmlContent = markdownToHtml(content)

    const emailResult = buildEmail("newsletter", {
      subject,
      content: htmlContent,
      imageUrl,
      recipientEmail: testEmail,
    })

    const emailData: any = {
      from: "Südfrüchte Hohenlohe <noreply@suedfruechte-hohenlohe.de>",
      to: testEmail,
      subject: `[TEST] ${emailResult.subject}`,
      html: emailResult.html,
    }

    if (attachment) {
      emailData.attachments = [
        {
          filename: attachment.filename,
          path: attachment.url,
        },
      ]
      console.log(`[v0] [send-test] Adding attachment to email:`, emailData.attachments)
    }

    await resend.emails.send(emailData)

    console.log(`[v0] [send-test] Test email sent successfully to ${testEmail}`)

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${testEmail}`,
    })
  } catch (error) {
    console.error("[v0] [send-test] Error:", error)
    return NextResponse.json({ error: "Failed to send test email" }, { status: 500 })
  }
}
