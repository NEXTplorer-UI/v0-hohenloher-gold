import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createMovementsFromOrder } from "@/lib/inventory/movement-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase environment variables")
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}

function toSlug(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

async function findPickupLocationId(
  supabase: ReturnType<typeof getServiceClient>,
  orderData: any,
): Promise<string | null> {
  let pickupLocationId: string | null = null

  // 1️⃣ If client sends an ID → validate it
  if (orderData.pickupLocationId) {
    const { data: valid, error: vErr } = await supabase
      .from("pickup_locations")
      .select("id")
      .eq("id", orderData.pickupLocationId)
      .maybeSingle()

    if (!vErr && valid?.id) {
      pickupLocationId = valid.id
      console.log(`[/api/orders] Validated pickup location ID: ${pickupLocationId}`)
      return pickupLocationId
    } else {
      console.warn(`[/api/orders] Ignoring invalid pickupLocationId: ${orderData.pickupLocationId}`)
    }
  }

  // 2️⃣ If no ID → search by slug (recommended)
  if (!pickupLocationId && orderData.pickupLocation) {
    const slug = toSlug(orderData.pickupLocation)
    const { data: bySlug, error: sErr } = await supabase
      .from("pickup_locations")
      .select("id")
      .eq("name", slug) // Assuming slug column exists, otherwise use ilike
      .maybeSingle()

    if (!sErr && bySlug?.id) {
      pickupLocationId = bySlug.id
      console.log(`[/api/orders] Found pickup location ID by slug: ${pickupLocationId}`)
      return pickupLocationId
    }
  }

  // 3️⃣ If still no ID → exact name match (+ optional city/zip)
  if (!pickupLocationId && orderData.pickupLocation) {
    let q = supabase.from("pickup_locations").select("id").eq("name", orderData.pickupLocation).limit(2)

    if (orderData.city) q = q.eq("city", orderData.city)
    if (orderData.zip) q = q.eq("postal_code", orderData.zip)

    const { data: byName, error: nErr } = await q

    if (!nErr && byName && byName.length === 1) {
      pickupLocationId = byName[0].id
      console.log(`[/api/orders] Found pickup location ID by exact name: ${pickupLocationId}`)
      return pickupLocationId
    } else if ((byName?.length ?? 0) > 1) {
      console.warn(`[/api/orders] Multiple pickup locations matched "${orderData.pickupLocation}". Leaving ID null.`)
    }
  }

  // 4️⃣ Fallback: ILIKE (fuzzy, last resort)
  if (!pickupLocationId && orderData.pickupLocation) {
    const { data: fuzzy, error: fErr } = await supabase
      .from("pickup_locations")
      .select("id")
      .ilike("name", `%${orderData.pickupLocation}%`)
      .limit(2)

    if (!fErr && fuzzy && fuzzy.length === 1) {
      pickupLocationId = fuzzy[0].id
      console.log(`[/api/orders] Found pickup location ID via fuzzy match: ${pickupLocationId}`)
      return pickupLocationId
    }
  }

  if (!pickupLocationId) {
    console.warn(`[/api/orders] Could not find pickup location ID for "${orderData.pickupLocation}"`)
  }

  return pickupLocationId
}

async function determineDeliveryDate(
  items: any[],
  supabase: ReturnType<typeof getServiceClient>,
): Promise<{ deliveryDate: string | null; scheduleId: string | null }> {
  const hasSouthernFruits = items.some(
    (item) => item.category === "Südfrüchte" || item.category === "Frische Südfrüchte",
  )

  if (!hasSouthernFruits) {
    return { deliveryDate: null, scheduleId: null }
  }

  const { data: nextSchedule, error } = await supabase
    .from("delivery_schedules")
    .select("*")
    .gte("order_deadline", new Date().toISOString().split("T")[0])
    .order("delivery_date", { ascending: true })
    .limit(1)
    .single()

  if (error || !nextSchedule) {
    console.log("[/api/orders] No delivery schedule found, order will be fulfilled when next schedule is available")
    return { deliveryDate: null, scheduleId: null }
  }

  return {
    deliveryDate: nextSchedule.delivery_date,
    scheduleId: nextSchedule.id,
  }
}

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text()
    let orderData: any
    try {
      orderData = JSON.parse(bodyText || "{}")
    } catch {
      console.error("[/api/orders] Invalid JSON body")
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400, headers: { "content-type": "application/json" } },
      )
    }

    const missing: string[] = []
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL")
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY")
    if (missing.length) {
      console.error("[/api/orders] Missing env:", missing)
      return NextResponse.json(
        { error: `Missing env: ${missing.join(", ")}` },
        { status: 500, headers: { "content-type": "application/json" } },
      )
    }

    console.log("[/api/orders] Saving order to database:", orderData.email)

    const supabase = getServiceClient()

    const { data: customers, error: customerError } = await supabase
      .from("customers")
      .select("id, user_id")
      .eq("email_normalized", orderData.email.toLowerCase().trim())
      .limit(1)

    if (customerError) {
      console.error("[/api/orders] Error finding customer:", customerError)
      return NextResponse.json(
        { error: "Fehler beim Suchen des Kunden", details: customerError.message },
        { status: 500, headers: { "content-type": "application/json" } },
      )
    }

    if (!customers || customers.length === 0) {
      console.error("[/api/orders] Customer not found for email:", orderData.email)
      return NextResponse.json(
        { error: "Kunde nicht gefunden" },
        { status: 404, headers: { "content-type": "application/json" } },
      )
    }

    const customer = customers[0]

    const orderTime = orderData.orderTime ? new Date(orderData.orderTime) : new Date()

    const subtotal = orderData.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0)
    const shippingCost = orderData.deliveryMethod === "delivery" ? 4.9 : 0
    const total = subtotal + shippingCost

    const { deliveryDate, scheduleId } = await determineDeliveryDate(orderData.items, supabase)
    console.log("[/api/orders] Determined delivery date:", deliveryDate, "Schedule ID:", scheduleId)

    const pickupLocationId = await findPickupLocationId(supabase, orderData)

    const orderRecord = {
      customer_id: customer.id,
      user_id: customer.user_id,
      order_time: orderTime.toISOString(),
      subtotal: subtotal,
      shipping_cost: shippingCost,
      total: total,
      delivery_method: orderData.deliveryMethod,
      pickup_location: orderData.pickupLocation || null,
      pickup_location_id: pickupLocationId, // Now uses robust lookup
      payment_method: orderData.paymentMethod,
      payment_status: orderData.paymentMethod === "stripe" ? "paid" : "pending",
      status: "confirmed",
      notes: orderData.notes || null,
      pickup_reminders: orderData.emailReminder || false,
      email_notifications: orderData.emailUpdates || false,
      pickup_date: deliveryDate,
      created_at: orderTime.toISOString(),
    }

    const { data: orderResult, error: orderError } = await supabase.from("orders").insert(orderRecord).select()

    if (orderError) {
      console.error("[/api/orders] Error saving order:", orderError)
      return NextResponse.json(
        { error: "Fehler beim Speichern der Bestellung", details: orderError.message },
        { status: 500, headers: { "content-type": "application/json" } },
      )
    }

    const savedOrder = orderResult[0]

    const productNames = orderData.items.map((item: any) => item.name)
    console.log("[/api/orders] Looking up products:", productNames)

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name")
      .in("name", productNames)

    if (productsError) {
      console.error("[/api/orders] Error fetching products:", productsError)
    }

    const productMap = new Map(products?.map((p) => [p.name, p.id]) || [])
    console.log("[/api/orders] Product map created with", productMap.size, "entries")

    const orderItems = orderData.items.map((item: any) => {
      const productId = productMap.get(item.name)
      if (!productId) {
        console.warn(`[/api/orders] ⚠️ No product_id found for item: "${item.name}"`)
      }
      return {
        order_id: savedOrder.id,
        product_id: productId || null,
        product_name: item.name,
        product_category: item.category || "Unbekannt",
        product_size: item.size || null,
        quantity: item.quantity,
        unit_price: item.price,
        expected_delivery_date: deliveryDate,
        delivery_schedule_id: scheduleId,
        created_at: orderTime.toISOString(),
      }
    })

    const { data: itemsResult, error: itemsError } = await supabase.from("order_items").insert(orderItems).select()

    if (itemsError) {
      console.error("[/api/orders] Error saving order items:", itemsError)
      await supabase.from("orders").delete().eq("id", savedOrder.id)
      return NextResponse.json(
        { error: "Fehler beim Speichern der Bestellpositionen", details: itemsError.message },
        { status: 500, headers: { "content-type": "application/json" } },
      )
    }

    const { data: customerStats, error: statsError } = await supabase
      .from("customers")
      .select("total_orders, total_spent")
      .eq("id", customer.id)
      .single()

    if (!statsError && customerStats) {
      const newTotalOrders = (customerStats.total_orders || 0) + 1
      const newTotalSpent = (customerStats.total_spent || 0) + total

      const updateData: any = {
        total_orders: newTotalOrders,
        total_spent: newTotalSpent,
        last_order_date: orderTime.toISOString(),
        customer_segment: newTotalOrders === 1 ? "new" : "returning",
        reminder_notifications: orderData.emailReminder || false,
      }

      if (orderData.emailUpdates) {
        updateData.marketing_consent = true
        updateData.marketing_consent_at = orderTime.toISOString()
        updateData.marketing_consent_ip =
          request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null
        updateData.marketing_consent_ua = request.headers.get("user-agent")
      }

      const { error: updateError } = await supabase.from("customers").update(updateData).eq("id", customer.id)

      if (updateError) {
        console.error("[/api/orders] Error updating customer stats:", updateError)
      } else {
        console.log("[/api/orders] Customer stats updated successfully")
      }
    }

    console.log("[/api/orders] Order saved successfully:", {
      orderId: savedOrder.id,
      orderNumber: savedOrder.order_number,
      orderTime: savedOrder.created_at,
      deliveryDate: deliveryDate,
      itemCount: itemsResult.length,
    })

    if (savedOrder.status === "confirmed") {
      try {
        const itemsWithProductId = itemsResult.filter((item) => item.product_id !== null)
        const itemsWithoutProductId = itemsResult.filter((item) => item.product_id === null)

        if (itemsWithoutProductId.length > 0) {
          console.warn(
            `[/api/orders] ⚠️ ${itemsWithoutProductId.length} items without product_id, inventory movements will not be created for:`,
            itemsWithoutProductId.map((i) => i.product_name),
          )
        }

        if (itemsWithProductId.length > 0) {
          await createMovementsFromOrder(
            savedOrder.id,
            savedOrder.order_number,
            itemsWithProductId.map((item) => ({
              id: item.id,
              product_id: item.product_id,
              product_name: item.product_name,
              product_category: item.product_category,
              quantity: item.quantity,
              unit_price: item.unit_price,
            })),
            "Kundenbestellung",
          )
          console.log(
            `[/api/orders] ✅ Created inventory movements for ${itemsWithProductId.length} items in order ${savedOrder.order_number}`,
          )
        }
      } catch (movementError: any) {
        console.error(
          `[/api/orders] ❌ Failed to create inventory movements for order ${savedOrder.order_number}:`,
          movementError.message,
        )
        console.error("[/api/orders] Order was saved successfully, but inventory was not updated.")
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          order: savedOrder,
          items: itemsResult,
        },
      },
      { status: 200, headers: { "content-type": "application/json" } },
    )
  } catch (err: any) {
    console.error("[/api/orders] Uncaught ERROR:", err?.stack || err?.message || err)

    return NextResponse.json(
      { error: err?.message ?? "Unbekannter Serverfehler" },
      { status: 500, headers: { "content-type": "application/json" } },
    )
  }
}
