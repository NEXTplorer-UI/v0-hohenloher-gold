import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  console.log("[v0] [API] Next available delivery schedule endpoint called")

  try {
    console.log("[v0] [API] Creating Supabase admin client...")
    let supabase
    try {
      supabase = createAdminClient()
      console.log("[v0] [API] Admin client created successfully")
    } catch (clientError) {
      console.error("[v0] [API] Failed to create admin client:", clientError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create database client",
          details: clientError instanceof Error ? clientError.message : String(clientError),
        },
        { status: 500 },
      )
    }

    const today = new Date().toISOString().split("T")[0]
    console.log("[v0] [API] Today's date:", today)

    console.log("[v0] [API] Querying delivery_schedules table...")
    const { data: nextSchedule, error } = await supabase
      .from("delivery_schedules")
      .select("*")
      .gte("delivery_date", today)
      .eq("status", "confirmed")
      .order("delivery_date", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error("[v0] [API] Database error:", error)
      console.error("[v0] [API] Error details:", JSON.stringify(error, null, 2))
      return NextResponse.json(
        {
          success: false,
          error: "Database error",
          details: error.message,
        },
        { status: 500 },
      )
    }

    console.log("[v0] [API] Query completed successfully")
    console.log("[v0] [API] Next schedule found:", nextSchedule ? "Yes" : "No")

    if (nextSchedule) {
      console.log("[v0] [API] Schedule details:", {
        id: nextSchedule.id,
        delivery_date: nextSchedule.delivery_date,
        order_deadline: nextSchedule.order_deadline,
        status: nextSchedule.status,
        pickup_start_time: nextSchedule.pickup_start_time,
        pickup_end_time: nextSchedule.pickup_end_time,
      })
    }

    if (!nextSchedule) {
      console.log("[v0] [API] No upcoming delivery schedules found")
      return NextResponse.json({
        success: true,
        data: null,
        message: "Keine kommenden Liefertermine verfügbar",
      })
    }

    const deliveryDate = new Date(nextSchedule.delivery_date)
    const orderDeadline = new Date(nextSchedule.order_deadline)
    const daysUntilDeadline = Math.ceil((orderDeadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

    console.log(`[v0] [API] Next delivery: ${deliveryDate.toLocaleDateString("de-DE")}`)
    console.log(`[v0] [API] Days until deadline: ${daysUntilDeadline}`)

    const responseData = {
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
        pickupStartTime: nextSchedule.pickup_start_time,
        pickupEndTime: nextSchedule.pickup_end_time,
      },
    }

    console.log("[v0] [API] Returning success response")
    return NextResponse.json(responseData)
  } catch (error) {
    console.error("[v0] [API] Unexpected error in try-catch:", error)
    console.error("[v0] [API] Error type:", typeof error)
    console.error("[v0] [API] Error details:", error instanceof Error ? error.message : String(error))
    console.error("[v0] [API] Error stack:", error instanceof Error ? error.stack : "No stack trace")

    return NextResponse.json(
      {
        success: false,
        error: "Failed to find next delivery schedule",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
