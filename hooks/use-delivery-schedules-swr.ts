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

export function useDeliverySchedulesSWR() {
  const { data, error, isLoading, mutate } = useSWR<DeliverySchedule[]>("/api/delivery-schedules", {
    revalidateOnMount: true,
    dedupingInterval: 30000, // Cache for 30 seconds
  })

  return {
    schedules: data || [],
    isLoading,
    isError: error,
    refresh: mutate,
    getNextDelivery: () => {
      if (!data || data.length === 0) return null

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const futureSchedules = data.filter((schedule) => {
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
