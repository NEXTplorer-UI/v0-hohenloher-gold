import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { buildEmail } from "@/lib/email/build"
import { requireAdmin, createAdminClient } from "@/lib/supabase/server"
import { markdownToHtml } from "@/lib/markdown"

if (!process.env.RESEND_API_KEY) {
  console.error("[v0] [send-bulk-email] RESEND_API_KEY environment variable is not set!")
}

const resend = new Resend(process.env.RESEND_API_KEY)

interface Attachment {
  filename: string
  url: string
  size: number
  type: string
}

export async function POST(request: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    console.error("[v0] [send-bulk-email] RESEND_API_KEY is missing")
    return NextResponse.json(
      { error: "Email service not configured. Please set RESEND_API_KEY environment variable." },
      { status: 500 },
    )
  }

  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const supabase = await createAdminClient()

  try {
    const { subject, content, imageUrl, attachment, recipients, type } = await request.json()

    console.log(`[v0] [send-bulk-email] Starting newsletter send`)
    console.log(`[v0] [send-bulk-email] - Type: ${type}`)
    console.log(`[v0] [send-bulk-email] - Recipients: ${recipients.length}`)
    console.log(`[v0] [send-bulk-email] - Subject: ${subject}`)
    console.log(`[v0] [send-bulk-email] - Has attachment: ${!!attachment}`)
    if (attachment) {
      console.log(`[v0] [send-bulk-email] - Attachment: ${attachment.filename} (${attachment.type})`)
    }

    if (!subject || !content || !recipients || recipients.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const htmlContent = type === "newsletter" ? markdownToHtml(content) : content

    console.log(`[v0] [send-bulk-email] Creating newsletter_send record...`)
    let newsletterSend
    try {
      const { data, error: sendError } = await supabase
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

      if (sendError) {
        console.error("[v0] [send-bulk-email] Database error creating newsletter_send:", sendError)
        throw new Error(`Database error: ${sendError.message}`)
      }

      newsletterSend = data
      console.log(`[v0] [send-bulk-email] Created newsletter_send record: ${newsletterSend.id}`)
    } catch (dbError) {
      console.error("[v0] [send-bulk-email] Failed to create newsletter_send record:", dbError)
      return NextResponse.json(
        { error: `Failed to create send record: ${dbError instanceof Error ? dbError.message : "Unknown error"}` },
        { status: 500 },
      )
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as Array<{ email: string; error: string }>,
      newsletterSendId: newsletterSend.id,
    }

    console.log(`[v0] [send-bulk-email] Creating ${recipients.length} email_sends records...`)
    const emailSendsData = recipients.map((email: string) => ({
      newsletter_send_id: newsletterSend.id,
      recipient_email: email,
      status: "pending",
    }))

    const { error: insertError } = await supabase.from("email_sends").insert(emailSendsData)

    if (insertError) {
      console.error("[v0] [send-bulk-email] Failed to create email_sends records:", insertError)
      return NextResponse.json(
        { error: `Failed to create email tracking records: ${insertError.message}` },
        { status: 500 },
      )
    }
    console.log(`[v0] [send-bulk-email] Created email_sends records successfully`)

    const batchSize = 2 // Resend rate limit: 2 requests per second
    const delayMs = 1000 // 1 second delay between batches

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)

      console.log(
        `[v0] [send-bulk-email] Sending batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(recipients.length / batchSize)} (${batch.length} emails)`,
      )

      // Send emails in parallel within the batch (max 2 at a time)
      const batchPromises = batch.map(async (email: string) => {
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

          const { data, error } = await resend.emails.send(emailData)

          if (error) {
            throw new Error(error.message)
          }

          if (data?.id) {
            results.sent++
            await supabase
              .from("email_sends")
              .update({
                status: "sent",
                sent_at: new Date().toISOString(),
                resend_id: data.id,
              })
              .eq("newsletter_send_id", newsletterSend.id)
              .eq("recipient_email", email)

            console.log(`[v0] [send-bulk-email] Sent to ${email}`)
          }
        } catch (error) {
          results.failed++
          const errorMessage = error instanceof Error ? error.message : "Failed to send"
          results.errors.push({ email, error: errorMessage })

          await supabase
            .from("email_sends")
            .update({
              status: "failed",
              error_message: errorMessage,
            })
            .eq("newsletter_send_id", newsletterSend.id)
            .eq("recipient_email", email)

          console.error(`[v0] [send-bulk-email] Failed to send to ${email}: ${errorMessage}`)
        }
      })

      await Promise.all(batchPromises)

      // Wait before next batch (except for the last batch)
      if (i + batchSize < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }

    console.log(`[v0] [send-bulk-email] Completed: ${results.sent} sent, ${results.failed} failed`)

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error("[v0] [send-bulk-email] Error:", error)
    if (error instanceof Error) {
      console.error(`[v0] [send-bulk-email] Error details:`, {
        name: error.name,
        message: error.message,
        stack: error.stack,
      })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
