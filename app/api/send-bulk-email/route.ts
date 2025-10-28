import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { buildEmail } from "@/lib/email/build"
import { requireAdmin, createAdminClient } from "@/lib/supabase/server"
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

  const supabase = await createAdminClient()

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

    const { data: newsletterSend, error: sendError } = await supabase
      .from("newsletter_sends")
      .insert({
        subject,
        content: htmlContent,
        image_url: imageUrl || null,
        sent_by: authResult.user.id,
        recipient_count: recipients.length,
      })
      .select()
      .single()

    if (sendError || !newsletterSend) {
      console.error("[v0] [send-bulk-email] Failed to create newsletter_send record:", sendError)
      throw new Error("Failed to create send record")
    }

    console.log(`[v0] [send-bulk-email] Created newsletter_send record: ${newsletterSend.id}`)

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as Array<{ email: string; error: string }>,
      newsletterSendId: newsletterSend.id,
    }

    const emailSendsData = recipients.map((email: string) => ({
      newsletter_send_id: newsletterSend.id,
      recipient_email: email,
      status: "pending",
    }))

    const { error: insertError } = await supabase.from("email_sends").insert(emailSendsData)

    if (insertError) {
      console.error("[v0] [send-bulk-email] Failed to create email_sends records:", insertError)
    }

    const batchSize = 2 // Reduced batch size from 10 to 2 to respect Resend's rate limit of 2 requests/second
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)

      const promises = batch.map(async (email: string) => {
        try {
          const emailResult = buildEmail("newsletter", {
            subject,
            content: htmlContent,
            imageUrl,
            recipientEmail: email,
            newsletterId: newsletterSend.id,
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
                path: attachment.url,
              },
            ]
          }

          await resend.emails.send(emailData)
          results.sent++

          await supabase
            .from("email_sends")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
            })
            .eq("newsletter_send_id", newsletterSend.id)
            .eq("recipient_email", email)

          console.log(`[v0] [send-bulk-email] Sent to ${email}`)
        } catch (error) {
          results.failed++
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          results.errors.push({ email, error: errorMessage })

          await supabase
            .from("email_sends")
            .update({
              status: "failed",
              error_message: errorMessage,
            })
            .eq("newsletter_send_id", newsletterSend.id)
            .eq("recipient_email", email)

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
