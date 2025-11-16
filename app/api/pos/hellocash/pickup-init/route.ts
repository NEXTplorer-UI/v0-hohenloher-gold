import { NextResponse } from "next/server"
import { getAdminClient } from "@/lib/supabase/admin"
import { syncProductToHelloCash } from "@/lib/hellocash"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json({ error: "Token fehlt" }, { status: 400 })
    }

    const supabase = getAdminClient()

    const { data: validation } = await supabase.rpc("validate_qr_code", {
      p_pickup_token: token,
    })

    if (!validation?.valid) {
      if (validation?.order_id) {
        await supabase.rpc("log_qr_scan", {
          p_order_id: validation.order_id,
          p_source: "pos",
          p_scan_result: validation.error,
          p_ip: req.headers.get("x-forwarded-for")?.split(",")[0] || null,
          p_user_agent: req.headers.get("user-agent") || null,
          p_error_message: validation.message,
        })
      }

      return NextResponse.json(
        {
          error: validation?.error || "invalid_token",
          message: validation?.message || "Ungültiger QR-Code",
        },
        { status: 400 },
      )
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        total,
        status,
        hellocash_invoice_id,
        hellocash_invoice_number,
        hellocash_status,
        hellocash_payment_url,
        pickup_token,
        qr_code_expires_at,
        qr_code_url,
        pickup_date,
        pickup_location,
        delivery_method,
        order_items (
          id,
          product_name,
          product_size,
          quantity,
          unit_price
        ),
        customers (
          first_name,
          last_name,
          email,
          phone,
          street,
          house_number,
          postal_code,
          city
        )
      `)
      .eq("pickup_token", token)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Order nicht gefunden" }, { status: 404 })
    }

    if (!order.hellocash_invoice_id) {
      console.log("[v0] [pickup-init] Creating HelloCash draft for order:", order.order_number)
      
      // Note: Draft creation would happen here if needed
      // For now, we'll just log that it's needed
      console.log("[v0] [pickup-init] Order needs HelloCash invoice")
    }

    await supabase.rpc("log_qr_scan", {
      p_order_id: order.id,
      p_source: "pos",
      p_scan_result: "success",
      p_ip: req.headers.get("x-forwarded-for")?.split(",")[0] || null,
      p_user_agent: req.headers.get("user-agent") || null,
    })

    return NextResponse.json({
      order_id: order.id,
      order_number: order.order_number,
      total: order.total,
      total_formatted: order.total.toFixed(2) + " €",
      status: order.status,
      hellocash_status: order.hellocash_status || "draft",
      hellocash_invoice_number: order.hellocash_invoice_number || order.order_number,
      hellocash_payment_url: order.hellocash_payment_url,
      pickup_token: order.pickup_token,
      expires_at: order.qr_code_expires_at,
      qr_code_url: order.qr_code_url,
      pickup_date: order.pickup_date,
      pickup_location: order.pickup_location,
      delivery_method: order.delivery_method,
      items:
        order.order_items?.map((item: any) => ({
          id: item.id,
          name: item.product_name,
          size: item.product_size,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.unit_price * item.quantity,
        })) || [],
      customer: order.customers
        ? {
            name: `${order.customers.first_name} ${order.customers.last_name}`,
            email: order.customers.email,
            phone: order.customers.phone,
            street: order.customers.street,
            house_number: order.customers.house_number,
            postal_code: order.customers.postal_code,
            city: order.customers.city,
          }
        : null,
    })
  } catch (error: any) {
    console.error("[pickup-init] Error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
      },
      { status: 500 },
    )
  }
}
