import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    console.log("[v0] Finding next available delivery schedule...")

    const supabase = createAdminClient()

    const today = new Date().toISOString().split("T")[0]

    const { data: nextSchedule, error } = await supabase
      .from("delivery_schedules")
      .select("*")
      .gte("order_deadline", today)
      .order("delivery_date", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error("[v0] Error fetching next delivery schedule:", error)
      throw error
    }

    if (!nextSchedule) {
      console.log("[v0] No upcoming delivery schedules found")
      return NextResponse.json({
        success: true,
        data: null,
        message: "Keine kommenden Liefertermine verfügbar",
      })
    }

    const deliveryDate = new Date(nextSchedule.delivery_date)
    const orderDeadline = new Date(nextSchedule.order_deadline)
    const daysUntilDeadline = Math.ceil((orderDeadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

    console.log(`[v0] Next delivery: ${deliveryDate.toLocaleDateString("de-DE")}`)

    return NextResponse.json({
      success: true,
      data: {
        ...nextSchedule,
        daysUntilDeadline,
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
      },
    })
  } catch (error) {
    console.error("[v0] Error finding next delivery schedule:", error)
    return NextResponse.json({ error: "Failed to find next delivery schedule" }, { status: 500 })
  }
}
