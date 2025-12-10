interface EmailData {
  to: string
  subject: string
  html: string
  attachments?: Array<{
    filename: string
    content: string
    contentType: string
  }>
}

interface SendEmailResult {
  success: boolean
  data?: any
  error?: string
}

export async function sendEmail(data: EmailData): Promise<SendEmailResult> {
  try {
    const resendApiKey = process.env.RESEND_API_KEY

    if (!resendApiKey) {
      console.log("[v0] No RESEND_API_KEY found, using mock email service")
      console.log("[v0] Email would be sent:", data.subject, "to:", data.to)
      return { success: true }
    }

    const plainText = htmlToPlainText(data.html)

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Südfrüchte Hohenlohe <kontakt@suedfruechte-hohenlohe.de>",
        to: [data.to],
        subject: data.subject,
        html: data.html,
        text: plainText, // Add plain text version for multipart
        reply_to: "kontakt@suedfruechte-hohenlohe.de", // Add explicit reply-to header
        attachments: data.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          content_type: att.contentType,
        })),
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("[v0] Resend API error:", error)
      return { success: false, error }
    }

    const result = await response.json()
    console.log("[v0] Email sent successfully via Resend:", result.id)
    return { success: true, data: result }
  } catch (error) {
    console.error("[v0] Email sending failed:", error)
    return { success: false, error: String(error) }
  }
}

export class EmailService {
  static async sendEmail(data: EmailData): Promise<boolean> {
    const result = await sendEmail(data)
    if (!result.success) {
      throw new Error(result.error || "Failed to send email")
    }
    return true
  }

  static async sendInvoiceEmail(
    customerEmail: string,
    customerName: string,
    orderId: string,
    invoicePdf: string,
  ): Promise<boolean> {
    const { html, subject } = buildEmail("invoice", {
      customerName,
      orderId,
    })

    const emailData: EmailData = {
      to: customerEmail,
      subject,
      html,
      attachments: [
        {
          filename: `Rechnung_${orderId}.pdf`,
          content: invoicePdf,
          contentType: "application/pdf",
        },
      ],
    }

    return await this.sendEmail(emailData)
  }

  static async sendOrderConfirmation(
    customerEmail: string,
    customerName: string,
    orderId: string,
    orderTotal: string,
    paymentMethod: string,
    deliveryMethod?: string,
    pickupDate?: string,
    pickupLocation?: string,
    orderItems?: Array<{
      product_name: string
      quantity: number
      unit?: string
      unit_price?: number
      total_price?: number
    }>,
    hasCitrusFruits?: boolean,
    orderDate?: string | Date,
    pickupToken?: string,
  ): Promise<boolean> {
    const { html, subject } = buildEmail("orderConfirmation", {
      customerName,
      orderId,
      orderTotal,
      paymentMethod,
      deliveryMethod,
      pickupDate,
      pickupLocation,
      orderItems,
      hasCitrusFruits,
      orderDate,
      pickupToken,
    })

    const emailData: EmailData = {
      to: customerEmail,
      subject,
      html,
    }

    return await this.sendEmail(emailData)
  }

  static async sendPickupReminder(
    customerEmail: string,
    customerName: string,
    orderId: string,
    pickupDate: string,
    pickupLocation: string,
    paymentMethod: string,
    orderItems?: Array<{ product_name: string; quantity: number; unit?: string }>,
  ): Promise<boolean> {
    const { html, subject } = buildEmail("pickupReminder", {
      customerName,
      orderId,
      pickupDate,
      pickupLocation,
      paymentMethod,
      orderItems,
    })

    const emailData: EmailData = {
      to: customerEmail,
      subject,
      html,
    }

    return await this.sendEmail(emailData)
  }
}

import { buildEmail } from "./build"
import { htmlToPlainText } from "./html-to-text"
