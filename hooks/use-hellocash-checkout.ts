"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import QRCode from "qrcode"

interface HelloCashItem {
  name: string
  quantity: number
  price: number
  tax: number
}

interface HelloCashInvoice {
  id: string
  number: string
  status: string
}

export function useHelloCashCheckout() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const generateQRCodeForOrder = async (orderId: string) => {
    setIsGenerating(true)
    setError(null)

    try {
      console.log("[v0] Starting QR code generation for order:", orderId)

      // 1. Fetch order with items
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", orderId)
        .single()

      if (orderError || !order) {
        throw new Error("Order not found: " + orderError?.message)
      }

      console.log("[v0] Order loaded:", order.order_number)

      // 2. Validate order status
      if (order.qr_code_url && order.qr_code_expires_at) {
        const expiresAt = new Date(order.qr_code_expires_at)
        if (expiresAt > new Date()) {
          console.log("[v0] Valid QR code already exists, skipping generation")
          return {
            success: true,
            qrCodeUrl: order.qr_code_url,
            pickupToken: order.pickup_token,
            message: "QR code already exists and is valid",
          }
        }
      }

      // 3. Prepare helloCash invoice items
      const items: HelloCashItem[] = order.order_items.map((item: any) => ({
        name: item.product_name,
        quantity: item.quantity,
        price: item.unit_price,
        tax: item.vat_rate ?? 7.0, // Default to 7% if not set
      }))

      console.log("[v0] Prepared items for helloCash:", items.length)

      // 4. Create helloCash draft invoice
      const helloCashResponse = await fetch("/api/hellocash/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: order.order_number,
          customerEmail: order.customer_email,
          items,
          totalAmount: order.total_amount,
        }),
      })

      if (!helloCashResponse.ok) {
        const errorData = await helloCashResponse.json()
        throw new Error(`helloCash API error: ${errorData.message || "Unknown error"}`)
      }

      const helloCashInvoice: HelloCashInvoice = await helloCashResponse.json()
      console.log("[v0] helloCash invoice created:", helloCashInvoice.number)

      // 5. Generate QR code with pickup token
      const pickupUrl = `${window.location.origin}/pos/pickup?token=${order.pickup_token}`
      const qrCodeDataUrl = await QRCode.toDataURL(pickupUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })

      console.log("[v0] QR code generated")

      // 6. Convert data URL to blob
      const blob = await fetch(qrCodeDataUrl).then((r) => r.blob())

      // 7. Upload to Supabase Storage
      const fileName = `${order.pickup_token}.png`
      const { data: uploadData, error: uploadError } = await supabase.storage.from("qr-codes").upload(fileName, blob, {
        contentType: "image/png",
        upsert: true,
      })

      if (uploadError) {
        throw new Error("QR code upload failed: " + uploadError.message)
      }

      // 8. Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("qr-codes").getPublicUrl(fileName)

      console.log("[v0] QR code uploaded to storage")

      // 9. Update order with QR code and helloCash info
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000) // +45 days

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          qr_code_url: publicUrl,
          qr_code_type: "order",
          qr_code_generated_at: now.toISOString(),
          qr_code_expires_at: expiresAt.toISOString(),
          hellocash_invoice_id: helloCashInvoice.id,
          hellocash_invoice_number: helloCashInvoice.number,
          hellocash_status: "draft",
          pos_synced_at: now.toISOString(),
        })
        .eq("id", orderId)

      if (updateError) {
        throw new Error("Failed to update order: " + updateError.message)
      }

      console.log("[v0] Order updated successfully")

      return {
        success: true,
        qrCodeUrl: publicUrl,
        pickupToken: order.pickup_token,
        helloCashInvoiceNumber: helloCashInvoice.number,
        expiresAt: expiresAt.toISOString(),
      }
    } catch (err: any) {
      console.error("[v0] QR code generation failed:", err)
      setError(err.message)

      // Save error to database
      try {
        await supabase
          .from("orders")
          .update({
            hellocash_status: "failed",
            hellocash_error_message: err.message,
          })
          .eq("id", orderId)
      } catch (dbError) {
        console.error("[v0] Failed to save error to database:", dbError)
      }

      return {
        success: false,
        error: err.message,
      }
    } finally {
      setIsGenerating(false)
    }
  }

  return {
    generateQRCodeForOrder,
    isGenerating,
    error,
  }
}
