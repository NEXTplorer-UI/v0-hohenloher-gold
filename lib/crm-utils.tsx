import { getBrowserClient } from "@/lib/supabase/browser"

const supabaseBrowser = getBrowserClient()

export interface CustomerData {
  firstName: string
  lastName: string
  email: string
  phone: string
  street: string
  houseNumber: string
  zip: string
  city: string
  category: string
  notes: string
  deliveryMethod: string
  paymentMethod: string
  emailReminder: boolean
  emailUpdates: boolean
  createAccount: boolean
  isTest?: boolean // Added optional test flag
}

export interface UserAccountData extends CustomerData {
  password: string
}

export interface OrderData {
  orderNumber: string
  customerName: string
  email: string
  phone: string
  items: Array<{
    id: number
    name: string
    price: string
    unit: string
    origin: string
    category: string
    quantity: number
  }>
  total: string
  deliveryMethod: string
  paymentMethod: string
  pickupLocation: string
  deliveryDate?: string | null
  pickupStartTime?: string | null
  pickupEndTime?: string | null
  isTest?: boolean // Added optional test flag
  pickupToken?: string // Added optional pickup token
}

export async function saveCustomerToCRM(customerData: CustomerData) {
  try {
    console.log("[v0] Saving customer to CRM:", customerData)

    const response = await fetch("/api/crm/customer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(customerData),
    })

    const contentType = response.headers.get("content-type")
    let result

    if (contentType && contentType.includes("application/json")) {
      result = await response.json()
    } else {
      const text = await response.text()
      console.error("[v0] Non-JSON response from CRM API:", text)
      throw new Error("Server returned non-JSON response")
    }

    if (!response.ok) {
      console.error("[v0] Error saving customer to CRM:", result.error)
      throw new Error(result.error || `Failed to save customer (${response.status})`)
    }

    console.log("[v0] Customer saved to CRM successfully:", result.data)
    return { success: true, data: result.data }
  } catch (error) {
    console.error("[v0] CRM save error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function createUserAccount(userData: UserAccountData) {
  try {
    console.log("[v0] Creating user account:", { email: userData.email })

    const checkResponse = await fetch("/api/crm/check-customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userData.email }),
    })

    const checkResult = await checkResponse.json()

    if (checkResult.existsInCRM && checkResult.hasUserId) {
      console.log("[v0] Customer already has an account:", userData.email)
      return {
        success: false,
        error: { message: "Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an." },
      }
    }

    const isLocalhost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")

    const redirectUrl = isLocalhost
      ? process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
      : process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "")

    console.log("[v0] Using redirect URL:", redirectUrl)

    const { data: authData, error: authError } = await supabaseBrowser.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        emailRedirectTo: `${redirectUrl}/customer/account-confirmed`,
        data: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone,
          street: userData.street,
          houseNumber: userData.houseNumber,
          zip: userData.zip,
          city: userData.city,
        },
      },
    })

    if (authError) {
      console.error("[v0] Auth signup error:", authError)

      if (authError.message.includes("already registered")) {
        return {
          success: false,
          error: { message: "Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an." },
        }
      }

      throw authError
    }

    if (checkResult.existsInCRM && !checkResult.hasUserId && authData.user) {
      console.log("[v0] Linking existing CRM customer to new auth account")

      const linkResponse = await fetch("/api/crm/link-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userData.email,
          userId: authData.user.id,
        }),
      })

      if (!linkResponse.ok) {
        console.error("[v0] Failed to link user to CRM customer")
      } else {
        console.log("[v0] Successfully linked auth account to existing CRM customer")
      }
    }

    try {
      await fetch("/api/admin/notify-new-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userData.email,
          name: `${userData.firstName} ${userData.lastName}`,
          userId: authData.user?.id,
        }),
      })
    } catch (notifyError) {
      console.error("[v0] Failed to send admin notification:", notifyError)
    }

    console.log("[v0] Account created successfully, confirmation email sent")
    return { success: true, data: authData }
  } catch (error) {
    console.error("[v0] Account creation error:", error)
    return { success: false, error }
  }
}

export async function sendOrderConfirmationEmail(orderData: OrderData) {
  try {
    console.log("[v0] Sending order confirmation email:", {
      orderNumber: orderData.orderNumber,
      email: orderData.email,
    })

    const orderItems = orderData.items.map((item) => ({
      product_name: item.name,
      quantity: item.quantity,
      product_size: item.unit, // Pass the unit as product_size
      unit_price: Number.parseFloat(item.price),
      total_price: item.quantity * Number.parseFloat(item.price),
    }))

    const hasCitrusFruits = orderData.items.some(
      (item) => item.category.toLowerCase() === "citrus" || item.category.toLowerCase() === "südfrüchte",
    )

    console.log("[v0] [sendOrderConfirmationEmail] Order data received:", {
      deliveryMethod: orderData.deliveryMethod,
      deliveryDate: orderData.deliveryDate,
      pickupLocation: orderData.pickupLocation,
      hasCitrusFruits,
    })

    let formattedPickupDate: string | undefined = undefined
    if (orderData.deliveryMethod === "pickup" && orderData.deliveryDate) {
      // Add T00:00:00 to ensure local time interpretation
      const date = new Date(orderData.deliveryDate + "T00:00:00")
      formattedPickupDate = date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
      console.log("[v0] [sendOrderConfirmationEmail] Formatted pickup date:", formattedPickupDate)
    }

    if (orderData.deliveryMethod === "delivery" && orderData.deliveryDate) {
      // Add T00:00:00 to ensure local time interpretation
      const date = new Date(orderData.deliveryDate + "T00:00:00")
      formattedPickupDate = date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
      console.log("[v0] [sendOrderConfirmationEmail] Formatted delivery date:", formattedPickupDate)
    }

    console.log("[v0] [sendOrderConfirmationEmail] Sending email with:", {
      pickupDate: formattedPickupDate,
      pickupLocation: orderData.pickupLocation,
      hasCitrusFruits,
      deliveryMethod: orderData.deliveryMethod,
    })

    const response = await fetch("/api/send-order-confirmation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerEmail: orderData.email,
        customerName: orderData.customerName,
        orderId: orderData.orderNumber,
        orderTotal: orderData.total,
        paymentMethod: orderData.paymentMethod,
        deliveryMethod: orderData.deliveryMethod,
        pickupDate: formattedPickupDate,
        pickupLocation: orderData.pickupLocation, // Added pickupLocation
        pickupStartTime: orderData.pickupStartTime,
        pickupEndTime: orderData.pickupEndTime,
        orderItems,
        hasCitrusFruits,
        pickupToken: orderData.pickupToken, // Pass pickup token if available
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error("[v0] Failed to send order confirmation email:", result.error)
      return { success: false, error: result.error }
    }

    console.log("[v0] Order confirmation email sent successfully")
    return { success: true }
  } catch (error) {
    console.error("[v0] Email sending error:", error)
    return { success: false, error }
  }
}
