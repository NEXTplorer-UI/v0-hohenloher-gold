import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    console.log("[v0] Loading delivery schedules from database...")

    const supabase = createAdminClient()

    const { data: schedules, error } = await supabase
      .from("delivery_schedules")
      .select("*")
      .order("delivery_date", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching delivery schedules:", error)
      throw error
    }

    console.log(`[v0] Found ${schedules?.length || 0} delivery schedules`)

    const transformedSchedules = schedules?.map((schedule) => {
      const deliveryDate = new Date(schedule.delivery_date)
      const orderDeadline = new Date(schedule.order_deadline)

      return {
        date: deliveryDate.toLocaleDateString("de-DE", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        type: Array.isArray(schedule.fruit_types) ? schedule.fruit_types.join(" & ") : schedule.fruit_types,
        status: schedule.status,
        orderDeadline: orderDeadline.toLocaleDateString("de-DE", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      }
    })

    return NextResponse.json(transformedSchedules || [])
  } catch (error) {
    console.error("[v0] Error loading delivery schedules:", error)
    return NextResponse.json({ error: "Failed to load delivery schedules" }, { status: 500 })
  }
}
