import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/api-auth"
import { buildEmail } from "@/lib/email/build"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

interface RecipientFilter {
  allCustomers?: boolean
  newsletterConsent?: boolean
  marketingConsent?: boolean
  reminderConsent?: boolean
  pickupLocationNames?: string[]
  distributionPersonIds?: string[]
  activeOrdersOnly?: boolean
  orderStatuses?: string[]
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request)

    const { subject, content, imageUrl, attachment, filters, templateType } = (await request.json()) as {
      subject: string
      content: string
      imageUrl?: string
      attachment?: any
      filters: RecipientFilter
      templateType?: string
    }

    if (!subject || !content) {
      return NextResponse.json({ error: "Subject and content are required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    console.log("[v0] Newsletter send - Filters received:", filters)

    // Build the query with the same logic as /api/admin/newsletter/recipients
    let query = supabase.from("customers").select("id, email, first_name, last_name")

    // Apply consent filters
    if (filters.allCustomers) {
      query = query.not("email", "is", null).neq("email", "")
    } else {
      const orConditions: string[] = []

      if (filters.newsletterConsent) {
        orConditions.push("newsletter_subscribed.eq.true")
      }
      if (filters.marketingConsent) {
        orConditions.push("marketing_consent.eq.true")
      }
      if (filters.reminderConsent) {
        orConditions.push("reminder_notifications.eq.true")
      }

      if (orConditions.length === 0) {
        return NextResponse.json({ error: "No recipient filter selected" }, { status: 400 })
      }

      query = query.or(orConditions.join(",")).not("email", "is", null).neq("email", "")
    }

    const { data: allCustomers, error: fetchError } = await query

    if (fetchError) {
      console.error("[v0] Error fetching customers:", fetchError)
      return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
    }

    if (!allCustomers || allCustomers.length === 0) {
      return NextResponse.json({ error: "No customers found" }, { status: 400 })
    }

    console.log("[v0] Found customers matching consent filters:", allCustomers.length)

    let recipients = allCustomers

    // Filter by pickup location (normalized name)
    if (filters.pickupLocationNames && filters.pickupLocationNames.length > 0) {
      const normalizedNames = filters.pickupLocationNames.map((name) => name.trim().toLowerCase().split(",")[0].trim())

      // Get customer IDs that have orders with matching pickup locations
      const { data: matchingOrders } = await supabase
        .from("orders")
        .select("customer_id, pickup_location_normalized, pickup_location_id, pickup_locations(name)")
        .in(
          "customer_id",
          allCustomers.map((c) => c.id),
        )

      if (matchingOrders) {
        const customerIdsWithMatchingLocations = new Set<string>()

        matchingOrders.forEach((order: any) => {
          // Try to match via JOIN first (if pickup_location_id is correct)
          if (order.pickup_locations?.name) {
            const locationName = order.pickup_locations.name.trim().toLowerCase().split(",")[0].trim()
            if (normalizedNames.includes(locationName)) {
              customerIdsWithMatchingLocations.add(order.customer_id)
            }
          }

          // Fallback: match via pickup_location_normalized
          if (order.pickup_location_normalized) {
            const normalizedLocation = order.pickup_location_normalized.trim().toLowerCase().split(",")[0].trim()
            if (normalizedNames.includes(normalizedLocation)) {
              customerIdsWithMatchingLocations.add(order.customer_id)
            }
          }
        })

        recipients = recipients.filter((customer) => customerIdsWithMatchingLocations.has(customer.id))
        console.log("[v0] After pickup location filter:", recipients.length)
      }
    }

    // Filter by distribution person
    if (filters.distributionPersonIds && filters.distributionPersonIds.length > 0) {
      // Get customers with matching default distribution person OR orders with matching distribution person
      const { data: matchingOrders } = await supabase
        .from("orders")
        .select("customer_id")
        .in("distribution_person_id", filters.distributionPersonIds)
        .in(
          "customer_id",
          recipients.map((c) => c.id),
        )

      const { data: matchingCustomers } = await supabase
        .from("customers")
        .select("id")
        .in("default_distribution_person_id", filters.distributionPersonIds)
        .in(
          "id",
          recipients.map((c) => c.id),
        )

      const matchingIds = new Set<string>()
      matchingOrders?.forEach((o: any) => matchingIds.add(o.customer_id))
      matchingCustomers?.forEach((c: any) => matchingIds.add(c.id))

      recipients = recipients.filter((customer) => matchingIds.has(customer.id))
      console.log("[v0] After distribution person filter:", recipients.length)
    }

    // Filter by active orders
    if (filters.activeOrdersOnly && filters.orderStatuses && filters.orderStatuses.length > 0) {
      const { data: activeOrders } = await supabase
        .from("orders")
        .select("customer_id")
        .in("status", filters.orderStatuses)
        .in(
          "customer_id",
          recipients.map((c) => c.id),
        )

      const activeCustomerIds = new Set(activeOrders?.map((o: any) => o.customer_id) || [])
      recipients = recipients.filter((customer) => activeCustomerIds.has(customer.id))
      console.log("[v0] After active orders filter:", recipients.length)
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: "No recipients found matching all filters" }, { status: 400 })
    }

    console.log(`[v0] Final recipient count after all filters: ${recipients.length}`)

    console.log(`[v0] Sending newsletter to ${recipients.length} recipients with template type: ${templateType}`)

    const { data: newsletterSend, error: createError } = await supabase
      .from("newsletter_sends")
      .insert({
        subject,
        content,
        image_url: imageUrl,
        attachment,
        recipient_count: recipients.length,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (createError) {
      console.error("[v0] Error creating newsletter send record:", createError)
    }

    let sent = 0
    let failed = 0
    const errors: Array<{ email: string; error: string }> = []

    const isPickupReminder = templateType === "pickupReminder"
    const ordersMap: Record<string, any> = {}

    if (isPickupReminder) {
      // Load all relevant orders with pickup locations
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(
          `
          id,
          order_number,
          pickup_date,
          payment_method,
          customer_id,
          pickup_locations (
            name
          )
        `,
        )
        .in(
          "customer_id",
          recipients.map((r) => r.id),
        )
        .in("status", ["confirmed", "ready_for_pickup"])

      if (!ordersError && orders) {
        // Group orders by customer_id
        orders.forEach((order) => {
          if (!ordersMap[order.customer_id]) {
            ordersMap[order.customer_id] = []
          }
          ordersMap[order.customer_id].push(order)
        })
      }
    }

    for (const recipient of recipients) {
      try {
        const customerName = `${recipient.first_name || ""} ${recipient.last_name || ""}`.trim() || "Kunde"

        let personalizedContent = content
        const personalizedSubject = subject

        if (isPickupReminder && ordersMap[recipient.id] && ordersMap[recipient.id].length > 0) {
          // Use first active order for personalization
          const order = ordersMap[recipient.id][0]

          personalizedContent = content
            .replace(/\{\{orderNumber\}\}/g, order.order_number)
            .replace(
              /\{\{pickupDate\}\}/g,
              order.pickup_date ? new Date(order.pickup_date).toLocaleDateString("de-DE") : "TBD",
            )
            .replace(/\{\{pickupLocation\}\}/g, order.pickup_locations?.name || "TBD")
            .replace(
              /\{\{paymentMethod\}\}/g,
              order.payment_method === "bank_transfer" ? "Überweisung" : "Bar bei Abholung",
            )

          console.log(`[v0] Personalized content for ${recipient.email} with order ${order.order_number}`)
        } else if (isPickupReminder) {
          // Skip customers without active orders for pickup reminders
          console.log(`[v0] Skipping ${recipient.email} - no active orders for pickup reminder`)
          continue
        }

        const { html } = buildEmail("newsletter", {
          customerName,
          content: personalizedContent,
          imageUrl,
          newsletterId: newsletterSend?.id || "",
        })

        await resend.emails.send({
          from: "Südfrüchte Hohenlohe <noreply@suedfruechte-hohenlohe.de>",
          to: recipient.email,
          subject: personalizedSubject.replace(/\{\{customerName\}\}/g, customerName),
          html,
        })

        if (newsletterSend) {
          await supabase.from("newsletter_email_sends").insert({
            newsletter_send_id: newsletterSend.id,
            recipient_email: recipient.email,
            status: "sent",
            sent_at: new Date().toISOString(),
          })
        }

        sent++
      } catch (error) {
        console.error(`[v0] Error sending to ${recipient.email}:`, error)
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        errors.push({ email: recipient.email, error: errorMessage })

        if (newsletterSend) {
          await supabase.from("newsletter_email_sends").insert({
            newsletter_send_id: newsletterSend.id,
            recipient_email: recipient.email,
            status: "failed",
            error_message: errorMessage,
          })
        }

        failed++
      }
    }

    return NextResponse.json({
      success: true,
      results: {
        sent,
        failed,
        total: recipients.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    })
  } catch (error) {
    console.error("[v0] Error sending newsletter:", error)
    return NextResponse.json({ error: "Failed to send newsletter" }, { status: 500 })
  }
}
