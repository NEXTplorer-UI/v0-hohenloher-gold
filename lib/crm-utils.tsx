import { createClient } from "@supabase/supabase-js"

const supabaseBrowser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

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

    const result = await response.json()

    if (!response.ok) {
      console.error("[v0] Error saving customer to CRM:", result.error)
      throw new Error(result.error)
    }

    console.log("[v0] Customer saved to CRM successfully:", result.data)
    return { success: true, data: result.data }
  } catch (error) {
    console.error("[v0] CRM save error:", error)
    return { success: false, error }
  }
}

export async function createUserAccount(userData: UserAccountData) {
  try {
    console.log("[v0] Creating user account:", { email: userData.email })

    const { data: existingUsers, error: listError } = await supabaseBrowser.auth.admin.listUsers()

    if (!listError) {
      const userExists = existingUsers.users.some((user) => user.email === userData.email)
      if (userExists) {
        console.log("[v0] User already exists in auth:", userData.email)
        return {
          success: false,
          error: { message: "User already registered. Please sign in instead." },
        }
      }
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseBrowser.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin,
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

    const response = await fetch("/api/send-order-confirmation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerEmail: orderData.email,
        customerName: orderData.customerName,
        orderId: orderData.orderNumber,
        orderTotal: `€${orderData.total}`,
        paymentMethod: orderData.paymentMethod,
        deliveryMethod: orderData.deliveryMethod,
        pickupDate: orderData.deliveryMethod === "pickup" ? "15. Dezember 2024" : undefined,
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
