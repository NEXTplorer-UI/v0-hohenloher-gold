import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { buildEmail } from "@/lib/email/build"
import { requireAdmin, createAdminClient } from "@/lib/supabase/server"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const supabase = await createAdminClient()

  try {
    const { newsletterSendId } = await request.json()

    if (!newsletterSendId) {
      return NextResponse.json({ error: "Missing newsletterSendId" }, { status: 400 })
    }

    // Get original newsletter send details
    const { data: newsletterSend, error: sendError } = await supabase
      .from("newsletter_sends")
      .select("*")
      .eq("id", newsletterSendId)
      .single()

    if (sendError || !newsletterSend) {
      return NextResponse.json({ error: "Newsletter send not found" }, { status: 404 })
    }

    // Get all failed email sends
    const { data: failedSends, error: failedError } = await supabase
      .from("email_sends")
      .select("*")
      .eq("newsletter_send_id", newsletterSendId)
      .eq("status", "failed")

    if (failedError) throw failedError

    if (!failedSends || failedSends.length === 0) {
      return NextResponse.json({ error: "No failed sends to retry" }, { status: 400 })
    }

    console.log(`[v0] [resend-failed] Retrying ${failedSends.length} failed sends`)

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as Array<{ email: string; error: string }>,
    }

    // Retry sending to failed recipients
    for (const failedSend of failedSends) {
      try {
        const emailResult = buildEmail("newsletter", {
          subject: newsletterSend.subject,
          content: newsletterSend.content,
          imageUrl: newsletterSend.image_url || undefined,
          recipientEmail: failedSend.recipient_email,
          newsletterId: newsletterSend.id,
        })

        const emailData: any = {
          from: "Südfrüchte Hohenlohe <noreply@suedfruechte-hohenlohe.de>",
          to: failedSend.recipient_email,
          subject: emailResult.subject,
          html: emailResult.html,
        }

        await resend.emails.send(emailData)
        results.sent++

        // Update status to sent
        await supabase
          .from("email_sends")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            error_message: null,
          })
          .eq("id", failedSend.id)

        console.log(`[v0] [resend-failed] Sent to ${failedSend.recipient_email}`)
      } catch (error) {
        results.failed++
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        results.errors.push({ email: failedSend.recipient_email, error: errorMessage })

        // Update error message
        await supabase
          .from("email_sends")
          .update({
            error_message: `Retry failed: ${errorMessage}`,
          })
          .eq("id", failedSend.id)

        console.error(`[v0] [resend-failed] Failed to send to ${failedSend.recipient_email}:`, error)
      }

      // Small delay between sends
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    console.log(`[v0] [resend-failed] Completed: ${results.sent} sent, ${results.failed} failed`)

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error("[v0] [resend-failed] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
