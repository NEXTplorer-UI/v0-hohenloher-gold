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
    return result.success
  }

  static async sendInvoiceEmail(
    customerEmail: string,
    customerName: string,
    orderId: string,
    invoicePdf: string,
  ): Promise<boolean> {
    const emailData: EmailData = {
      to: customerEmail,
      subject: `Rechnung für Ihre Bestellung ${orderId} - Südfrüchte Hohenlohe`,
      html: this.getInvoiceEmailTemplate(customerName, orderId),
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
    orderItems?: Array<{ product_name: string; quantity: number; unit?: string }>,
  ): Promise<boolean> {
    const html = buildEmail("orderConfirmation", {
      customerName,
      orderId,
      orderTotal,
      paymentMethod,
      deliveryMethod,
      pickupDate,
      orderItems,
    })

    const emailData: EmailData = {
      to: customerEmail,
      subject: `Bestellbestätigung ${orderId} - Südfrüchte Hohenlohe`,
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
    const html = buildEmail("pickupReminder", {
      customerName,
      orderId,
      pickupDate,
      pickupLocation,
      paymentMethod,
      orderItems,
    })

    const emailData: EmailData = {
      to: customerEmail,
      subject: `Erinnerung: Abholung Ihrer Bestellung ${orderId} in 3 Tagen - Südfrüchte Hohenlohe`,
      html,
    }

    return await this.sendEmail(emailData)
  }

  private static getInvoiceEmailTemplate(customerName: string, orderId: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #a16207 0%, #d97706 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Südfrüchte Hohenlohe</h1>
          <p style="margin: 5px 0 0 0;">Ihre Rechnung ist bereit</p>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <h2>Liebe/r ${customerName},</h2>
          
          <p>vielen Dank für Ihre Bestellung bei Südfrüchte Hohenlohe!</p>
          
          <p>Im Anhang finden Sie die Rechnung für Ihre Bestellung <strong>${orderId}</strong>.</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #a16207; margin-top: 0;">Wichtige Informationen:</h3>
            <ul>
              <li>Bitte bewahren Sie diese Rechnung für Ihre Unterlagen auf</li>
              <li>Bei Fragen zur Rechnung kontaktieren Sie uns gerne</li>
              <li>Zahlungsziel: 14 Tage nach Rechnungsdatum</li>
            </ul>
          </div>
          
          <p>Wir freuen uns auf Ihren nächsten Besuch!</p>
          
          <p>Mit freundlichen Grüßen<br>
          Ihr Team von Südfrüchte Hohenlohe</p>
        </div>
        
        <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p>Südfrüchte Hohenlohe | Weststraße 28 | 74629 Pfedelbach</p>
          <p>E-Mail: kontakt@suedfruechte-hohenlohe.de | Tel: 0157 357 038 64</p>
        </div>
      </div>
    `
  }

  private static getPickupReminderTemplate(
    customerName: string,
    orderId: string,
    pickupDate: string,
    pickupLocation: string,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Südfrüchte Hohenlohe</h1>
          <p style="margin: 5px 0 0 0;">Abholtermin-Erinnerung</p>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <h2>Liebe/r ${customerName},</h2>
          
          <p>Ihre Bestellung ist bereit zur Abholung!</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
            <h3 style="color: #16a34a; margin-top: 0;">Abholdetails:</h3>
            <p><strong>Bestellnummer:</strong> ${orderId}</p>
            <p><strong>Abholtermin:</strong> ${pickupDate}</p>
            <p><strong>Abholort:</strong> ${pickupLocation}</p>
          </div>
          
          <p>Bitte bringen Sie diese E-Mail oder Ihre Bestellnummer zur Abholung mit.</p>
          
          <p>Wir freuen uns auf Sie!</p>
          
          <p>Mit freundlichen Grüßen<br>
          Ihr Team von Südfrüchte Hohenlohe</p>
        </div>
        
        <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p>Südfrüchte Hohenlohe | Weststraße 28 | 74629 Pfedelbach</p>
          <p>E-Mail: kontakt@suedfruechte-hohenlohe.de | Tel: 0157 357 038 64</p>
        </div>
      </div>
    `
  }
}

import { buildEmail } from "./build"
