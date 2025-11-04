import { createClient } from "@supabase/supabase-js"

interface HelloCashItem {
  name: string
  quantity: number
  price: number
  tax: number
}

interface CreateInvoiceResult {
  success: boolean
  invoiceId?: string
  invoiceNumber?: string
  error?: string
}

/**
 * Creates a helloCash invoice after payment confirmation
 * This function should be called from all payment confirmation points:
 * - mark-paid (QR code payment)
 * - update-order-status (manual admin marking)
 * - sumup webhook (SumUp payment)
 */
export async function createInvoiceAfterPayment(orderId: string): Promise<CreateInvoiceResult> {
  try {
    console.log("[v0] [create-invoice-after-payment] Creating invoice for order:", orderId)

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // 1. Fetch order with items
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      throw new Error("Order not found: " + orderError?.message)
    }

    // 2. Check if invoice already exists
    if (order.hellocash_invoice_id) {
      console.log("[v0] [create-invoice-after-payment] Invoice already exists:", order.hellocash_invoice_number)
      return {
        success: true,
        invoiceId: order.hellocash_invoice_id,
        invoiceNumber: order.hellocash_invoice_number,
      }
    }

    const helloCashToken = process.env.HELLOCASH_API_TOKEN
    if (!helloCashToken) {
      console.warn("[v0] [create-invoice-after-payment] HELLOCASH_API_TOKEN not configured, skipping invoice creation")
      return {
        success: false,
        error: "helloCash API token not configured. Please add HELLOCASH_API_TOKEN environment variable.",
      }
    }

    console.log("[v0] [create-invoice-after-payment] Token configured - length:", helloCashToken.length)
    console.log("[v0] [create-invoice-after-payment] Token starts with:", helloCashToken.substring(0, 15) + "...")

    let customerData = null
    if (order.customer_id) {
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", order.customer_id)
        .single()

      if (!customerError && customer) {
        customerData = customer
        console.log("[v0] [create-invoice-after-payment] Customer data found:", customer.email)
      } else {
        console.log("[v0] [create-invoice-after-payment] No customer data found or error:", customerError?.message)
      }
    }

    // 3. Prepare helloCash invoice items
    const items = order.order_items.map((item: any) => ({
      item_name: item.product_name,
      item_quantity: item.quantity.toFixed(3),
      item_price: item.unit_price.toFixed(2),
      item_taxRate: (item.vat_rate ?? 7.0).toString(),
      item_type: "article",
      item_service_id: "0",
    }))

    console.log("[v0] [create-invoice-after-payment] Prepared items:", items.length)

    const invoicePayload: any = {
      invoice_reference: order.order_number, // Order number as reference
      invoice_text: `Bestellung: ${order.order_number}`,
      invoice_paymentMethod: order.payment_method || "cash",
      invoice_type: "json",
      items,
    }

    if (customerData) {
      const fullName = `${customerData.first_name || ""} ${customerData.last_name || ""}`.trim()
      const fullAddress =
        customerData.street && customerData.house_number
          ? `${customerData.street} ${customerData.house_number}`.trim()
          : customerData.address || ""

      if (fullName) {
        invoicePayload.customer_name = fullName
      }
      if (customerData.email) {
        invoicePayload.customer_email = customerData.email
      }
      if (customerData.phone) {
        invoicePayload.customer_phoneNumber = customerData.phone
      }
      if (fullAddress) {
        invoicePayload.customer_address = fullAddress
      }
      if (customerData.postal_code) {
        invoicePayload.customer_zip = customerData.postal_code
      }
      if (customerData.city) {
        invoicePayload.customer_city = customerData.city
      }
      if (customerData.country) {
        invoicePayload.customer_country = customerData.country
      }

      console.log("[v0] [create-invoice-after-payment] Customer data added to invoice:", fullName)
    } else {
      console.log("[v0] [create-invoice-after-payment] No customer data available for this order")
    }

    console.log("[v0] [create-invoice-after-payment] Payload:", JSON.stringify(invoicePayload, null, 2))
    console.log("[v0] [create-invoice-after-payment] Calling helloCash API directly...")

    const response = await fetch("https://api.hellocash.business/api/v1/invoices", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${helloCashToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invoicePayload),
    })

    console.log("[v0] [create-invoice-after-payment] Response status:", response.status)
    console.log("[v0] [create-invoice-after-payment] Response status text:", response.statusText)
    console.log(
      "[v0] [create-invoice-after-payment] Response headers:",
      JSON.stringify(Object.fromEntries(response.headers.entries())),
    )

    const responseText = await response.text()
    console.log("[v0] [create-invoice-after-payment] Response body (first 500 chars):", responseText.substring(0, 500))

    if (!response.ok) {
      console.error("[v0] [create-invoice-after-payment] helloCash API error - Status:", response.status)
      console.error("[v0] [create-invoice-after-payment] helloCash API error - Body:", responseText)
      throw new Error(`helloCash API returned ${response.status}: ${responseText.substring(0, 200)}`)
    }

    // Parse response
    let invoiceData
    try {
      invoiceData = JSON.parse(responseText)
    } catch (parseError) {
      console.error("[v0] [create-invoice-after-payment] Failed to parse JSON response")
      throw new Error("helloCash API returned invalid JSON")
    }

    console.log("[v0] [create-invoice-after-payment] Invoice created successfully")
    console.log("[v0] [create-invoice-after-payment] Invoice ID:", invoiceData.invoice_id)
    console.log("[v0] [create-invoice-after-payment] Invoice Number:", invoiceData.invoice_number)

    // 5. Update order with invoice info
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        hellocash_invoice_id: invoiceData.invoice_id,
        hellocash_invoice_number: invoiceData.invoice_number,
        hellocash_status: "paid",
        pos_synced_at: new Date().toISOString(),
      })
      .eq("id", orderId)

    if (updateError) {
      throw new Error("Failed to update order: " + updateError.message)
    }

    console.log("[v0] [create-invoice-after-payment] Order updated successfully")

    return {
      success: true,
      invoiceId: invoiceData.invoice_id,
      invoiceNumber: invoiceData.invoice_number,
    }
  } catch (err: any) {
    console.error("[v0] [create-invoice-after-payment] Error:", err.message)

    // Save error to database
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      await supabase
        .from("orders")
        .update({
          hellocash_status: "failed",
          hellocash_error_message: err.message,
        })
        .eq("id", orderId)
    } catch (dbError) {
      console.error("[v0] [create-invoice-after-payment] Failed to save error:", dbError)
    }

    return {
      success: false,
      error: err.message,
    }
  }
}
