import useSWR from "swr"

interface Order {
  id: string
  order_number: string
  customer_id: string
  user_id: string
  status: string
  total: number
  created_at: string
  pickup_date?: string
  delivery_method: string
}

interface UseOrdersOptions {
  status?: string
  customerId?: string
  autoRefresh?: boolean
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error(`Failed to fetch orders: ${res.statusText}`)
    }
    return res.json()
  })

export function useOrdersSWR(options: UseOrdersOptions = {}) {
  const params = new URLSearchParams()
  if (options.status) params.append("status", options.status)
  if (options.customerId) params.append("customerId", options.customerId)

  const queryString = params.toString()
  const url = `/api/admin/orders${queryString ? `?${queryString}` : ""}`

  const { data, error, isLoading, mutate } = useSWR<Order[]>(url, fetcher, {
    refreshInterval: options.autoRefresh ? 30000 : 0, // Auto-refresh every 30s if enabled
    revalidateOnMount: true,
  })

  return {
    orders: data || [],
    isLoading,
    isError: error,
    refresh: mutate,
  }
}
