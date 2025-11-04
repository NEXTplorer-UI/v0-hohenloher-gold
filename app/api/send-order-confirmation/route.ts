import { type NextRequest, NextResponse } from "next/server"
import { EmailService } from "@/lib/email/email-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      customerEmail,
      customerName,
      orderId,
      orderTotal,
      paymentMethod,
      deliveryMethod,
      pickupDate,
      pickupLocation, // Added pickupLocation parameter
      orderItems,
      hasCitrusFruits,
      order_time,
      pickupToken, // Added pickupToken parameter
    } = body

    if (!customerEmail || !customerName || !orderId || !orderTotal || !paymentMethod) {
      return NextResponse.json(
        { error: "Missing required fields: customerEmail, customerName, orderId, orderTotal, paymentMethod" },
        { status: 400 },
      )
    }

    const success = await EmailService.sendOrderConfirmation(
      customerEmail,
      customerName,
      orderId,
      orderTotal,
      paymentMethod,
      deliveryMethod,
      pickupDate,
      pickupLocation, // Pass pickupLocation to email service
      orderItems,
      hasCitrusFruits,
      order_time, // Pass order_time directly (email service expects orderDate parameter)
      pickupToken, // Pass pickupToken to email service
    )

    if (success) {
      return NextResponse.json({ message: "Order confirmation email sent successfully" })
    } else {
      return NextResponse.json({ error: "Failed to send order confirmation email" }, { status: 500 })
    }
  } catch (error) {
    console.error("[v0] Order confirmation email API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
