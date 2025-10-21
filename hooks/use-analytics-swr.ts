import useSWR from "swr"

interface DashboardStats {
  totalRevenue: number
  totalOrders: number
  totalCustomers: number
  averageOrderValue: number
  revenueGrowth: number
  ordersGrowth: number
}

export function useAnalyticsSWR() {
  const { data, error, isLoading, mutate } = useSWR<DashboardStats>("/api/analytics/dashboard-stats", {
    revalidateOnMount: true,
    dedupingInterval: 300000, // Cache for 5 minutes (analytics don't need real-time updates)
  })

  return {
    stats: data,
    isLoading,
    isError: error,
    refresh: mutate,
  }
}
