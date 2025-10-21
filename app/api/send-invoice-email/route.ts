import { type NextRequest, NextResponse } from "next/server"
import { EmailService } from "@/lib/email/email-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerEmail, customerName, orderId, invoicePdf } = body

    if (!customerEmail || !customerName || !orderId) {
      return NextResponse.json(
        { error: "Missing required fields: customerEmail, customerName, orderId" },
        { status: 400 },
      )
    }

    const success = await EmailService.sendInvoiceEmail(customerEmail, customerName, orderId, invoicePdf || "")

    if (success) {
      return NextResponse.json({ message: "Invoice email sent successfully" })
    } else {
      return NextResponse.json({ error: "Failed to send invoice email" }, { status: 500 })
    }
  } catch (error) {
    console.error("[v0] Invoice email API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
