/**
 * Utility functions for managing delivery schedules for fresh fruits (Südfrüchte)
 */

export interface DeliverySchedule {
  id: string
  delivery_date: string
  status: string
  order_deadline: string
  notes?: string
  pickup_start_time?: string
  pickup_end_time?: string
  formattedDeliveryDate?: string
  formattedOrderDeadline?: string
}

/**
 * Fetches the next available delivery schedule
 * @param skipPastDeadlines If true, returns only schedules where the order deadline hasn't passed
 */
export async function getNextDeliverySchedule(skipPastDeadlines = false): Promise<DeliverySchedule | null> {
  try {
    const response = await fetch("/api/delivery-schedules")
    if (!response.ok) {
      console.error("[v0] Failed to fetch delivery schedules:", response.status)
      return null
    }

    const schedules = await response.json()

    if (!Array.isArray(schedules) || schedules.length === 0) {
      console.log("[v0] No delivery schedules available")
      return null
    }

    console.log(
      "[v0] All schedules:",
      schedules.map((s) => ({
        id: s.id,
        status: s.status,
        delivery_date: s.delivery_date,
        order_deadline: s.order_deadline,
      })),
    )

    // Filter for active schedules and sort by delivery date
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const activeSchedules = schedules
      .filter((schedule: any) => {
        const isActive = schedule.status === "confirmed" || schedule.status === "planned"

        // Check if delivery date is in the future
        const deliveryDate = new Date(schedule.delivery_date)
        const isFuture = deliveryDate >= today

        let deadlineValid = true
        if (skipPastDeadlines) {
          const orderDeadline = new Date(schedule.order_deadline)
          deadlineValid = orderDeadline >= today
          if (!deadlineValid) {
            console.log(
              `[v0] Schedule ${schedule.id} filtered out: order deadline ${schedule.order_deadline} has passed`,
            )
          }
        }

        if (!isActive) {
          console.log(
            `[v0] Schedule ${schedule.id} filtered out: status is "${schedule.status}" (expected "confirmed" or "planned")`,
          )
        }
        if (!isFuture) {
          console.log(
            `[v0] Schedule ${schedule.id} filtered out: delivery date ${schedule.delivery_date} is in the past`,
          )
        }

        return isActive && isFuture && deadlineValid
      })
      .sort((a: any, b: any) => {
        const dateA = new Date(a.delivery_date)
        const dateB = new Date(b.delivery_date)
        return dateA.getTime() - dateB.getTime()
      })

    if (activeSchedules.length === 0) {
      console.log("[v0] No active delivery schedules found")
      return null
    }

    // Return the next available schedule
    const nextSchedule = activeSchedules[0]

    // Format dates for display
    const deliveryDate = new Date(nextSchedule.delivery_date)
    const orderDeadline = new Date(nextSchedule.order_deadline)

    return {
      id: nextSchedule.id,
      delivery_date: nextSchedule.delivery_date,
      status: nextSchedule.status,
      order_deadline: nextSchedule.order_deadline,
      notes: nextSchedule.notes,
      pickup_start_time: nextSchedule.pickup_start_time || nextSchedule.pickupStartTime,
      pickup_end_time: nextSchedule.pickup_end_time || nextSchedule.pickupEndTime,
      formattedDeliveryDate: deliveryDate.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      formattedOrderDeadline: orderDeadline.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    }
  } catch (error) {
    console.error("[v0] Error fetching next delivery schedule:", error)
    return null
  }
}

/**
 * Fetches all upcoming delivery schedules
 */
export async function getAllDeliverySchedules(): Promise<DeliverySchedule[]> {
  try {
    const response = await fetch("/api/delivery-schedules")
    if (!response.ok) {
      console.error("[v0] Failed to fetch delivery schedules")
      return []
    }

    const result = await response.json()
    return result.data || []
  } catch (error) {
    console.error("[v0] Error fetching delivery schedules:", error)
    return []
  }
}

/**
 * Determines the delivery date for an order based on cart items
 * - If cart contains Südfrüchte: returns next available delivery date
 * - Otherwise: returns null (immediate fulfillment)
 */
export async function determineOrderDeliveryDate(cartItems: any[]): Promise<{
  deliveryDate: string | null
  scheduleId: string | null
  message: string
  pickupStartTime?: string | null
  pickupEndTime?: string | null
}> {
  const hasSouthernFruits = cartItems.some(
    (item) => item.category === "Südfrüchte" || item.category === "Frische Südfrüchte",
  )

  if (!hasSouthernFruits) {
    return {
      deliveryDate: null,
      scheduleId: null,
      message: "Lagerware - sofort lieferbar",
    }
  }

  let nextSchedule = await getNextDeliverySchedule(true)

  if (!nextSchedule) {
    console.log("[v0] No schedule with valid order deadline, getting next available schedule")
    nextSchedule = await getNextDeliverySchedule(false)
  }

  if (!nextSchedule) {
    return {
      deliveryDate: null,
      scheduleId: null,
      message: "Keine Liefertermine verfügbar - Bestellung wird vorgemerkt",
    }
  }

  const orderDeadline = new Date(nextSchedule.order_deadline)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const isPastDeadline = orderDeadline < today

  return {
    deliveryDate: nextSchedule.delivery_date,
    scheduleId: nextSchedule.id,
    pickupStartTime: nextSchedule.pickup_start_time,
    pickupEndTime: nextSchedule.pickup_end_time,
    message: isPastDeadline
      ? `Bestellschluss vorbei - Lieferung am ${nextSchedule.formattedDeliveryDate || nextSchedule.delivery_date}`
      : `Lieferung am ${nextSchedule.formattedDeliveryDate || nextSchedule.delivery_date}`,
  }
}

/**
 * Checks if an order can be placed for fresh fruits
 */
export async function canOrderFreshFruits(): Promise<{
  canOrder: boolean
  message: string
  nextDeliveryDate?: string
}> {
  const nextSchedule = await getNextDeliverySchedule(false)

  if (!nextSchedule) {
    return {
      canOrder: false,
      message: "Keine Liefertermine verfügbar",
    }
  }

  const orderDeadline = new Date(nextSchedule.order_deadline)
  const today = new Date()
  const daysUntilDeadline = Math.ceil((orderDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (orderDeadline < today) {
    return {
      canOrder: true,
      message: `Bestellschluss vorbei - Ihre Bestellung wird dem nächsten Termin (${nextSchedule.formattedDeliveryDate || nextSchedule.delivery_date}) zugeordnet`,
      nextDeliveryDate: nextSchedule.delivery_date,
    }
  }

  return {
    canOrder: true,
    message: `Bestellung möglich bis ${nextSchedule.formattedOrderDeadline || nextSchedule.order_deadline} (noch ${daysUntilDeadline} Tage)`,
    nextDeliveryDate: nextSchedule.delivery_date,
  }
}
