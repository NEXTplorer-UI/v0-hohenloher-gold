import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: Request, { params }: { params: { orderId: string } }) {
  try {
    const { orderId } = params
    const { searchParams } = new URL(req.url)
    const cancellation = searchParams.get("cancellation") === "true"

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("hellocash_invoice_id, hellocash_invoice_number, order_number")
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (!order.hellocash_invoice_id) {
      return NextResponse.json({ error: "No invoice found for this order" }, { status: 404 })
    }

    const helloCashToken = process.env.HELLOCASH_API_TOKEN
    if (!helloCashToken) {
      throw new Error("HELLOCASH_API_TOKEN not configured")
    }

    console.log("[v0] Fetching PDF for invoice:", order.hellocash_invoice_number)

    const pdfResponse = await fetch(
      `https://api.hellocash.business/api/v1/invoices/${order.hellocash_invoice_id}/pdf?cancellation=${cancellation}&locale=de_DE`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${helloCashToken}`,
        },
      },
    )

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text()
      console.error("[v0] helloCash PDF API error:", errorText)
      throw new Error(`helloCash API returned ${pdfResponse.status}`)
    }

    const pdfData = await pdfResponse.json()

    if (!pdfData.pdf_base64_encoded) {
      throw new Error("No PDF data received from helloCash")
    }

    const pdfBuffer = Buffer.from(pdfData.pdf_base64_encoded, "base64")

    const filename = cancellation ? `Storno_${order.order_number}.pdf` : `Rechnung_${order.order_number}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    })
  } catch (error: any) {
    console.error("[v0] PDF download error:", error)
    return NextResponse.json(
      {
        error: "Failed to download invoice PDF",
        message: error.message,
      },
      { status: 500 },
    )
  }
}
