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
    const { subject, content, imageUrl, attachment, testEmail, templateType } = await request.json()

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

    const supabase = createAdminClient()
    let personalizedContent = content
    let personalizedSubject = subject

    // Load customer data for finkmaxi@gmail.com
    const { data: customer } = await supabase
      .from("customers")
      .select("id, first_name, last_name, email")
      .eq("email", "finkmaxi@gmail.com")
      .single()

    if (customer) {
      const customerName = `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "Kunde"

      // Replace {{customerName}} placeholder
      personalizedContent = personalizedContent.replace(/\{\{customerName\}\}/g, customerName)
      personalizedSubject = personalizedSubject.replace(/\{\{customerName\}\}/g, customerName)

      if (templateType === "pickupReminder") {
        const { data: orders } = await supabase
          .from("orders")
          .select(
            `
            id,
            order_number,
            pickup_date,
            payment_method,
            pickup_locations (
              name
            )
          `,
          )
          .eq("customer_id", customer.id)
          .in("status", ["confirmed", "ready_for_pickup"])
          .order("pickup_date", { ascending: true })
          .limit(1)

        if (orders && orders.length > 0) {
          const order = orders[0]

          // Replace order placeholders with real data
          personalizedContent = personalizedContent
            .replace(/\{\{orderNumber\}\}/g, order.order_number)
            .replace(
              /\{\{pickupDate\}\}/g,
              order.pickup_date ? new Date(order.pickup_date).toLocaleDateString("de-DE") : "TBD",
            )
            .replace(/\{\{pickupLocation\}\}/g, order.pickup_locations?.name || "TBD")
            .replace(
              /\{\{paymentMethod\}\}/g,
              order.payment_method === "bank_transfer" ? "Überweisung" : "Bar bei Abholung",
            )

          console.log(`[v0] [send-test] Personalized with order ${order.order_number}`)
        } else {
          console.log(`[v0] [send-test] No active orders found for personalization`)
        }
      }
    }

    const htmlContent = markdownToHtml(personalizedContent)

    const emailResult = buildEmail("newsletter", {
      subject: personalizedSubject,
      content: htmlContent,
      imageUrl,
      recipientEmail: testEmail,
    })

    const emailData: any = {
      from: "Südfrüchte Hohenlohe <noreply@suedfruechte-hohenlohe.de>",
      to: testEmail,
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
