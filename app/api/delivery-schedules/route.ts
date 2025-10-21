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

    // Transform to include products array
    const transformedSchedules = schedules?.map((schedule: any) => ({
      id: schedule.id,
      delivery_date: schedule.delivery_date,
      status: schedule.status,
      order_deadline: schedule.order_deadline,
      notes: schedule.notes,
      pickup_start_time: schedule.pickup_start_time,
      pickup_end_time: schedule.pickup_end_time,
      created_at: schedule.created_at,
      updated_at: schedule.updated_at,
      products: schedule.delivery_schedule_products?.map((dsp: any) => dsp.products).filter(Boolean) || [],
    }))

    return NextResponse.json(transformedSchedules || [])
  } catch (error) {
    console.error("[v0] Error loading delivery schedules:", error)
    return NextResponse.json({ error: "Failed to load delivery schedules" }, { status: 500 })
  }
}
