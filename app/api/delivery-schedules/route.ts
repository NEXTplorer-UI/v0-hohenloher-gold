import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data: schedules, error } = await supabase
      .from("delivery_schedules")
      .select(`
        *,
        delivery_schedule_products(
          product_id,
          products(id, name, category_id)
        )
      `)
      .order("delivery_date", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching delivery schedules:", error)
      throw error
    }

    const transformedSchedules = schedules?.map((schedule: any) => {
      // Format dates for display
      const deliveryDate = new Date(schedule.delivery_date)
      const orderDeadline = new Date(schedule.order_deadline)

      // Determine type based on notes or default to "Hauptlieferung"
      let type = "Hauptlieferung"
      if (schedule.notes?.toLowerCase().includes("nachlieferung")) {
        type = "Nachlieferung"
      } else if (schedule.notes?.toLowerCase().includes("sonder")) {
        type = "Sonderlieferung"
      }

      return {
        id: schedule.id,
        // Frontend expects these camelCase field names
        date: deliveryDate.toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        orderDeadline: orderDeadline.toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        status: schedule.status,
        type: type,
        notes: schedule.notes,
        pickupStartTime: schedule.pickup_start_time,
        pickupEndTime: schedule.pickup_end_time,
        // Also keep snake_case for backwards compatibility
        delivery_date: schedule.delivery_date,
        order_deadline: schedule.order_deadline,
        pickup_start_time: schedule.pickup_start_time,
        pickup_end_time: schedule.pickup_end_time,
        created_at: schedule.created_at,
        updated_at: schedule.updated_at,
        products: schedule.delivery_schedule_products?.map((dsp: any) => dsp.products).filter(Boolean) || [],
      }
    })

    console.log("[v0] Transformed delivery schedules:", transformedSchedules?.length || 0)
    return NextResponse.json(transformedSchedules || [])
  } catch (error) {
    console.error("[v0] Error loading delivery schedules:", error)
    return NextResponse.json({ error: "Failed to load delivery schedules" }, { status: 500 })
  }
}
