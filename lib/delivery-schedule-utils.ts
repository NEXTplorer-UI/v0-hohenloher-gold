/**
 * Utility functions for managing delivery schedules for fresh fruits (Südfrüchte)
 */

export interface DeliverySchedule {
  id: string
  delivery_date: string
  fruit_types: string[]
  status: string
  order_deadline: string
  notes?: string
}

/**
 * Fetches the next available delivery schedule
 */
export async function getNextDeliverySchedule(): Promise<DeliverySchedule | null> {
  try {
    const response = await fetch("/api/delivery-schedules/next-available")
    if (!response.ok) {
      console.error("[v0] Failed to fetch next delivery schedule")
      return null
    }

    const result = await response.json()
    return result.data
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
}> {
  const hasSouthernFruits = cartItems.some(
    (item) => item.category === "Südfrüchte" || item.category === "Frische Südfrüchte",
  )

  if (!hasSouthernFruits) {
    return {
      deliveryDate: null,
      scheduleId: null,
      message: "Sofort verfügbar",
    }
  }

  const nextSchedule = await getNextDeliverySchedule()

  if (!nextSchedule) {
    return {
      deliveryDate: null,
      scheduleId: null,
      message: "Keine Liefertermine verfügbar - Bestellung wird vorgemerkt",
    }
  }

  const orderDeadline = new Date(nextSchedule.order_deadline)
  const today = new Date()

  if (orderDeadline < today) {
    // Deadline passed, order will be assigned to next available schedule
    return {
      deliveryDate: nextSchedule.delivery_date,
      scheduleId: nextSchedule.id,
      message: `Bestellschluss vorbei - Lieferung am nächsten Termin: ${nextSchedule.formattedDeliveryDate || nextSchedule.delivery_date}`,
    }
  }

  return {
    deliveryDate: nextSchedule.delivery_date,
    scheduleId: nextSchedule.id,
    message: `Lieferung am ${nextSchedule.formattedDeliveryDate || nextSchedule.delivery_date}`,
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
  const nextSchedule = await getNextDeliverySchedule()

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
      message: `Bestellschluss vorbei - Ihre Bestellung wird dem nächsten Termin zugeordnet`,
      nextDeliveryDate: nextSchedule.delivery_date,
    }
  }

  return {
    canOrder: true,
    message: `Bestellung möglich bis ${nextSchedule.formattedOrderDeadline || nextSchedule.order_deadline} (noch ${daysUntilDeadline} Tage)`,
    nextDeliveryDate: nextSchedule.delivery_date,
  }
}
