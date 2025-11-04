import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/api-auth"
import QRCode from "qrcode"
import { put } from "@vercel/blob"

export async function POST(req: Request) {
  try {
    await requireAdmin(req as any)

    const supabase = await createAdminClient()

    // Get orders without QR codes or with expired QR codes
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, order_number, pickup_token, qr_code_url, qr_code_expires_at")
      .or("qr_code_url.is.null,qr_code_expires_at.lt." + new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(100) // Process max 100 orders at a time

    if (ordersError) {
      console.error("[v0] Error fetching orders:", ordersError)
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ message: "No orders need QR code regeneration", count: 0 })
    }

    console.log(`[v0] Regenerating QR codes for ${orders.length} orders`)

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Process each order
    for (const order of orders) {
      try {
        const pickupUrl = `https://suedfruechte-hohenlohe.de/pos/pickup?token=${order.pickup_token}`

        const qrCodeDataUrl = await QRCode.toDataURL(pickupUrl, {
          width: 400,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        })

        // Convert data URL to Blob (works in both browser and server)
        const base64Data = qrCodeDataUrl.split(",")[1]
        const binaryData = atob(base64Data)
        const bytes = new Uint8Array(binaryData.length)
        for (let i = 0; i < binaryData.length; i++) {
          bytes[i] = binaryData.charCodeAt(i)
        }
        const qrBlob = new Blob([bytes], { type: "image/png" })

        const fileName = `qr-codes/${order.pickup_token}.png`
        const blob = await put(fileName, qrBlob, {
          access: "public",
        })

        const now = new Date()
        const expiresAt = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000) // +45 days

        const { error: updateError } = await supabase
          .from("orders")
          .update({
            qr_code_url: blob.url,
            qr_code_type: "order",
            qr_code_generated_at: now.toISOString(),
            qr_code_expires_at: expiresAt.toISOString(),
          })
          .eq("id", order.id)

        if (updateError) {
          throw new Error(`Update failed: ${updateError.message}`)
        }

        successCount++
        console.log(`[v0] QR code regenerated for order ${order.order_number}`)
      } catch (error: any) {
        errorCount++
        const errorMsg = `Order ${order.order_number}: ${error.message}`
        errors.push(errorMsg)
        console.error(`[v0] ${errorMsg}`)
      }
    }

    return NextResponse.json({
      message: "QR code regeneration completed",
      total: orders.length,
      success: successCount,
      errors: errorCount,
      errorDetails: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error("[v0] QR regeneration error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
