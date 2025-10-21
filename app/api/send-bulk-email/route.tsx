import { type NextRequest, NextResponse } from "next/server"
import { EmailService } from "@/lib/email/email-service"
import { EmailTemplates } from "@/lib/email/email-templates"

interface BulkEmailRequest {
  subject: string
  content: string
  recipients: string[]
  type: "newsletter" | "announcement" | "custom"
}

export async function POST(request: NextRequest) {
  try {
    const body: BulkEmailRequest = await request.json()
    const { subject, content, recipients, type } = body

    if (!subject || !content || !recipients || recipients.length === 0) {
      return NextResponse.json({ error: "Missing required fields: subject, content, recipients" }, { status: 400 })
    }

    console.log("[v0] Sending bulk email to", recipients.length, "recipients")

    const results = []
    const batchSize = 10 // Send in batches to avoid overwhelming the email service

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)

      const batchPromises = batch.map(async (email) => {
        try {
          let emailTemplate

          if (type === "newsletter") {
            emailTemplate = EmailTemplates.newsletter(subject, content)
          } else {
            // Custom email template
            emailTemplate = {
              subject,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: linear-gradient(135deg, #a16207 0%, #d97706 100%); color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0;">Hohenloher Gold</h1>
                  </div>
                  
                  <div style="padding: 20px; background: #f9f9f9;">
                    ${(content || "").replace(/\n/g, "<br>")}
                  </div>
                  
                  <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
                    <p>Hohenloher Gold | Weststraße 28 | 74629 Pfedelbach</p>
                    <p>E-Mail: suedfruechte-hohenlohe@outlook.de | Tel: 0157 357 038 64</p>
                  </div>
                </div>
              `,
            }
          }

          const success = await EmailService.sendEmail({
            to: email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
          })

          return { email, success }
        } catch (error) {
          console.error("[v0] Failed to send email to", email, error)
          return { email, success: false, error: error.message }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Small delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failureCount = results.length - successCount

    console.log("[v0] Bulk email completed:", successCount, "sent,", failureCount, "failed")

    return NextResponse.json({
      message: "Bulk email completed",
      results: {
        total: recipients.length,
        sent: successCount,
        failed: failureCount,
        details: results,
      },
    })
  } catch (error) {
    console.error("[v0] Bulk email API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
