import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { buildEmail } from "@/lib/email/build"
import { requireAdmin } from "@/lib/auth/api-auth"
import { markdownToHtml } from "@/lib/markdown"
import { createAdminClient } from "@/lib/supabase/server"

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

    if (!subject || !content || !recipients || recipients.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const htmlContent = type === "newsletter" ? markdownToHtml(content) : content

    const supabase = createAdminClient()
    const { data: newsletterSend, error: createError } = await supabase
      .from("newsletter_sends")
      .insert({
        subject,
        content: htmlContent,
        recipient_count: recipients.length,
        status: "sending",
      })
      .select()
      .single()

    if (createError || !newsletterSend) {
      console.error("[v0] [send-bulk-email] Failed to create newsletter_send:", createError)
      return NextResponse.json({ error: "Failed to create newsletter record" }, { status: 500 })
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as Array<{ email: string; error: string }>,
    }

    const batchSize = 2
    const delayMs = 1000

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)

      const batchPromises = batch.map(async (email: string) => {
        try {
          const emailResult = buildEmail("newsletter", {
            subject,
            content: htmlContent,
            imageUrl,
            recipientEmail: email,
          })

          const emailData: any = {
            from: "Südfrüchte Hohenlohe <noreply@suedfruechte-hohenlohe.de>",
            to: [email],
            subject: emailResult.subject,
            html: emailResult.html,
          }

          if (attachment) {
            emailData.attachments = [
              {
                filename: attachment.filename,
                path: attachment.url,
              },
            ]
          }

          const { data, error } = await resend.emails.send(emailData)

          if (error) {
            throw new Error(error.message)
          }

          if (data?.id) {
            await supabase.from("email_sends").insert({
              newsletter_send_id: newsletterSend.id,
              recipient_email: email,
              resend_email_id: data.id,
              status: "sent",
              sent_at: new Date().toISOString(),
            })

            results.sent++
          }
        } catch (error) {
          results.failed++
          const errorMessage = error instanceof Error ? error.message : "Failed to send"
          results.errors.push({ email, error: errorMessage })

          await supabase.from("email_sends").insert({
            newsletter_send_id: newsletterSend.id,
            recipient_email: email,
            status: "failed",
            error_message: errorMessage,
          })
        }
      })

      await Promise.all(batchPromises)

      if (i + batchSize < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }

    await supabase
      .from("newsletter_sends")
      .update({
        status: "completed",
        sent_count: results.sent,
        failed_count: results.failed,
        completed_at: new Date().toISOString(),
      })
      .eq("id", newsletterSend.id)

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error("[v0] [send-bulk-email] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
