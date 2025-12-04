console.log("[v0] Orders route.ts - BEFORE IMPORTS")

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

console.log("[v0] Orders route.ts - START OF IMPORTS")

import { type NextRequest, NextResponse } from "next/server"
console.log("[v0] Orders route.ts - ✓ Next.js imports")

function generateUUID(): string {
  // Web Crypto API (Node 18+ und Edge Runtime)
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  // Fallback, falls aus irgendeinem Grund kein crypto da ist
  return (
    Math.random().toString(36).slice(2) +
    "-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Math.random().toString(36).slice(2)
  )
}

// ⚠️ Wichtige Anmerkung:
// Alle anderen Imports (Supabase, Resend, QRCode, Blob, Normalizer, Comment-Parser)
// werden jetzt *dynamisch* innerhalb des POST-Handlers geladen, damit
// Import-Fehler abgefangen werden können und nicht das ganze Modul crashen.

function toSlug(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

async function findPickupLocationId(supabase: any, orderData: any): Promise<string | null> {
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
  supabase: any,
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
      futureSchedules.map((s: any) => ({
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

  const availableSchedule = futureSchedules.find((schedule: any) => schedule.order_deadline >= today)

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

async function findProductIdByNameAndPrice(
  supabase: any,
  productName: string,
  unitPrice: number,
): Promise<number | null> {
  try {
    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, price")
      .ilike("name", `%${productName}%`)
      .eq("price", unitPrice)
      .limit(1)

    if (error || !products || products.length === 0) {
      console.warn(`[/api/orders] Could not find product_id for "${productName}" with price €${unitPrice}`)
      return null
    }

    console.log(
      `[/api/orders] ✅ Found product_id ${products[0].id} for "${productName}" (€${unitPrice}) via name+price fallback`,
    )
    return products[0].id
  } catch (err) {
    console.error(`[/api/orders] Error finding product by name+price: "${productName}"`, err)
    return null
  }
}

export async function POST(request: NextRequest) {
  console.log("[v0] POST /api/orders - Handler STARTED")

  // ─────────────────────────────────────────────────────────────
  // 1) DYNAMISCHE IMPORTS MIT FEHLERBEHANDLUNG
  // ─────────────────────────────────────────────────────────────
  let createServerClientFn: any = null
  let ResendClass: any = null
  let QRCodeLib: any = null
  let putFn: any = null
  let normalizePickupLocationFn: ((input: string) => Promise<any>) | null = null
  let parsePickupLocationFromCommentFn: ((comment: string) => Promise<any>) | null = null

  try {
    console.log("[v0] POST /api/orders - Attempting dynamic import of @supabase/ssr...")
    const supabaseModule = await import("@supabase/ssr")
    createServerClientFn = supabaseModule.createServerClient
    console.log("[v0] POST /api/orders - ✓ @supabase/ssr imported successfully")
  } catch (error) {
    console.error("[v0] POST /api/orders - ❌ Failed to import @supabase/ssr:", error)
  }

  try {
    console.log("[v0] POST /api/orders - Attempting dynamic import of resend...")
    const resendModule = await import("resend")
    ResendClass = resendModule.Resend
    console.log("[v0] POST /api/orders - ✓ resend imported successfully")
  } catch (error) {
    console.error("[v0] POST /api/orders - ❌ Failed to import resend:", error)
  }

  try {
    console.log("[v0] POST /api/orders - Attempting dynamic import of qrcode...")
    const qrModule = await import("qrcode")
    QRCodeLib = qrModule.default || qrModule
    console.log("[v0] POST /api/orders - ✓ qrcode imported successfully")
  } catch (error) {
    console.error("[v0] POST /api/orders - ❌ Failed to import qrcode:", error)
  }

  try {
    console.log("[v0] POST /api/orders - Attempting dynamic import of @vercel/blob...")
    const blobModule = await import("@vercel/blob")
    putFn = blobModule.put
    console.log("[v0] POST /api/orders - ✓ @vercel/blob imported successfully")
  } catch (error) {
    console.error("[v0] POST /api/orders - ❌ Failed to import @vercel/blob:", error)
  }

  try {
    console.log("[v0] POST /api/orders - Attempting dynamic import of pickup-location-normalizer...")
    const normModule = await import("@/lib/pickup-location-normalizer")
    normalizePickupLocationFn = normModule.normalizePickupLocation
    console.log("[v0] POST /api/orders - ✓ pickup-location-normalizer imported successfully")
  } catch (error) {
    console.error("[v0] POST /api/orders - ❌ Failed to import pickup-location-normalizer:", error)
  }

  try {
    console.log("[v0] POST /api/orders - Attempting dynamic import of pickup-location-comment-parser...")
    const parserModule = await import("@/lib/pickup-location-comment-parser")
    parsePickupLocationFromCommentFn = parserModule.parsePickupLocationFromComment
    console.log("[v0] POST /api/orders - ✓ pickup-location-comment-parser imported successfully")
  } catch (error) {
    console.error("[v0] POST /api/orders - ❌ Failed to import pickup-location-comment-parser:", error)
  }

  // movement-service & HelloCash bleiben wie von dir schon dynamisch + try/catch:
  let createMovementsFromOrder: any
  let createInvoiceAfterPayment: any

  try {
    console.log("[v0] POST /api/orders - Attempting movement-service dynamic import...")
    const movementService = await import("@/lib/inventory/movement-service")
    createMovementsFromOrder = movementService.createMovementsFromOrder
    console.log("[v0] POST /api/orders - ✓ movement-service import SUCCESS")
  } catch (error: any) {
    console.error("[v0] POST /api/orders - ❌ movement-service import FAILED:", error)
    createMovementsFromOrder = async () => {
      console.warn("[v0] createMovementsFromOrder is a no-op due to import failure")
    }
  }

  try {
    console.log("[v0] POST /api/orders - Attempting HelloCash dynamic import...")
    const helloCashService = await import("@/lib/hellocash/create-invoice-after-payment")
    createInvoiceAfterPayment = helloCashService.createInvoiceAfterPayment
    console.log("[v0] POST /api/orders - ✓ HelloCash import SUCCESS")
  } catch (error: any) {
    console.error("[v0] POST /api/orders - ❌ HelloCash import FAILED:", error)
    createInvoiceAfterPayment = async () => {
      console.warn("[v0] createInvoiceAfterPayment is a no-op due to import failure")
      return { success: false, error: "Import failed" }
    }
  }

  console.log("[v0] POST /api/orders - All dynamic imports completed")

  // Wenn der Supabase-Client gar nicht importiert werden konnte → sauberer 500er
  if (!createServerClientFn) {
    console.error("[v0] POST /api/orders - Supabase client could not be imported, aborting.")
    return NextResponse.json(
      {
        error: "Internal server error",
        details: "Supabase client import failed",
        type: "SupabaseImportError",
      },
      { status: 500, headers: { "content-type": "application/json" } },
    )
  }

  try {
    console.log("[v0] POST /api/orders - Parsing request body")
    const bodyText = await request.text()
    console.log("[v0] POST /api/orders - Body text length:", bodyText.length)

    let orderData: any
    try {
      orderData = JSON.parse(bodyText || "{}")
      console.log("[v0] POST /api/orders - ✓ JSON parsed successfully")
    } catch (parseError) {
      console.error("[v0] POST /api/orders - ❌ JSON parse error:", parseError)
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400, headers: { "content-type": "application/json" } },
      )
    }

    console.log("[v0] POST /api/orders - Creating Supabase client")
    const supabase = createServerClientFn(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return []
          },
          setAll() {},
        },
      },
    )

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
      .select("id, user_id, default_distribution_person_id, default_pickup_location_id")
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

    console.log("[/api/orders] Validating stock availability for order items")

    const stockCheckPromises = orderData.items.map(async (item: any) => {
      const productId = item.id
      if (!productId) {
        console.warn(`[/api/orders] No product_id for item ${item.name}, skipping stock check`)
        return {
          available: true,
          productName: item.name,
          requested: item.quantity,
          availableStock: Number.POSITIVE_INFINITY,
        }
      }

      const { data: availability, error: availError } = await supabase
        .from("product_availability")
        .select("piece_stock, gram_stock, product_id")
        .eq("product_id", productId)
        .single()

      if (availError || !availability) {
        console.error(`[/api/orders] Could not check stock for product ${productId}:`, availError)
        // Assume available if stock check fails to avoid blocking valid orders
        return {
          available: true,
          productName: item.name,
          requested: item.quantity,
          availableStock: Number.POSITIVE_INFINITY,
        }
      }

      const availableStock = availability.gram_stock > 0 ? availability.gram_stock : availability.piece_stock

      const isAvailable = availableStock >= item.quantity

      console.log(
        `[/api/orders] Stock check for ${item.name}: available=${availableStock}, requested=${item.quantity}, ok=${isAvailable}`,
      )

      return {
        available: isAvailable,
        productName: item.name,
        requested: item.quantity,
        availableStock: availableStock,
      }
    })

    const stockCheckResults = await Promise.all(stockCheckPromises)
    const unavailableItems = stockCheckResults.filter((r) => !r.available)

    if (unavailableItems.length > 0) {
      const errorMessage = unavailableItems
        .map((item) => `${item.productName} (verfügbar: ${item.availableStock}, gewünscht: ${item.requested})`)
        .join(", ")

      console.error("[/api/orders] Order rejected due to insufficient stock:", errorMessage)

      return NextResponse.json(
        {
          error: "Nicht genügend Lagerbestand",
          details: `Folgende Artikel sind nicht in ausreichender Menge verfügbar: ${errorMessage}`,
        },
        { status: 400, headers: { "content-type": "application/json" } },
      )
    }

    const orderTime = orderData.orderTime ? new Date(orderData.orderTime) : new Date()

    const subtotal = orderData.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0)
    const shippingCost = orderData.deliveryMethod === "delivery" ? 4.9 : 0
    const total = subtotal + shippingCost

    let deliveryDate = orderData.deliveryDate || null
    let scheduleId = orderData.deliveryScheduleId || null
    let message = ""

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

    let pickupLocationNormalized: string | null = null
    let normalizedLocationId: string | null = pickupLocationId

    if (orderData.pickupLocation) {
      try {
        if (normalizePickupLocationFn) {
          const normalized = await normalizePickupLocationFn(orderData.pickupLocation)
          pickupLocationNormalized = normalized?.normalized || null
          if (normalized?.locationId) {
            normalizedLocationId = normalized.locationId
          }
          console.log("[/api/orders] Normalized pickup location:", {
            original: orderData.pickupLocation,
            normalized: pickupLocationNormalized,
            location_id: normalizedLocationId,
          })
        } else {
          console.warn(
            "[/api/orders] normalizePickupLocation not available (import failed) - using original pickupLocation",
          )
          pickupLocationNormalized = orderData.pickupLocation
        }
      } catch (normError) {
        console.error("[/api/orders] Error normalizing pickup location:", normError)
        pickupLocationNormalized = orderData.pickupLocation
      }
    }

    const pickupToken = generateUUID()
    console.log("[/api/orders] Generated pickup token:", pickupToken)

    let autoFilledDistributionPersonId = orderData.distributionPersonId || null
    let autoFilledPickupLocationId = pickupLocationId

    if (!autoFilledDistributionPersonId && customer.default_distribution_person_id) {
      autoFilledDistributionPersonId = customer.default_distribution_person_id
      console.log(
        "[/api/orders] Auto-filled distribution_person_id from customer default:",
        autoFilledDistributionPersonId,
      )
    }

    if (!autoFilledPickupLocationId && customer.default_pickup_location_id) {
      autoFilledPickupLocationId = customer.default_pickup_location_id
      console.log("[/api/orders] Auto-filled pickup_location_id from customer default:", autoFilledPickupLocationId)

      const { data: defaultLocation } = await supabase
        .from("pickup_locations")
        .select("name, address")
        .eq("id", autoFilledPickupLocationId)
        .single()

      if (defaultLocation) {
        pickupLocationNormalized = `${defaultLocation.name}, ${defaultLocation.address}`
        normalizedLocationId = autoFilledPickupLocationId
        console.log("[/api/orders] Updated normalized location from customer default:", pickupLocationNormalized)
      }
    }

    const orderRecord = {
      customer_id: customer.id,
      user_id: customer.user_id,
      order_time: orderTime.toISOString(),
      subtotal: subtotal,
      shipping_cost: shippingCost,
      total: total,
      delivery_method: orderData.deliveryMethod,
      pickup_location: orderData.pickupLocation || null,
      pickup_location_normalized: pickupLocationNormalized,
      pickup_location_id: normalizedLocationId,
      distribution_person_id: autoFilledDistributionPersonId,
      payment_method: orderData.paymentMethod,
      payment_status: orderData.paymentMethod === "sumup" ? "paid" : "pending",
      status: "confirmed",
      notes: orderData.notes || null,
      pickup_reminders: orderData.emailReminder || false,
      email_notifications: orderData.emailUpdates || false,
      pickup_date: deliveryDate,
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

    console.log("[/api/orders] Creating order items with product IDs from cart")

    const orderItemsPromises = orderData.items.map(async (item: any) => {
      let productId = item.id || null

      if (!productId) {
        console.warn(
          `[/api/orders] ⚠️ No product_id (item.id) found for item: "${item.name}", trying name+price fallback`,
        )
        productId = await findProductIdByNameAndPrice(supabase, item.name, item.price)

        if (productId) {
          console.log(`[/api/orders] ✅ Fallback successful: Found product_id ${productId} for "${item.name}"`)
        } else {
          console.error(
            `[/api/orders] ❌ Fallback failed: Could not find product_id for "${item.name}" (€${item.price})`,
          )
        }
      }

      return {
        order_id: savedOrder.id,
        product_id: productId,
        product_name: item.name,
        product_category: item.category || "Unbekannt",
        product_size: item.size || item.unit || null,
        quantity: item.quantity,
        unit_price: item.price,
        expected_delivery_date: deliveryDate,
        delivery_schedule_id: scheduleId,
        created_at: orderTime.toISOString(),
      }
    })

    const orderItems = await Promise.all(orderItemsPromises)

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

    // ─────────────────────────────────────────────────────────────
    // QR CODE BLOCK – nur wenn QRCodeLib & putFn verfügbar
    // ─────────────────────────────────────────────────────────────
    if (QRCodeLib && putFn) {
      try {
        console.log("[v0] 🔲 BLOCK 4: QR Code Generation - STARTED")
        console.log("[v0] Order Number:", savedOrder.order_number)
        console.log("[v0] Pickup Token:", pickupToken)

        const pickupUrl = `https://suedfruechte-hohenlohe.de/pos/pickup?token=${pickupToken}`
        console.log("[v0] Generated Pickup URL:", pickupUrl)

        console.log("[v0] Generating QR code with QRCode.toDataURL...")
        const qrCodeDataUrl = await QRCodeLib.toDataURL(pickupUrl, {
          width: 400,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        })
        console.log("[v0] ✅ QR code data URL generated, length:", qrCodeDataUrl.length)

        console.log("[v0] Converting data URL to Buffer...")
        const base64Data = qrCodeDataUrl.split(",")[1]
        const buffer = Buffer.from(base64Data, "base64")
        console.log("[v0] ✅ Buffer created, size:", buffer.length, "bytes")

        const fileName = `qr-codes/${pickupToken}.png`
        console.log("[v0] Uploading to Vercel Blob storage as:", fileName)

        const blob = await putFn(fileName, buffer, {
          access: "public",
          contentType: "image/png",
        })
        console.log("[v0] ✅ Uploaded to Blob storage, URL:", blob.url)

        const now = new Date()
        const expiresAt = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000)
        console.log("[v0] QR Code Expires At:", expiresAt.toISOString())

        console.log("[v0] Updating order with QR code URL in database...")
        const { error: updateError } = await supabase
          .from("orders")
          .update({
            qr_code_url: blob.url,
            qr_code_type: "order",
            qr_code_generated_at: now.toISOString(),
            qr_code_expires_at: expiresAt.toISOString(),
          })
          .eq("id", savedOrder.id)

        if (updateError) {
          console.error("[v0] ❌ Error updating order with QR code:", updateError)
          console.error("[v0] Update Error Details:", JSON.stringify(updateError, null, 2))
        } else {
          console.log("[v0] ✅ Database updated with QR code URL")
          savedOrder.qr_code_url = blob.url
        }

        console.log("[v0] 🔲 BLOCK 4: QR Code Generation - COMPLETED SUCCESSFULLY")
      } catch (qrError: any) {
        console.error("[v0] ❌ BLOCK 4: QR Code Generation - FAILED")
        console.error("[v0] Error Type:", qrError?.constructor?.name || typeof qrError)
        console.error("[v0] Error Message:", qrError?.message || String(qrError))
        console.error("[v0] Error Stack:", qrError?.stack)
      }
    } else {
      console.warn(
        "[v0] QR Code generation skipped because qrcode or @vercel/blob could not be imported (import failed).",
      )
    }

    // ─────────────────────────────────────────────────────────────
    // Pickup-Location aus Kommentar – nur wenn Parser verfügbar
    // ─────────────────────────────────────────────────────────────
    if (
      parsePickupLocationFromCommentFn &&
      savedOrder &&
      (!savedOrder.pickup_location ||
        savedOrder.pickup_location === "Lieferung" ||
        savedOrder.pickup_location.trim() === "")
    ) {
      if (orderData.notes && orderData.notes.trim().length > 0) {
        console.log("[/api/orders] Attempting to parse pickup location from comment...")

        const parsedLocation = await parsePickupLocationFromCommentFn(orderData.notes)

        if (parsedLocation.found && parsedLocation.confidence !== "low") {
          console.log(
            `[/api/orders] Found pickup location in comment: ${parsedLocation.pickupLocationName} (confidence: ${parsedLocation.confidence})`,
          )

          const { error: updateError } = await supabase
            .from("orders")
            .update({
              pickup_location: parsedLocation.matchedText,
              pickup_location_normalized: parsedLocation.pickupLocationName,
              pickup_location_id: parsedLocation.pickupLocationId,
            })
            .eq("id", savedOrder.id)

          if (updateError) {
            console.error("[/api/orders] Error updating order with parsed pickup location:", updateError)
          } else {
            console.log("[/api/orders] Successfully updated order with parsed pickup location")
          }
        } else {
          console.log("[/api/orders] No pickup location found in comment or confidence too low")
        }
      }
    } else if (!parsePickupLocationFromCommentFn) {
      console.warn(
        "[/api/orders] Pickup-location comment parser not available (import failed), skipping comment parsing.",
      )
    }

    // ─────────────────────────────────────────────────────────────
    // Invoice + E-Mail – nur wenn Resend importiert werden konnte
    // ─────────────────────────────────────────────────────────────
    if (savedOrder.payment_status === "paid" && ResendClass) {
      try {
        console.log("[/api/orders] Payment status is 'paid', creating HelloCash invoice for order ID:", savedOrder.id)

        const testMode = orderData.testMode === true
        if (testMode) {
          console.log("[/api/orders] Test mode enabled - creating TEST invoice")
        }

        await createInvoiceAfterPayment(savedOrder.id, undefined, testMode)

        console.log("[/api/orders] HelloCash invoice created successfully")

        console.log("[/api/orders] Fetching updated order for email...")
        const { data: updatedOrder, error: fetchError } = await supabase
          .from("orders")
          .select(
            `
            *,
            customer:customers(*),
            order_items(
              *, 
              products(*)
            )
          `,
          )
          .eq("id", savedOrder.id)
          .single()

        if (fetchError || !updatedOrder) {
          console.error("[/api/orders] Error fetching updated order:", fetchError)
        } else {
          console.log("[/api/orders] Sending customer confirmation email with invoice PDF...")

          // buildEmail & emailCopy werden hier dynamisch importiert
          let buildEmailFn: any = null
          let emailCopyObj: any = null
          try {
            const buildModule = await import("@/lib/email/build")
            buildEmailFn = buildModule.buildEmail
            const copyModule = await import("@/lib/email/copy")
            emailCopyObj = copyModule.emailCopy
            console.log("[/api/orders] ✓ Email templates imported successfully")
          } catch (emailImportError) {
            console.error("[/api/orders] ❌ Failed to import email templates:", emailImportError)
          }

          const emailVars = {
            customerName: `${updatedOrder.customer.first_name || ""} ${updatedOrder.customer.last_name || ""}`.trim(),
            orderNumber: updatedOrder.order_number || "",
            orderId: updatedOrder.order_number || "",
            orderDate: updatedOrder.created_at ? new Date(updatedOrder.created_at).toLocaleDateString("de-DE") : "",
            orderTotal: updatedOrder.total ? updatedOrder.total.toFixed(2) : "0.00",
            total: updatedOrder.total ? updatedOrder.total.toFixed(2) : "0.00",
            subtotal: updatedOrder.subtotal ? updatedOrder.subtotal.toFixed(2) : "0.00",
            pickupLocation:
              updatedOrder.pickup_location_normalized || updatedOrder.pickup_location || "Siehe Bestellbestätigung",
            pickupDate: updatedOrder.pickup_date
              ? new Date(updatedOrder.pickup_date).toLocaleDateString("de-DE", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })
              : null,
            paymentMethod: updatedOrder.payment_method || "Nicht angegeben",
            paymentStatus: updatedOrder.payment_status || "pending",
            deliveryMethod: updatedOrder.delivery_method || "pickup",
            orderItems: (updatedOrder.order_items || []).map((item: any) => ({
              product_name: item.products?.name || item.product_name || "Unbekanntes Produkt",
              quantity: item.quantity || 0,
              unit_price: item.unit_price || 0,
              total_price: item.total_price || item.quantity * item.unit_price || 0,
              product_size: item.product_size || item.products?.unit || null,
            })),
          }

          let subject = "Ihre Bestellung bei Südfrüchte Hohenlohe"
          let html = "<p>Vielen Dank für Ihre Bestellung.</p>"

          if (buildEmailFn && emailCopyObj) {
            const built = buildEmailFn("paymentReceipt", emailVars, emailCopyObj)
            subject = built.subject
            html = built.html
          } else {
            console.warn(
              "[/api/orders] buildEmail or emailCopy could not be imported, using simple fallback email template.",
            )
          }

          let attachments: Array<{ filename: string; content: string }> | undefined

          if (updatedOrder.hellocash_invoice_id) {
            try {
              const helloCashToken = process.env.HELLOCASH_API_TOKEN
              if (helloCashToken) {
                const pdfResponse = await fetch(
                  `https://api.hellocash.business/api/v1/invoices/${updatedOrder.hellocash_invoice_id}/pdf?cancellation=false&locale=de_DE`,
                  {
                    method: "GET",
                    headers: {
                      Authorization: `Bearer ${helloCashToken}`,
                      Accept: "application/json",
                    },
                  },
                )

                if (pdfResponse.ok) {
                  const pdfData = await pdfResponse.json()
                  attachments = [
                    {
                      filename: `Rechnung_${updatedOrder.order_number}.pdf`,
                      content: pdfData.pdf_base64_encoded,
                    },
                  ]
                  console.log("[/api/orders] Invoice PDF attached successfully")
                } else {
                  console.error("[/api/orders] Failed to fetch invoice PDF:", await pdfResponse.text())
                }
              }
            } catch (pdfError) {
              console.error("[/api/orders] Error fetching invoice PDF:", pdfError)
            }
          }

          const resend = new ResendClass(process.env.RESEND_API_KEY)
          await resend.emails.send({
            from: "Südfrüchte Hohenlohe <noreply@suedfruechte-hohenlohe.de>",
            to: updatedOrder.customer.email,
            subject,
            html,
            attachments,
          })

          console.log(`[/api/orders] ✅ Customer confirmation email sent to ${updatedOrder.customer.email}`)
        }
      } catch (invoiceError: any) {
        console.error("[/api/orders] Error in invoice/email process:", invoiceError.message)
      }
    } else if (!ResendClass) {
      console.warn("[/api/orders] Resend could not be imported, skipping email sending.")
    } else {
      console.log("[/api/orders] Payment status is not 'paid', skipping invoice generation and payment receipt email")
    }

    if (ResendClass) {
      try {
        console.log("[/api/orders] Sending admin copy for order:", savedOrder.id)

        const { data: orderForAdmin, error: adminFetchError } = await supabase
          .from("orders")
          .select(
            `
            *,
            customer:customers(*),
            order_items(
              *, 
              products(*)
            )
          `,
          )
          .eq("id", savedOrder.id)
          .single()

        if (adminFetchError || !orderForAdmin) {
          console.error("[/api/orders] Error fetching order for admin copy:", adminFetchError)
        } else {
          let buildEmailFn: any = null
          let emailCopyObj: any = null
          try {
            const buildModule = await import("@/lib/email/build")
            buildEmailFn = buildModule.buildEmail
            const copyModule = await import("@/lib/email/copy")
            emailCopyObj = copyModule.emailCopy
          } catch (emailImportError) {
            console.error("[/api/orders] Failed to import email templates for admin copy:", emailImportError)
          }

          const emailVars = {
            customerName: `${orderForAdmin.customer.first_name || ""} ${orderForAdmin.customer.last_name || ""}`.trim(),
            orderNumber: orderForAdmin.order_number || "",
            orderId: orderForAdmin.order_number || "",
            orderDate: orderForAdmin.created_at ? new Date(orderForAdmin.created_at).toLocaleDateString("de-DE") : "",
            orderTotal: orderForAdmin.total ? orderForAdmin.total.toFixed(2) : "0.00",
            total: orderForAdmin.total ? orderForAdmin.total.toFixed(2) : "0.00",
            subtotal: orderForAdmin.subtotal ? orderForAdmin.subtotal.toFixed(2) : "0.00",
            pickupLocation:
              orderForAdmin.pickup_location_normalized || orderForAdmin.pickup_location || "Siehe Bestellbestätigung",
            pickupDate: orderForAdmin.pickup_date
              ? new Date(orderForAdmin.pickup_date).toLocaleDateString("de-DE", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })
              : null,
            paymentMethod: orderForAdmin.payment_method || "Nicht angegeben",
            paymentStatus: orderForAdmin.payment_status || "pending",
            deliveryMethod: orderForAdmin.delivery_method || "pickup",
            orderItems: (orderForAdmin.order_items || []).map((item: any) => ({
              product_name: item.products?.name || item.product_name || "Unbekanntes Produkt",
              quantity: item.quantity || 0,
              unit_price: item.unit_price || 0,
              total_price: item.total_price || item.quantity * item.unit_price || 0,
              product_size: item.product_size || item.products?.unit || null,
            })),
          }

          let subject = "Ihre Bestellung bei Südfrüchte Hohenlohe"
          let html = "<p>Vielen Dank für Ihre Bestellung.</p>"

          if (buildEmailFn && emailCopyObj) {
            const built = buildEmailFn("orderConfirmation", emailVars, emailCopyObj)
            subject = built.subject
            html = built.html
          }

          let attachments: Array<{ filename: string; content: string }> | undefined

          // Only attach PDF if invoice was created (paid orders)
          if (orderForAdmin.hellocash_invoice_id && orderForAdmin.payment_status === "paid") {
            try {
              const helloCashToken = process.env.HELLOCASH_API_TOKEN
              if (helloCashToken) {
                const pdfResponse = await fetch(
                  `https://api.hellocash.business/api/v1/invoices/${orderForAdmin.hellocash_invoice_id}/pdf?cancellation=false&locale=de_DE`,
                  {
                    method: "GET",
                    headers: {
                      Authorization: `Bearer ${helloCashToken}`,
                      Accept: "application/json",
                    },
                  },
                )

                if (pdfResponse.ok) {
                  const pdfData = await pdfResponse.json()
                  attachments = [
                    {
                      filename: `Rechnung_${orderForAdmin.order_number}.pdf`,
                      content: pdfData.pdf_base64_encoded,
                    },
                  ]
                  console.log("[/api/orders] Invoice PDF attached to admin copy")
                } else {
                  console.error("[/api/orders] Error fetching PDF for admin copy:", await pdfResponse.text())
                }
              }
            } catch (pdfError) {
              console.error("[/api/orders] Error fetching PDF for admin copy:", pdfError)
            }
          }

          const adminEmail = process.env.SUMUP_PAY_TO_EMAIL || "kontakt@suedfruechte-hohenlohe.de"
          const resend = new ResendClass(process.env.RESEND_API_KEY)

          await resend.emails.send({
            from: "Südfrüchte Hohenlohe <noreply@suedfruechte-hohenlohe.de>",
            to: adminEmail,
            subject: `[ADMIN-KOPIE] ${subject}`,
            html: `
              <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; margin-bottom: 20px; border-radius: 8px;">
                <strong style="color: #92400e;">Admin-Kopie der Bestellung</strong><br>
                <span style="color: #78350f;">Kunde: ${orderForAdmin.customer.email}</span><br>
                <span style="color: #78350f;">Zahlungsstatus: ${orderForAdmin.payment_status}</span><br>
                <span style="color: #78350f;">Zahlungsmethode: ${orderForAdmin.payment_method}</span>
              </div>
              ${html}
            `,
            attachments,
          })

          console.log(`[/api/orders] ✅ Admin copy sent to ${adminEmail}`)
        }
      } catch (adminEmailError: any) {
        console.error("[/api/orders] Error sending admin copy:", adminEmailError.message)
      }
    }

    // ─────────────────────────────────────────────────────────────
    // Inventory Movements
    // ─────────────────────────────────────────────────────────────
    if (savedOrder.status === "confirmed") {
      try {
        const itemsWithProductId = itemsResult.filter((item: any) => item.product_id !== null)
        const itemsWithoutProductId = itemsResult.filter((item: any) => item.product_id === null)

        if (itemsWithoutProductId.length > 0) {
          console.warn(
            `[/api/orders] ⚠️ ${itemsWithoutProductId.length} items without product_id, inventory movements will not be created for:`,
            itemsWithoutProductId.map((i: any) => i.product_name),
          )
        }

        if (itemsWithProductId.length > 0) {
          const { data: productsData } = await supabase
            .from("products")
            .select("id, weight_kg, inventory_raw_id")
            .in(
              "id",
              itemsWithProductId.map((item: any) => item.product_id),
            )

          const productsMap = new Map(productsData?.map((p: any) => [p.id, p]) || [])

          const enrichedOrderItems = itemsWithProductId.map((item: any) => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.product_name,
            product_category: item.product_category,
            quantity: item.quantity,
            unit_price: item.unit_price,
            inventory_raw_id: productsMap.get(item.product_id)?.inventory_raw_id || null,
            weight_kg: productsMap.get(item.product_id)?.weight_kg || null,
          }))

          await createMovementsFromOrder(
            savedOrder.id,
            savedOrder.order_number,
            enrichedOrderItems,
            "Kundenbestellung",
            savedOrder.user_id, // Pass user_id as createdBy
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
  } catch (error: any) {
    console.error("[v0] POST /api/orders - ❌ Unhandled error in catch block:", error)
    console.error("[v0] POST /api/orders - Error type:", typeof error)
    console.error("[v0] POST /api/orders - Error constructor:", error?.constructor?.name)

    if (error instanceof Error) {
      console.error("[v0] POST /api/orders - Error message:", error.message)
      console.error("[v0] POST /api/orders - Error stack:", error.stack)
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
        type: error?.constructor?.name || typeof error,
      },
      { status: 500, headers: { "content-type": "application/json" } },
    )
  }
}
