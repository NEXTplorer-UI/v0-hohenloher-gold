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
    const { subject, content, imageUrl, attachment, recipients, type } = await request.json()

    console.log(`[v0] [send-bulk-email] Sending ${type} to ${recipients.length} recipients`)
    if (attachment) {
      console.log(`[v0] [send-bulk-email] With attachment: ${attachment.filename}`)
    }

    if (!subject || !content || !recipients || recipients.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const htmlContent = type === "newsletter" ? markdownToHtml(content) : content

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    }

    const batchSize = 10
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)

      const promises = batch.map(async (email: string) => {
        try {
          const emailResult = buildEmail("newsletter", {
            subject,
            content: htmlContent, // Use converted HTML content
            imageUrl,
            recipientEmail: email,
          })

          const emailData: any = {
            from: "Südfrüchte Hohenlohe <noreply@suedfruechte-hohenlohe.de>",
            to: email,
            subject: emailResult.subject,
            html: emailResult.html,
          }

          if (attachment) {
            emailData.attachments = [
              {
                filename: attachment.filename,
                path: attachment.url, // Resend will fetch from this URL
              },
            ]
          }

          await resend.emails.send(emailData)
          results.sent++
          console.log(`[v0] [send-bulk-email] Sent to ${email}`)
        } catch (error) {
          results.failed++
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          results.errors.push(`${email}: ${errorMessage}`)
          console.error(`[v0] [send-bulk-email] Failed to send to ${email}:`, error)
        }
      })

      await Promise.all(promises)

      if (i + batchSize < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    console.log(`[v0] [send-bulk-email] Completed: ${results.sent} sent, ${results.failed} failed`)

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error("[v0] [send-bulk-email] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
