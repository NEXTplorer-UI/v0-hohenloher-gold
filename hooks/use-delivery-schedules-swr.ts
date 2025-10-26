import useSWR from "swr"

interface DeliverySchedule {
  id: string
  delivery_date: string
  status: "planned" | "confirmed" | "completed" | "cancelled"
  order_deadline: string
  notes: string | null
  pickup_start_time: string | null
  pickup_end_time: string | null
  created_at: string
  updated_at: string
  products?: Array<{
    id: number
    name: string
    category_id: number
  }>
}

const fetcher = async (url: string) => {
  console.log("[v0] Delivery schedules fetcher called for:", url)

  try {
    const res = await fetch(url)

    if (!res.ok) {
      console.error("[v0] Delivery schedules API error:", res.status, res.statusText)
      throw new Error(`API error: ${res.status} ${res.statusText}`)
    }

    const data = await res.json()
    console.log("[v0] Delivery schedules fetched successfully:", data?.length || 0, "schedules")
    return data
  } catch (error) {
    console.error("[v0] Delivery schedules fetcher error:", error)
    throw error
  }
}

export function useDeliverySchedulesSWR() {
  const { data, error, isLoading, mutate } = useSWR<DeliverySchedule[]>("/api/delivery-schedules", fetcher, {
    revalidateOnMount: true,
    dedupingInterval: 30000, // Cache for 30 seconds
  })

  const schedules = Array.isArray(data) ? data : []

  return {
    schedules,
    isLoading,
    isError: error,
    refresh: mutate,
    getNextDelivery: () => {
      if (schedules.length === 0) return null

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const futureSchedules = schedules.filter((schedule) => {
        const deliveryDate = new Date(schedule.delivery_date)
        deliveryDate.setHours(0, 0, 0, 0)
        return deliveryDate >= today
      })

      return (
        futureSchedules.sort((a, b) => new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime())[0] ||
        null
      )
    },
  }
}
