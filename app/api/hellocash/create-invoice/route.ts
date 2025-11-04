import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface HelloCashItem {
  name: string
  quantity: number
  price: number
  tax: number
}

export async function POST(req: Request) {
  try {
    const { orderNumber, customerEmail, items, totalAmount } = await req.json()

    if (!orderNumber || !items || !totalAmount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const helloCashToken = process.env.HELLOCASH_API_TOKEN
    if (!helloCashToken) {
      throw new Error("HELLOCASH_API_TOKEN not configured")
    }

    console.log("[v0] [create-invoice] Token configured - length:", helloCashToken.length)
    console.log("[v0] [create-invoice] Token starts with:", helloCashToken.substring(0, 15) + "...")

    const invoicePayload = {
      invoice_text: `Bestellung: ${orderNumber}`,
      invoice_paymentMethod: "cash",
      invoice_type: "json",
      items: items.map((item: HelloCashItem) => ({
        item_name: item.name,
        item_quantity: item.quantity.toFixed(3), // Must be string with 3 decimals
        item_price: item.price.toFixed(2), // Must be string with 2 decimals
        item_taxRate: item.tax.toString(), // Must be string
        item_type: "article", // Required field
        item_discount_unit: "percent",
        item_discount_value: "0",
        item_service_id: "0",
      })),
    }

    console.log("[v0] [create-invoice] Creating helloCash invoice for order:", orderNumber)
    console.log("[v0] [create-invoice] Payload:", JSON.stringify(invoicePayload, null, 2))
    console.log("[v0] [create-invoice] API URL: https://api.hellocash.business/api/v1/invoices")

    const response = await fetch("https://api.hellocash.business/api/v1/invoices", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${helloCashToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invoicePayload),
    })

    console.log("[v0] [create-invoice] Response status:", response.status)
    console.log("[v0] [create-invoice] Response status text:", response.statusText)
    console.log(
      "[v0] [create-invoice] Response headers:",
      JSON.stringify(Object.fromEntries(response.headers.entries())),
    )

    const responseText = await response.text()
    console.log("[v0] [create-invoice] Response body (first 500 chars):", responseText.substring(0, 500))

    if (!response.ok) {
      console.error("[v0] [create-invoice] helloCash API error - Status:", response.status)
      console.error("[v0] [create-invoice] helloCash API error - Body:", responseText.substring(0, 1000))
      throw new Error(`helloCash API returned ${response.status}: ${responseText.substring(0, 200)}`)
    }

    let invoiceData
    try {
      invoiceData = JSON.parse(responseText)
    } catch (parseError) {
      console.error("[v0] [create-invoice] Failed to parse response as JSON")
      console.error("[v0] [create-invoice] Response was:", responseText.substring(0, 1000))
      throw new Error("helloCash API returned invalid JSON")
    }

    console.log("[v0] [create-invoice] helloCash invoice created successfully")
    console.log("[v0] [create-invoice] Invoice ID:", invoiceData.invoice_id)
    console.log("[v0] [create-invoice] Invoice Number:", invoiceData.invoice_number)

    return NextResponse.json({
      id: invoiceData.invoice_id,
      number: invoiceData.invoice_number,
      status: "paid",
    })
  } catch (error: any) {
    console.error("[v0] [create-invoice] Invoice creation error:", error)
    return NextResponse.json(
      {
        error: "Failed to create invoice",
        message: error.message,
      },
      { status: 500 },
    )
  }
}
