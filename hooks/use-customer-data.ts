"use client"
import { useState, useEffect, useCallback } from "react"
import type { ExtendedCustomer, FavoriteProduct } from "@/types/customer"

type RpcCustomerRow = {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  street?: string
  house_number?: string
  postal_code?: string
  city?: string
  country?: string
  newsletter_subscribed?: boolean
  notes?: string | null
  created_at?: string
  updated_at?: string
  order_count?: number
  total_spent?: number
  avg_order_value?: number
  last_order_date?: string | null
  days_since_last_order?: number | null
  favorite_products?: FavoriteProduct[] | null
  favorite_categories?: string[]
  account_status?: "has_account" | "no_account"
  customer_status?: "active" | "inactive" | "blocked"
}

function mapRpcToCustomer(row: RpcCustomerRow): ExtendedCustomer {
  return {
    id: row.id,
    email: row.email,
    first_name: row.first_name,
    last_name: row.last_name,
    phone: row.phone,
    street: row.street,
    house_number: row.house_number,
    postal_code: row.postal_code,
    city: row.city,
    country: row.country,
    newsletter_subscribed: row.newsletter_subscribed ?? false,
    notes: row.notes ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    order_count: row.order_count ?? 0,
    total_spent: row.total_spent ?? 0,
    avg_order_value: row.avg_order_value ?? 0,
    last_order_date: row.last_order_date ?? null,
    days_since_last_order: row.days_since_last_order ?? null,
    favorite_products: Array.isArray(row.favorite_products) ? row.favorite_products : [],
    favorite_categories: Array.isArray(row.favorite_categories) ? row.favorite_categories : [],
    account_status: row.account_status ?? "no_account",
    customer_status: row.customer_status ?? "active",
    tags: Array.isArray(row.favorite_categories) ? row.favorite_categories : [],
  }
}

type LoadOptions = { q?: string; limit?: number; offset?: number }

export function useCustomerData() {
  const [customers, setCustomers] = useState<ExtendedCustomer[]>([])
  const [loading, setLoading] = useState(false)
  const [lastQuery, setLastQuery] = useState<LoadOptions | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(50) // 50 customers per page

  const loadCustomers = useCallback(async (opts?: LoadOptions) => {
    console.log("[v0] [useCustomerData] Loading customers with options:", opts)
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (opts?.q) {
        params.set("q", opts.q)
        params.set("limit", "999999") // No limit for search
      } else {
        if (opts?.limit) params.set("limit", String(opts.limit))
        if (opts?.offset) params.set("offset", String(opts.offset))
      }

      const res = await fetch(`/api/crm/customers?${params.toString()}`, { method: "GET" })
      const json = await res.json()

      if (!res.ok) {
        console.error("[v0] [useCustomerData] API error:", json)
        throw new Error(json?.error || "Fetch error")
      }

      const rows: RpcCustomerRow[] = Array.isArray(json?.customers)
        ? json.customers
        : Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json)
            ? json
            : []

      const mapped = rows.map(mapRpcToCustomer)

      console.log("[v0] [useCustomerData] Successfully loaded", mapped.length, "customers")
      setCustomers(mapped)
      setTotalCount(json?.total || mapped.length)
      setLastQuery(opts || {})
    } catch (e) {
      console.error("[v0] [useCustomerData] Load error:", e)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadPage = useCallback(
    (page: number) => {
      setCurrentPage(page)
      const offset = (page - 1) * pageSize
      loadCustomers({ limit: pageSize, offset })
    },
    [pageSize, loadCustomers],
  )

  const nextPage = useCallback(() => {
    const totalPages = Math.ceil(totalCount / pageSize)
    if (currentPage < totalPages) {
      loadPage(currentPage + 1)
    }
  }, [currentPage, totalCount, pageSize, loadPage])

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      loadPage(currentPage - 1)
    }
  }, [currentPage, loadPage])

  const saveCustomer = useCallback(
    async (customer: ExtendedCustomer) => {
      console.log("[v0] [useCustomerData] Saving customer:", customer.id)

      const payload = {
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email,
        phone: customer.phone || null,
        city: customer.city || null,
        street: customer.street || null,
        house_number: customer.house_number || null,
        postal_code: customer.postal_code || null,
        account_status: customer.account_status || "no_account",
        customer_status: customer.customer_status || "active",
        favorite_categories: customer.favorite_categories ?? customer.tags ?? [],
      }

      const res = await fetch("/api/crm/customer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: customer.id, payload }),
      })

      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        console.error("[v0] [useCustomerData] Save error:", j)
        throw new Error(j.error || "Update failed")
      }

      console.log("[v0] [useCustomerData] Customer saved successfully")
      await loadCustomers(lastQuery || undefined)
    },
    [lastQuery, loadCustomers],
  )

  const deleteCustomer = useCallback(
    async (id: string) => {
      console.log("[v0] [useCustomerData] Deleting customer:", id)

      const res = await fetch("/api/crm/customer", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        console.error("[v0] [useCustomerData] Delete error:", j)
        throw new Error(j.error || "Delete failed")
      }

      console.log("[v0] [useCustomerData] Customer deleted successfully")
      await loadCustomers(lastQuery || undefined)
    },
    [lastQuery, loadCustomers],
  )

  useEffect(() => {
    loadPage(1)
  }, [loadPage])

  return {
    customers,
    loading,
    loadCustomers,
    saveCustomer,
    deleteCustomer,
    currentPage,
    pageSize,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
    nextPage,
    prevPage,
    loadPage,
  }
}
