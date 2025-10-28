import { type NextRequest, NextResponse } from "next/server"
import { EmailService } from "@/lib/email/email-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface InvoiceItem {
  product_name: string
  quantity: number
  unit_price: number
}

export async function POST(request: NextRequest) {
  try {
    const { orderId, orderNumber, customerEmail, customerName, items, subtotal, shippingCost, total, paymentMethod } =
      await request.json()

    console.log("[v0] [Generate Invoice] Generating invoice for order:", orderNumber)

    // Calculate tax (7% MwSt)
    const taxRate = 0.07
    const taxAmount = total * (taxRate / (1 + taxRate))
    const netAmount = total - taxAmount

    // Prepare invoice data
    const invoiceData = {
      invoiceNumber: orderNumber,
      date: new Date().toLocaleDateString("de-DE"),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString("de-DE"), // 14 days from now
      customer: {
        name: customerName,
        email: customerEmail,
        address: "", // Could be extracted from order if available
        city: "",
        postalCode: "",
      },
      items: items.map((item: InvoiceItem) => ({
        name: item.product_name,
        quantity: item.quantity,
        price: item.unit_price,
        total: item.unit_price * item.quantity,
      })),
      subtotal: netAmount,
      tax: taxAmount,
      total: total,
      paymentMethod: getPaymentMethodLabel(paymentMethod),
    }

    // Generate PDF
    const pdfResponse = await fetch(`${request.nextUrl.origin}/api/generate-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderData: invoiceData, type: "invoice" }),
    })

    if (!pdfResponse.ok) {
      throw new Error("Failed to generate PDF")
    }

    const pdfBlob = await pdfResponse.blob()
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer())
    const pdfBase64 = pdfBuffer.toString("base64")

    // Send invoice email
    const emailSent = await EmailService.sendInvoiceEmail(customerEmail, customerName, orderNumber, pdfBase64)

    if (emailSent) {
      console.log("[v0] [Generate Invoice] Invoice sent successfully to:", customerEmail)
      return NextResponse.json({ success: true, message: "Invoice generated and sent" })
    } else {
      console.error("[v0] [Generate Invoice] Failed to send invoice email")
      return NextResponse.json({ success: false, error: "Failed to send invoice email" }, { status: 500 })
    }
  } catch (error: any) {
    console.error("[v0] [Generate Invoice] Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    sumup: "Kartenzahlung (SumUp)",
    card: "Kartenzahlung",
    transfer: "Überweisung",
    cash: "Barzahlung bei Abholung",
  }
  return labels[method] || method
}
