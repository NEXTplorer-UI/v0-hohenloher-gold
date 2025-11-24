import { getAdminClient } from "@/lib/supabase/admin"

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
 * Maps database payment method to HelloCash payment method
 */
function mapPaymentMethodToHelloCash(paymentMethod: string): string {
  const mapping: Record<string, string> = {
    cash: "Bar",
    card: "EC-Karte",
    bank_transfer: "Rechnung",
    sumup: "SumUp",
    paypal: "PayPal",
    coupon: "Gutschein",
  }

  return mapping[paymentMethod] || "Bar" // Default to Bar if unknown
}

/**
 * Creates a helloCash invoice after payment confirmation
 * This function should be called from all payment confirmation points:
 * - mark-paid (QR code payment)
 * - update-order-status (manual admin marking)
 * - sumup webhook (SumUp payment)
 */
export async function createInvoiceAfterPayment(
  orderId: string,
  manualPaymentMethod?: string,
  testMode?: boolean, // Added testMode parameter
  discountPercent?: number, // Changed from discount (euro amount) to discountPercent
  cashierId?: number, // Added cashierId parameter
  invoiceText?: string, // Added invoiceText parameter for custom invoice text
): Promise<CreateInvoiceResult> {
  try {
    console.log("[v0] [create-invoice-after-payment] Creating invoice for order:", orderId)
    console.log("[v0] [create-invoice-after-payment] Test mode:", testMode ? "ENABLED" : "DISABLED")
    console.log(
      "[v0] [create-invoice-after-payment] Discount percent:",
      discountPercent ? `${discountPercent}%` : "None",
    )
    console.log("[v0] [create-invoice-after-payment] Cashier ID:", cashierId || "None")
    if (invoiceText) {
      console.log("[v0] [create-invoice-after-payment] Custom invoice text:", invoiceText)
    }

    const supabase = getAdminClient()

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      throw new Error("Order not found: " + orderError?.message)
    }

    // Check if invoice already exists
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
    let helloCashUserId: number | null = null

    if (order.customer_id) {
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", order.customer_id)
        .single()

      if (!customerError && customer) {
        customerData = customer
        console.log("[v0] [create-invoice-after-payment] Customer data found:", customer.email)

        if (customer.hellocash_user_id) {
          helloCashUserId = customer.hellocash_user_id
          console.log("[v0] [create-invoice-after-payment] Using existing HelloCash user ID:", helloCashUserId)
        } else {
          // Try to create HelloCash user
          try {
            console.log("[v0] [create-invoice-after-payment] Creating HelloCash user for customer...")

            const helloCashUserData: any = {
              user_firstName: customer.first_name || "",
              user_surName: customer.last_name || "",
              user_email: customer.email || "",
            }

            if (customer.phone) helloCashUserData.user_phoneNumber = customer.phone
            if (customer.street) helloCashUserData.user_street = customer.street
            if (customer.house_number) helloCashUserData.user_houseNumber = customer.house_number
            if (customer.postal_code) helloCashUserData.user_postalCode = customer.postal_code
            if (customer.city) helloCashUserData.user_city = customer.city
            if (customer.country) helloCashUserData.user_country = customer.country

            const userResponse = await fetch("https://api.hellocash.business/api/v1/users", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${helloCashToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(helloCashUserData),
            })

            if (userResponse.ok) {
              const userData = await userResponse.json()
              helloCashUserId = userData.user_id
              console.log("[v0] [create-invoice-after-payment] Created HelloCash user, ID:", helloCashUserId)

              // Save user ID in database
              await supabase
                .from("customers")
                .update({ hellocash_user_id: helloCashUserId })
                .eq("id", order.customer_id)
            } else {
              console.warn("[v0] [create-invoice-after-payment] Failed to create HelloCash user:", userResponse.status)
            }
          } catch (userError) {
            console.warn("[v0] [create-invoice-after-payment] Error creating HelloCash user:", userError)
          }
        }
      } else {
        console.log("[v0] [create-invoice-after-payment] No customer data found or error:", customerError?.message)
      }
    }

    // Prepare helloCash invoice items
    const items = order.order_items.map((item: any) => ({
      item_name: item.product_name,
      item_quantity: item.quantity.toFixed(3),
      item_price: item.unit_price.toFixed(2),
      item_taxRate: (item.vat_rate ?? 7.0).toString(),
      item_type: "article",
      item_service_id: "0",
    }))

    console.log("[v0] [create-invoice-after-payment] Prepared items:", items.length)

    const paymentMethod = manualPaymentMethod || order.payment_method || "cash"
    const helloCashPaymentMethod = mapPaymentMethodToHelloCash(paymentMethod)

    console.log(`[v0] [create-invoice-after-payment] Payment method: ${paymentMethod} → ${helloCashPaymentMethod}`)

    const invoicePayload: any = {
      invoice_paymentMethod: helloCashPaymentMethod, // Use mapped payment method
      invoice_type: "json",
      items,
    }

    if (testMode) {
      invoicePayload.invoice_testMode = true
      console.log("[v0] [create-invoice-after-payment] Test mode enabled - invoice_testMode set to true")
    }

    if (discountPercent && discountPercent > 0) {
      invoicePayload.invoice_discount_percent = discountPercent
      console.log("[v0] [create-invoice-after-payment] Discount percent added:", discountPercent)
    }

    if (cashierId) {
      invoicePayload.cashier_id = cashierId
      console.log("[v0] [create-invoice-after-payment] Cashier ID added:", cashierId)
    }

    if (helloCashUserId) {
      invoicePayload.invoice_user_id = helloCashUserId
      console.log("[v0] [create-invoice-after-payment] Using HelloCash user ID for invoice:", helloCashUserId)
    }

    if (order.order_time) {
      invoicePayload.invoice_date = order.order_time
    }

    if (order.pickup_date) {
      invoicePayload.invoice_dueDate = order.pickup_date
    }

    // Only invoice_text is supported
    // if (order.notes) {
    //   invoicePayload.invoice_notes = order.notes
    // }

    if (invoiceText) {
      invoicePayload.invoice_text = invoiceText
      console.log("[v0] [create-invoice-after-payment] Custom invoice text added to payload")
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

    try {
      const supabase = getAdminClient()
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
