import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { headers } from "next/headers"

export const dynamic = "force-dynamic"

// Resend webhook event types
type ResendWebhookEvent =
  | "email.sent"
  | "email.delivered"
  | "email.delivery_delayed"
  | "email.complained"
  | "email.bounced"
  | "email.opened"
  | "email.clicked"

interface ResendWebhookPayload {
  type: ResendWebhookEvent
  created_at: string
  data: {
    email_id: string
    from: string
    to: string[]
    subject: string
    created_at: string
    html?: string
    text?: string
    click?: {
      ipAddress: string
      link: string
      timestamp: string
      userAgent: string
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] [resend-webhook] Webhook received")

    // Verify webhook signature (optional but recommended)
    const headersList = await headers()
    const signature = headersList.get("svix-signature")
    const timestamp = headersList.get("svix-timestamp")
    const webhookId = headersList.get("svix-id")

    console.log("[v0] [resend-webhook] Headers:", { signature: !!signature, timestamp, webhookId })

    // Parse webhook payload
    const payload: ResendWebhookPayload = await request.json()
    console.log("[v0] [resend-webhook] Event type:", payload.type)
    console.log("[v0] [resend-webhook] Email ID:", payload.data.email_id)

    const supabase = createAdminClient()

    // Find the email_send record by resend_email_id
    const { data: emailSend, error: findError } = await supabase
      .from("email_sends")
      .select("id, recipient_email, opened_at, click_count")
      .eq("resend_email_id", payload.data.email_id)
      .single()

    if (findError || !emailSend) {
      console.log("[v0] [resend-webhook] Email send not found for ID:", payload.data.email_id)
      // Return 200 to acknowledge receipt even if we don't have the record
      return NextResponse.json({ received: true, message: "Email send not found" })
    }

    console.log("[v0] [resend-webhook] Found email send:", emailSend.id)

    // Update based on event type
    const updates: Record<string, any> = {}

    switch (payload.type) {
      case "email.delivered":
        updates.delivered_at = new Date().toISOString()
        updates.status = "sent"
        console.log("[v0] [resend-webhook] Email delivered")
        break

      case "email.opened":
        // Only update if not already opened (track first open)
        if (!emailSend.opened_at) {
          updates.opened_at = new Date().toISOString()
          console.log("[v0] [resend-webhook] Email opened (first time)")
        } else {
          console.log("[v0] [resend-webhook] Email opened (already tracked)")
        }
        break

      case "email.clicked":
        const clickData = payload.data.click
        if (clickData) {
          // Update first click time if not set
          if (!emailSend.opened_at) {
            updates.opened_at = new Date().toISOString()
          }
          updates.clicked_at = updates.clicked_at || new Date().toISOString()
          updates.click_count = (emailSend.click_count || 0) + 1
          updates.last_clicked_url = clickData.link
          console.log("[v0] [resend-webhook] Link clicked:", clickData.link)
        }
        break

      case "email.bounced":
        updates.bounced_at = new Date().toISOString()
        updates.status = "failed"
        updates.error_message = "Email bounced"
        console.log("[v0] [resend-webhook] Email bounced")
        break

      case "email.complained":
        updates.complained_at = new Date().toISOString()
        console.log("[v0] [resend-webhook] Spam complaint received")
        break

      case "email.delivery_delayed":
        console.log("[v0] [resend-webhook] Delivery delayed")
        // Don't update status, just log
        break

      default:
        console.log("[v0] [resend-webhook] Unhandled event type:", payload.type)
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase.from("email_sends").update(updates).eq("id", emailSend.id)

      if (updateError) {
        console.error("[v0] [resend-webhook] Error updating email send:", updateError)
        return NextResponse.json({ error: "Failed to update email send" }, { status: 500 })
      }

      console.log("[v0] [resend-webhook] Email send updated successfully")
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[v0] [resend-webhook] Error processing webhook:", error)
    return NextResponse.json(
      { error: "Webhook processing failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
