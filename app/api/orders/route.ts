import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createMovementsFromOrder } from "@/lib/inventory/movement-service"
import { randomUUID } from "crypto"

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
): Promise<{ deliveryDate: string | null; scheduleId: string | null; message?: string }> {
  const hasSouthernFruits = items.some(
    (item) => item.category === "Südfrüchte" || item.category === "Frische Südfrüchte",
  )

  if (!hasSouthernFruits) {
    return { deliveryDate: null, scheduleId: null }
  }

  console.log("[v0] [determineDeliveryDate] Checking for Südfrüchte delivery schedules...")

  const today = new Date().toISOString().split("T")[0]

  const { data: futureSchedules, error } = await supabase
    .from("delivery_schedules")
    .select("*")
    .gte("delivery_date", today)
    .order("delivery_date", { ascending: true })

  console.log("[v0] [determineDeliveryDate] Today's date for comparison:", today)
  console.log("[v0] [determineDeliveryDate] Future schedules found:", futureSchedules?.length || 0)

  if (futureSchedules && futureSchedules.length > 0) {
    console.log(
      "[v0] [determineDeliveryDate] Schedule details:",
      futureSchedules.map((s) => ({
        id: s.id,
        delivery_date: s.delivery_date,
        order_deadline: s.order_deadline,
        status: s.status,
      })),
    )
  }

  if (error || !futureSchedules || futureSchedules.length === 0) {
    console.log("[v0] [determineDeliveryDate] No future delivery schedules found")
    return {
      deliveryDate: null,
      scheduleId: null,
      message:
        "Aktuell sind keine Liefertermine verfügbar. Ihre Bestellung wird gespeichert und dem nächsten verfügbaren Termin zugeordnet.",
    }
  }

  const availableSchedule = futureSchedules.find((schedule) => schedule.order_deadline >= today)

  console.log(
    "[v0] [determineDeliveryDate] Selected schedule:",
    availableSchedule
      ? {
          id: availableSchedule.id,
          delivery_date: availableSchedule.delivery_date,
          order_deadline: availableSchedule.order_deadline,
          reason: availableSchedule.order_deadline >= today ? "Order deadline not passed" : "Unknown",
        }
      : "NONE - All deadlines passed",
  )

  if (!availableSchedule) {
    console.log("[v0] [determineDeliveryDate] All order deadlines have passed, no available delivery schedule")
    return {
      deliveryDate: null,
      scheduleId: null,
      message: "Alle Bestellschlüsse sind vorbei. Aktuell sind keine Liefertermine verfügbar.",
    }
  }

  const isNextDelivery = futureSchedules[0].id !== availableSchedule.id

  const deliveryDateFormatted = new Date(availableSchedule.delivery_date + "T00:00:00").toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  const message = isNextDelivery
    ? `Der Bestellschluss für die aktuelle Lieferung ist vorbei. Ihre Südfrüchte-Bestellung wird der nächsten Lieferung am ${deliveryDateFormatted} zugeordnet.`
    : `Ihre Südfrüchte-Bestellung wird am ${deliveryDateFormatted} geliefert.`

  console.log("[v0] [determineDeliveryDate] Final decision:", {
    scheduleId: availableSchedule.id,
    deliveryDate: availableSchedule.delivery_date,
    formattedDate: deliveryDateFormatted,
    isNextDelivery,
    message,
  })

  return {
    deliveryDate: availableSchedule.delivery_date,
    scheduleId: availableSchedule.id,
    message,
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

    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString()
    const { data: recentOrders, error: duplicateCheckError } = await supabase
      .from("orders")
      .select("id, order_number, total, created_at")
      .eq(
        "customer_id",
        (
          await supabase
            .from("customers")
            .select("id")
            .eq("email_normalized", orderData.email.toLowerCase().trim())
            .limit(1)
            .single()
        ).data?.id || "",
      )
      .gte("created_at", tenSecondsAgo)
      .order("created_at", { ascending: false })
      .limit(1)

    if (!duplicateCheckError && recentOrders && recentOrders.length > 0) {
      const recentOrder = recentOrders[0]
      const orderTotal =
        orderData.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0) +
        (orderData.deliveryMethod === "delivery" ? 4.9 : 0)

      if (Math.abs(recentOrder.total - orderTotal) < 0.01) {
        console.warn("[/api/orders] Duplicate order detected, returning existing order:", recentOrder.order_number)
        return NextResponse.json(
          {
            success: true,
            data: {
              order: recentOrder,
              items: [],
              message: "Bestellung bereits vorhanden",
              isDuplicate: true,
            },
          },
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }
    }

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

    let deliveryDate = orderData.deliveryDate || null
    let scheduleId = orderData.deliveryScheduleId || null
    let message = ""

    // Only calculate delivery date if not provided
    if (!deliveryDate) {
      const deliveryInfo = await determineDeliveryDate(orderData.items, supabase)
      deliveryDate = deliveryInfo.deliveryDate
      scheduleId = deliveryInfo.scheduleId
      message = deliveryInfo.message || ""
      console.log("[/api/orders] Calculated delivery date:", deliveryDate, "Schedule ID:", scheduleId)
    } else {
      console.log("[/api/orders] Using passed delivery date:", deliveryDate, "Schedule ID:", scheduleId)
    }

    const pickupLocationId = await findPickupLocationId(supabase, orderData)

    const pickupToken = randomUUID()
    console.log("[/api/orders] Generated pickup token:", pickupToken)

    const orderRecord = {
      customer_id: customer.id,
      user_id: customer.user_id,
      order_time: orderTime.toISOString(),
      subtotal: subtotal,
      shipping_cost: shippingCost,
      total: total,
      delivery_method: orderData.deliveryMethod,
      pickup_location: orderData.pickupLocation || null,
      pickup_location_id: pickupLocationId,
      payment_method: orderData.paymentMethod,
      payment_status: orderData.paymentMethod === "sumup" ? "paid" : "pending",
      status: "confirmed",
      notes: orderData.notes || null,
      pickup_reminders: orderData.emailReminder || false,
      email_notifications: orderData.emailUpdates || false,
      pickup_date: deliveryDate, // Now uses passed date or calculated date
      is_test: orderData.isTest || false,
      created_at: orderTime.toISOString(),
      pickup_token: pickupToken,
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
      .select("id, name, unit")
      .in("name", productNames)

    if (productsError) {
      console.error("[/api/orders] Error fetching products:", productsError)
    }

    const productMap = new Map(products?.map((p) => [p.name, { id: p.id, unit: p.unit }]) || [])
    console.log("[/api/orders] Product map created with", productMap.size, "entries")

    const orderItems = orderData.items.map((item: any) => {
      const productInfo = productMap.get(item.name)
      if (!productInfo) {
        console.warn(`[/api/orders] ⚠️ No product_id found for item: "${item.name}"`)
      }
      return {
        order_id: savedOrder.id,
        product_id: productInfo?.id || null,
        product_name: item.name,
        product_category: item.category || "Unbekannt",
        product_size: item.size || productInfo?.unit || null,
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

    try {
      const adminEmail = process.env.SUMUP_PAY_TO_EMAIL || "kontakt@suedfruechte-hohenlohe.de"
      console.log("[/api/orders] Sending admin notification to:", adminEmail)

      fetch(`${request.nextUrl.origin}/api/admin/order-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: savedOrder.id,
          orderNumber: savedOrder.order_number,
          customerEmail: orderData.email,
          customerName: `${orderData.firstName || ""} ${orderData.lastName || ""}`.trim(),
          total: savedOrder.total,
          deliveryMethod: savedOrder.delivery_method,
          pickupLocation: savedOrder.pickup_location,
          paymentMethod: savedOrder.payment_method,
          items: itemsResult,
          adminEmail: adminEmail,
        }),
      }).catch((err) => {
        console.error("[/api/orders] Failed to send admin notification:", err)
      })
    } catch (notificationError) {
      console.error("[/api/orders] Error sending admin notification:", notificationError)
    }

    if (savedOrder.payment_status === "paid") {
      try {
        console.log("[/api/orders] Generating invoice for paid order:", savedOrder.order_number)

        fetch(`${request.nextUrl.origin}/api/generate-invoice`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: savedOrder.id,
            orderNumber: savedOrder.order_number,
            customerEmail: orderData.email,
            customerName: `${orderData.firstName || ""} ${orderData.lastName || ""}`.trim(),
            items: itemsResult,
            subtotal: savedOrder.subtotal,
            shippingCost: savedOrder.shipping_cost,
            total: savedOrder.total,
            paymentMethod: savedOrder.payment_method,
          }),
        }).catch((err) => {
          console.error("[/api/orders] Failed to trigger invoice generation:", err)
        })
      } catch (invoiceError) {
        console.error("[/api/orders] Error triggering invoice generation:", invoiceError)
      }
    }

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
          message: message,
          pickupToken: pickupToken,
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
