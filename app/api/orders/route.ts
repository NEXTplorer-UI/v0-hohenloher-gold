import { type NextRequest, NextResponse } from "next/server"
import { getAdminClient } from "@/lib/supabase/admin"
import { createMovementsFromOrder } from "@/lib/inventory/movement-service"
import { createInvoiceAfterPayment } from "@/lib/hellocash/create-invoice-after-payment"
import { Resend } from "resend"
import { buildEmail } from "@/lib/email/build"
import { emailCopy } from "@/lib/email/copy"
import QRCode from "qrcode"
import { put } from "@vercel/blob"
import { normalizePickupLocation } from "@/lib/pickup-location-normalizer"
import { parsePickupLocationFromComment } from "@/lib/pickup-location-comment-parser"
import { randomUUID } from "crypto"

function toSlug(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

async function findPickupLocationId(
  supabase: ReturnType<typeof getAdminClient>,
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
  supabase: ReturnType<typeof getAdminClient>,
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

async function findProductIdByNameAndPrice(
  supabase: ReturnType<typeof getAdminClient>,
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

    const supabase = getAdminClient()

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

    let pickupLocationNormalized: string | null = null
    let normalizedLocationId: string | null = pickupLocationId

    if (orderData.pickupLocation) {
      try {
        const normalized = await normalizePickupLocation(orderData.pickupLocation)
        pickupLocationNormalized = normalized.normalized
        if (normalized.location_id) {
          normalizedLocationId = normalized.location_id
        }
        console.log("[/api/orders] Normalized pickup location:", {
          original: orderData.pickupLocation,
          normalized: pickupLocationNormalized,
          location_id: normalizedLocationId,
        })
      } catch (normError) {
        console.error("[/api/orders] Error normalizing pickup location:", normError)
        // Fail-safe: use original value
        pickupLocationNormalized = orderData.pickupLocation
      }
    }

    const pickupToken = randomUUID()
    console.log("[/api/orders] Generated pickup token:", pickupToken)

    let autoFilledDistributionPersonId = orderData.distributionPersonId || null
    let autoFilledPickupLocationId = pickupLocationId

    if (!autoFilledDistributionPersonId && customer.default_distribution_person_id) {
      autoFilledDistributionPersonId = customer.default_distribution_person_id
      console.log("[/api/orders] Auto-filled distribution_person_id from customer default:", autoFilledDistributionPersonId)
    }

    if (!autoFilledPickupLocationId && customer.default_pickup_location_id) {
      autoFilledPickupLocationId = customer.default_pickup_location_id
      console.log("[/api/orders] Auto-filled pickup_location_id from customer default:", autoFilledPickupLocationId)
      
      // Also update pickupLocationNormalized based on the default location
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
      distribution_person_id: autoFilledDistributionPersonId, // Use auto-filled value
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

      // Fallback: If no product_id, try to find it by name + price
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

    try {
      console.log("[/api/orders] Generating QR code for order:", savedOrder.order_number)

      const pickupUrl = `https://suedfruechte-hohenlohe.de/pos/pickup?token=${pickupToken}`

      const qrCodeDataUrl = await QRCode.toDataURL(pickupUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })

      // Convert data URL to Blob
      const base64Data = qrCodeDataUrl.split(",")[1]
      const binaryData = atob(base64Data)
      const bytes = new Uint8Array(binaryData.length)
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i)
      }
      const qrBlob = new Blob([bytes], { type: "image/png" })

      const fileName = `qr-codes/${pickupToken}.png`

      const blob = await put(fileName, qrBlob, {
        access: "public",
      })

      const now = new Date()
      const expiresAt = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000) // +45 days

      // Update order with QR code URL
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
        console.error("[/api/orders] Error updating order with QR code:", updateError)
      } else {
        console.log("[/api/orders] QR code generated and saved successfully for order:", savedOrder.order_number)
        // Update savedOrder object with QR code URL
        savedOrder.qr_code_url = blob.url
      }
    } catch (qrError: any) {
      console.error("[/api/orders] Error generating QR code:", qrError.message)
      // Don't fail the order if QR code generation fails
    }

    if (
      savedOrder &&
      (!savedOrder.pickup_location ||
        savedOrder.pickup_location === "Lieferung" ||
        savedOrder.pickup_location.trim() === "")
    ) {
      if (orderData.notes && orderData.notes.trim().length > 0) {
        console.log(
          "[/api/orders] Attempting to parse pickup location from comment..."
        )

        const parsedLocation = await parsePickupLocationFromComment(
          orderData.notes
        )

        if (parsedLocation.found && parsedLocation.confidence !== "low") {
          console.log(
            `[/api/orders] Found pickup location in comment: ${parsedLocation.pickupLocationName} (confidence: ${parsedLocation.confidence})`
          )

          // Update order with parsed pickup location
          const { error: updateError } = await supabase
            .from("orders")
            .update({
              pickup_location: parsedLocation.matchedText,
              pickup_location_normalized: parsedLocation.pickupLocationName,
              pickup_location_id: parsedLocation.pickupLocationId,
            })
            .eq("id", savedOrder.id)

          if (updateError) {
            console.error(
              "[/api/orders] Error updating order with parsed location:",
              updateError
            )
          } else {
            console.log(
              "[/api/orders] Successfully updated order with parsed pickup location"
            )
          }
        } else {
          console.log(
            "[/api/orders] No pickup location found in comment or confidence too low"
          )
        }
      }
    }

    if (savedOrder.payment_status === "paid") {
      try {
        console.log("[/api/orders] Payment status is 'paid', creating HelloCash invoice for order ID:", savedOrder.id)

        const testMode = orderData.testMode === true
        if (testMode) {
          console.log("[/api/orders] Test mode enabled - creating TEST invoice")
        }

        await createInvoiceAfterPayment(savedOrder.id, undefined, testMode)

        console.log("[/api/orders] HelloCash invoice created successfully")

        console.log("[/api/orders] Sending customer confirmation email with invoice PDF...")

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

          const emailVars = {
            customerName: `${updatedOrder.customer.first_name || ""} ${updatedOrder.customer.last_name || ""}`.trim(),
            orderNumber: updatedOrder.order_number || "",
            orderId: updatedOrder.order_number || "",
            orderDate: updatedOrder.created_at ? new Date(updatedOrder.created_at).toLocaleDateString("de-DE") : "",
            orderTotal: updatedOrder.total ? updatedOrder.total.toFixed(2) : "0.00",
            total: updatedOrder.total ? updatedOrder.total.toFixed(2) : "0.00",
            subtotal: updatedOrder.subtotal ? updatedOrder.subtotal.toFixed(2) : "0.00",
            pickupLocation: updatedOrder.pickup_location || "Siehe Bestellbestätigung",
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

          const { subject, html } = buildEmail("paymentReceipt", emailVars, emailCopy)

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

          const resend = new Resend(process.env.RESEND_API_KEY)
          await resend.emails.send({
            from: "Südfrüchte Hohenlohe <noreply@suedfruechte-hohenlohe.de>",
            to: updatedOrder.customer.email,
            subject,
            html,
            attachments,
          })

          console.log(`[/api/orders] ✅ Customer confirmation email sent to ${updatedOrder.customer.email}`)

          const adminEmail = process.env.SUMUP_PAY_TO_EMAIL || "kontakt@suedfruechte-hohenlohe.de"
          await resend.emails.send({
            from: "Südfrüchte Hohenlohe <noreply@suedfruechte-hohenlohe.de>",
            to: adminEmail,
            subject: `[KOPIE] ${subject}`,
            html: `
              <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; margin-bottom: 20px; border-radius: 8px;">
                <strong style="color: #92400e;">📧 Admin-Kopie</strong><br>
                <span style="color: #78350f;">Diese E-Mail wurde an ${updatedOrder.customer.email} gesendet</span>
              </div>
              ${html}
            `,
            attachments,
          })

          console.log(`[/api/orders] ✅ Admin copy sent to ${adminEmail}`)
        }
      } catch (invoiceError: any) {
        console.error("[/api/orders] Error in invoice/email process:", invoiceError.message)
      }
    } else {
      console.log("[/api/orders] Payment status is not 'paid', skipping invoice generation and payment receipt email")
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
