"use client"
import { useState, useEffect, useCallback } from "react"

interface ExtendedCustomer {
  id: string
  first_name: string
  last_name: string
  email: string
  street?: string
  house_number?: string
  postal_code?: string
  city?: string
  phone?: string
  tags: string[]
  // New fields
  account_status?: "has_account" | "no_account"
  customer_status?: "active" | "inactive" | "blocked"
  registration_date?: string
  last_activity?: string
  newsletter_subscription?: boolean
  reminder_notifications?: boolean
  special_requests?: string
  referral_source?: string
  distribution_system_benefits?: {
    participated: boolean
    total_benefits: number
    last_benefit_date?: string
  }
  order_count?: number
  average_order_value?: number
  favorite_categories?: string[]
  total_orders?: number
  total_spent?: number
  last_order_date?: string
}

export function useCustomerData() {
  const [customers, setCustomers] = useState<ExtendedCustomer[]>([])
  const [loading, setLoading] = useState(true)

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/load-customers")
      if (!response.ok) {
        throw new Error("Failed to load customers")
      }
      const result = await response.json()
      const customersArray = Array.isArray(result) ? result : result.data || []

      setCustomers(customersArray)
    } catch (error) {
      console.error("Error loading customers:", error)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [])

  const saveCustomer = useCallback(
    async (customer: ExtendedCustomer) => {
      console.log("[v0] Saving customer:", customer.id, customer.first_name, customer.last_name)
      console.log("[v0] Customer data being saved:", {
        account_status: customer.account_status,
        reminder_notifications: customer.reminder_notifications,
        newsletter_subscription: customer.newsletter_subscription,
      })

      const response = await fetch("/api/update-customer", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(customer),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[v0] Failed to update customer:", errorData)
        throw new Error(`Failed to update customer: ${errorData.error || response.statusText}`)
      }

      const result = await response.json()
      console.log("[v0] Customer update result:", result)

      await loadCustomers()
    },
    [loadCustomers],
  )

  const deleteCustomer = useCallback(
    async (customerId: string) => {
      const response = await fetch(`/api/delete-customer/${customerId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete customer")
      }

      await loadCustomers()
    },
    [loadCustomers],
  )

  // Load customers on mount
  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  return {
    customers,
    loading,
    loadCustomers,
    saveCustomer,
    deleteCustomer,
  }
}
