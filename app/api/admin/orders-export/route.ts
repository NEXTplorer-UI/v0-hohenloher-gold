import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/auth/api-auth"

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    console.log("[v0] Starting orders export...")

    const supabase = createAdminClient()

    // Get orders with customer and order items data
    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        *,
        customers (
          first_name,
          last_name,
          email,
          phone,
          address,
          postal_code,
          city
        ),
        order_items (
          product_name,
          product_category,
          product_size,
          quantity,
          unit_price,
          total_price
        )
      `)
      .order("created_at", { ascending: false })
      .limit(1000) // Limit to last 1000 orders

    if (error) {
      console.error("[v0] Error fetching orders:", error)
      throw error
    }

    console.log(`[v0] Found ${orders?.length || 0} orders for export`)

    const { data: products } = await supabase.from("products").select("id, name, weight_kg")

    const productMap = new Map(products?.map((p) => [p.name, { id: p.id, weight: p.weight_kg }]) || [])

    const BOM = "\uFEFF" // Byte Order Mark for proper Excel UTF-8 handling
    const timestamp = new Date().toISOString().split("T")[0]

    const headers = [
      "Datum",
      "Uhrzeit",
      "Bestellnummer",
      "Kunde (Vorname)",
      "Kunde (Nachname)",
      "Email",
      "Telefon",
      "Adresse",
      "PLZ",
      "Stadt",
      "Status",
      "Zahlungsmethode",
      "Zahlungsstatus",
      "Liefermethode",
      "Abholort",
      "Abholdatum",
      "Zwischensumme",
      "Versandkosten",
      "Gesamtbetrag",
      "Artikel-ID",
      "Artikel (Gewicht kg)",
      "Artikel (Name)",
      "Artikel (Kategorie)",
      "Artikel (Größe)",
      "Artikel (Menge)",
      "Artikel (Gesamtgewicht kg)",
      "Artikel (Einzelpreis)",
      "Artikel (Gesamtpreis)",
      "Notizen",
      "Email-Benachrichtigungen",
      "Abhol-Erinnerungen",
    ]

    // Helper function to generate consistent product ID from name
    const generateProductId = (productName: string): string => {
      if (!productName) return ""
      // Create a simple hash-like ID from product name
      let hash = 0
      for (let i = 0; i < productName.length; i++) {
        const char = productName.charCodeAt(i)
        hash = (hash << 5) - hash + char
        hash = hash & hash // Convert to 32-bit integer
      }
      return Math.abs(hash).toString().padStart(6, "0")
    }

    // Transform data with proper formatting - one row per order item
    const csvRows: string[] = []

    orders?.forEach((order) => {
      const date = new Date(order.created_at)
      const dateStr = date.toLocaleDateString("de-DE") // DD.MM.YYYY format
      const timeStr = date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) // HH:MM format

      const customer = order.customers
      const pickupDate = order.pickup_date ? new Date(order.pickup_date).toLocaleDateString("de-DE") : ""

      // Helper function to escape CSV values
      const escapeCSV = (value: string | null | undefined): string => {
        if (!value) return ""
        return `"${value.toString().replace(/"/g, '""')}"`
      }

      // Helper function to translate status
      const translateStatus = (status: string): string => {
        const statusMap: { [key: string]: string } = {
          pending: "Ausstehend",
          confirmed: "Bestätigt",
          ready: "Bereit",
          picked_up: "Abgeholt",
          cancelled: "Storniert",
        }
        return statusMap[status] || status
      }

      // Helper function to translate payment method
      const translatePaymentMethod = (method: string): string => {
        const methodMap: { [key: string]: string } = {
          cash: "Barzahlung",
          card: "Kartenzahlung",
          bank_transfer: "Überweisung",
        }
        return methodMap[method] || method
      }

      // Helper function to translate payment status
      const translatePaymentStatus = (status: string): string => {
        const statusMap: { [key: string]: string } = {
          pending: "Ausstehend",
          paid: "Bezahlt",
          failed: "Fehlgeschlagen",
        }
        return statusMap[status] || status
      }

      // Helper function to translate delivery method
      const translateDeliveryMethod = (method: string): string => {
        const methodMap: { [key: string]: string } = {
          pickup: "Abholung",
          delivery: "Lieferung",
        }
        return methodMap[method] || method
      }

      // If order has items, create one row per item
      if (order.order_items && order.order_items.length > 0) {
        order.order_items.forEach((item) => {
          const productInfo = productMap.get(item.product_name)
          const productId = productInfo?.id || ""
          const productWeight = productInfo?.weight || 0
          const totalWeight = productWeight * item.quantity

          csvRows.push(
            [
              dateStr,
              timeStr,
              escapeCSV(order.order_number),
              escapeCSV(customer?.first_name),
              escapeCSV(customer?.last_name),
              escapeCSV(customer?.email),
              escapeCSV(customer?.phone),
              escapeCSV(customer?.address),
              escapeCSV(customer?.postal_code),
              escapeCSV(customer?.city),
              escapeCSV(translateStatus(order.status || "")),
              escapeCSV(translatePaymentMethod(order.payment_method || "")),
              escapeCSV(translatePaymentStatus(order.payment_status || "")),
              escapeCSV(translateDeliveryMethod(order.delivery_method || "")),
              escapeCSV(order.pickup_location),
              escapeCSV(pickupDate),
              order.subtotal?.toString() || "0",
              order.shipping_cost?.toString() || "0",
              order.total?.toString() || "0",
              productId.toString(), // Use actual product ID from database
              productWeight.toString(), // Added product weight
              escapeCSV(item.product_name),
              escapeCSV(item.product_category),
              escapeCSV(item.product_size),
              item.quantity?.toString() || "0",
              totalWeight.toFixed(2), // Added total weight for quantity
              item.unit_price?.toString() || "0",
              item.total_price?.toString() || "0",
              escapeCSV(order.notes),
              order.email_notifications ? "Ja" : "Nein",
              order.pickup_reminders ? "Ja" : "Nein",
            ].join(";"),
          )
        })
      } else {
        // If no items, create one row for the order
        csvRows.push(
          [
            dateStr,
            timeStr,
            escapeCSV(order.order_number),
            escapeCSV(customer?.first_name),
            escapeCSV(customer?.last_name),
            escapeCSV(customer?.email),
            escapeCSV(customer?.phone),
            escapeCSV(customer?.address),
            escapeCSV(customer?.postal_code),
            escapeCSV(customer?.city),
            escapeCSV(translateStatus(order.status || "")),
            escapeCSV(translatePaymentMethod(order.payment_method || "")),
            escapeCSV(translatePaymentStatus(order.payment_status || "")),
            escapeCSV(translateDeliveryMethod(order.delivery_method || "")),
            escapeCSV(order.pickup_location),
            escapeCSV(pickupDate),
            order.subtotal?.toString() || "0",
            order.shipping_cost?.toString() || "0",
            order.total?.toString() || "0",
            "", // product_id
            "", // product_weight
            "", // product_name
            "", // product_category
            "", // product_size
            "", // quantity
            "", // total_weight
            "", // unit_price
            "", // total_price
            escapeCSV(order.notes),
            order.email_notifications ? "Ja" : "Nein",
            order.pickup_reminders ? "Ja" : "Nein",
          ].join(";"),
        )
      }
    })

    // Calculate summary statistics
    const totalOrders = orders?.length || 0
    const totalRevenue = orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0
    const confirmedOrders = orders?.filter((o) => o.status === "confirmed").length || 0
    const readyOrders = orders?.filter((o) => o.status === "ready").length || 0
    const pickedUpOrders = orders?.filter((o) => o.status === "picked_up").length || 0
    const cancelledOrders = orders?.filter((o) => o.status === "cancelled").length || 0
    const paidOrders = orders?.filter((o) => o.payment_status === "paid").length || 0
    const pendingPayments = orders?.filter((o) => o.payment_status === "pending").length || 0

    const summaryRows = [
      "", // One empty line before summary
      "ZUSAMMENFASSUNG;;;;;;;;;;;;;;;;;;;;;;;;;;;", // Summary header in first column
      "", // One empty line after header
      `Gesamtbestellungen;${totalOrders};;;;;;;;;;;;;;;;;;;;;;;;;;`,
      `Gesamtumsatz;€${totalRevenue.toFixed(2)};;;;;;;;;;;;;;;;;;;;;;;;;;`,
      `Bestätigte Bestellungen;${confirmedOrders};;;;;;;;;;;;;;;;;;;;;;;;;;`,
      `Bereite Bestellungen;${readyOrders};;;;;;;;;;;;;;;;;;;;;;;;;;`,
      `Abgeholte Bestellungen;${pickedUpOrders};;;;;;;;;;;;;;;;;;;;;;;;;;`,
      `Stornierte Bestellungen;${cancelledOrders};;;;;;;;;;;;;;;;;;;;;;;;;;`,
      `Bezahlte Bestellungen;${paidOrders};;;;;;;;;;;;;;;;;;;;;;;;;;`,
      `Ausstehende Zahlungen;${pendingPayments};;;;;;;;;;;;;;;;;;;;;;;;;;`,
    ]

    const csv = BOM + headers.join(";") + "\n" + csvRows.join("\n") + "\n" + summaryRows.join("\n")

    console.log("[v0] Generated normalized orders CSV with", csvRows.length, "rows and summary")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bestellungen-${timestamp}.csv"`,
      },
    })
  } catch (error) {
    console.error("[v0] Error generating orders export:", error)
    return NextResponse.json({ error: "Failed to generate orders export" }, { status: 500 })
  }
}
