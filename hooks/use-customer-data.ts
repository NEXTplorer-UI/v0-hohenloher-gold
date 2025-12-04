"use client"
import { useCallback, useState } from "react"
import useSWR from "swr"
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
  pickup_location_name?: string | null
  distribution_person_name?: string | null
  special_requests?: string | null
}

function mapRpcToCustomer(row: RpcCustomerRow): ExtendedCustomer {
  return {
    id: row.id,
    email: row.email,
    first_name: row.first_name,
    last_name: row.last_name,
    name: `${row.first_name} ${row.last_name}`.trim(),
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
    pickup_location_name: row.pickup_location_name ?? null,
    distribution_person_name: row.distribution_person_name ?? null,
    special_requests: row.special_requests ?? null,
  }
}

type LoadOptions = { q?: string; limit?: number; offset?: number }

const fetcher = async (url: string) => {
  const res = await fetch(url, { method: "GET" })
  const json = await res.json()

  if (!res.ok) {
    throw new Error(json?.error || "Fetch error")
  }

  const rows: RpcCustomerRow[] = Array.isArray(json?.customers)
    ? json.customers
    : Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json)
        ? json
        : []

  return {
    customers: rows.map(mapRpcToCustomer),
    total: json?.total || rows.length,
  }
}

export function useCustomerData() {
  const pageSize = 50
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams()
    if (searchTerm) {
      params.set("q", searchTerm)
      params.set("limit", "999999")
    } else {
      params.set("limit", String(pageSize))
      params.set("offset", String((currentPage - 1) * pageSize))
    }
    return `/api/crm/customers?${params.toString()}`
  }, [currentPage, searchTerm, pageSize])

  const { data, error, mutate, isLoading } = useSWR(buildUrl(), fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000, // 1 minute
    keepPreviousData: true,
  })

  const customers = data?.customers || []
  const totalCount = data?.total || 0
  const loading = isLoading

  const loadCustomers = useCallback(
    async (opts?: LoadOptions) => {
      if (opts?.q !== undefined) {
        setSearchTerm(opts.q)
        setCurrentPage(1)
      } else if (opts?.offset !== undefined && opts?.limit !== undefined) {
        const page = Math.floor(opts.offset / opts.limit) + 1
        setCurrentPage(page)
        setSearchTerm("")
      } else {
        await mutate()
      }
    },
    [mutate],
  )

  const loadPage = useCallback((page: number) => {
    setCurrentPage(page)
    setSearchTerm("")
  }, [])

  const nextPage = useCallback(() => {
    const totalPages = Math.ceil(totalCount / pageSize)
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1)
    }
  }, [currentPage, totalCount, pageSize])

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1)
    }
  }, [currentPage])

  const saveCustomer = useCallback(
    async (customer: ExtendedCustomer) => {
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
        newsletter_subscribed: customer.newsletter_subscribed ?? false,
        pickup_location_name: customer.pickup_location_name || null,
        distribution_person_name: customer.distribution_person_name || null,
        special_requests: customer.special_requests || null,
      }

      const res = await fetch("/api/crm/customer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: customer.id, payload }),
      })

      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "Update failed")
      }

      await mutate()
    },
    [mutate],
  )

  const deleteCustomer = useCallback(
    async (id: string) => {
      const res = await fetch("/api/crm/customer", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "Delete failed")
      }

      await mutate()
    },
    [mutate],
  )

  return {
    customers,
    loading,
    error,
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
