import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!url || !key) {
    throw new Error("Supabase ENV fehlt (URL/Service-Role-Key)")
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

function parseBulkOrderNames(notes: string | null): string[] {
  if (!notes) return []

  const lines = notes.split("\n")
  const names: string[] = []
  let inBulkSection = false

  for (const line of lines) {
    if (line.includes("Sammelbestellung für:")) {
      inBulkSection = true
      continue
    }

    if (inBulkSection) {
      const match = line.match(/^\d+\.\s*(.+)$/) || line.match(/^-\s*(.+)$/)
      if (match && match[1].trim()) {
        names.push(match[1].trim())
      } else if (line.trim() && !line.includes(":")) {
        break
      }
    }
  }

  return names
}

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Starting orders export...")

    const supabase = createAdminClient()

    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get("ids")
    const selectedIds = idsParam ? idsParam.split(",").filter(Boolean) : null

    const { data: orders, error } = await supabase.rpc("get_admin_orders", {
      q: "",
      status_filter: null,
      limit_count: 1000,
      offset_count: 0,
    })

    if (error) {
      console.error("[v0] Error fetching orders:", error)
      throw error
    }

    const ordersToExport = selectedIds ? orders?.filter((order: any) => selectedIds.includes(order.id)) : orders

    console.log(
      `[v0] Found ${ordersToExport?.length || 0} orders for export${selectedIds ? " (filtered by selection)" : ""}`,
    )

    const BOM = "\uFEFF"
    const timestamp = new Date().toISOString().split("T")[0]

    const headers = [
      "Datum",
      "Uhrzeit",
      "Bestellnummer",
      "Kunde (Vorname)",
      "Kunde (Nachname)",
      "Email",
      "Telefon",
      "Status",
      "Zahlungsmethode",
      "Zahlungsstatus",
      "Liefermethode",
      "Abholort",
      "Ist Sammelbestellung",
      "Anzahl Personen",
      "Sammelbestellung Namen",
      "Gesamtbetrag",
      "Artikel (Name)",
      "Artikel (Menge)",
      "Artikel (Einzelpreis)",
      "Artikel (Gesamtpreis)",
      "Notizen",
      "Admin-Notizen", // Added admin notes column
    ]

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
        completed: "Abgeholt",
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

    const csvRows: string[] = []

    ordersToExport?.forEach((order: any) => {
      const date = new Date(order.created_at)
      const dateStr = date.toLocaleDateString("de-DE")
      const timeStr = date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })

      const customer = order.customer || {}
      const items = Array.isArray(order.order_items) ? order.order_items : []

      const bulkOrderNames = parseBulkOrderNames(order.notes)
      const isBulkOrder = bulkOrderNames.length > 0
      const bulkOrderNamesStr = bulkOrderNames.join("; ")

      if (items.length > 0) {
        items.forEach((item: any) => {
          csvRows.push(
            [
              dateStr,
              timeStr,
              escapeCSV(order.order_number),
              escapeCSV(customer.first_name),
              escapeCSV(customer.last_name),
              escapeCSV(customer.email),
              escapeCSV(customer.phone),
              escapeCSV(translateStatus(order.status || "")),
              escapeCSV(translatePaymentMethod(order.payment_method || "")),
              escapeCSV(translatePaymentStatus(order.payment_status || "")),
              escapeCSV(translateDeliveryMethod(order.delivery_method || "")),
              escapeCSV(order.pickup_location),
              isBulkOrder ? "Ja" : "Nein",
              isBulkOrder ? bulkOrderNames.length.toString() : "0",
              escapeCSV(bulkOrderNamesStr),
              order.total?.toString() || "0",
              escapeCSV(item.product_name),
              item.quantity?.toString() || "0",
              item.unit_price?.toString() || "0",
              item.total_price?.toString() || "0",
              escapeCSV(order.notes),
              escapeCSV(order.admin_notes), // Added admin notes to export
            ].join(";"),
          )
        })
      } else {
        csvRows.push(
          [
            dateStr,
            timeStr,
            escapeCSV(order.order_number),
            escapeCSV(customer.first_name),
            escapeCSV(customer.last_name),
            escapeCSV(customer.email),
            escapeCSV(customer.phone),
            escapeCSV(translateStatus(order.status || "")),
            escapeCSV(translatePaymentMethod(order.payment_method || "")),
            escapeCSV(translatePaymentStatus(order.payment_status || "")),
            escapeCSV(translateDeliveryMethod(order.delivery_method || "")),
            escapeCSV(order.pickup_location),
            isBulkOrder ? "Ja" : "Nein",
            isBulkOrder ? bulkOrderNames.length.toString() : "0",
            escapeCSV(bulkOrderNamesStr),
            order.total?.toString() || "0",
            "",
            "",
            "",
            "",
            escapeCSV(order.notes),
            escapeCSV(order.admin_notes), // Added admin notes to export
          ].join(";"),
        )
      }
    })

    const totalOrders = ordersToExport?.length || 0
    const totalRevenue = ordersToExport?.reduce((sum: number, order: any) => sum + (Number(order.total) || 0), 0) || 0
    const confirmedOrders = ordersToExport?.filter((o: any) => o.status === "confirmed").length || 0
    const readyOrders = ordersToExport?.filter((o: any) => o.status === "ready").length || 0
    const pickedUpOrders =
      ordersToExport?.filter((o: any) => o.status === "picked_up" || o.status === "completed").length || 0
    const cancelledOrders = ordersToExport?.filter((o: any) => o.status === "cancelled").length || 0
    const paidOrders = ordersToExport?.filter((o: any) => o.payment_status === "paid").length || 0
    const pendingPayments = ordersToExport?.filter((o: any) => o.payment_status === "pending").length || 0

    const summaryRows = [
      "",
      "ZUSAMMENFASSUNG;;;;;;;;;;;;;;;;;",
      "",
      `Gesamtbestellungen;${totalOrders};;;;;;;;;;;;;;;;`,
      `Gesamtumsatz;€${totalRevenue.toFixed(2)};;;;;;;;;;;;;;;;`,
      `Bestätigte Bestellungen;${confirmedOrders};;;;;;;;;;;;;;;;`,
      `Bereite Bestellungen;${readyOrders};;;;;;;;;;;;;;;;`,
      `Abgeholte Bestellungen;${pickedUpOrders};;;;;;;;;;;;;;;;`,
      `Stornierte Bestellungen;${cancelledOrders};;;;;;;;;;;;;;;;`,
      `Bezahlte Bestellungen;${paidOrders};;;;;;;;;;;;;;;;`,
      `Ausstehende Zahlungen;${pendingPayments};;;;;;;;;;;;;;;;`,
    ]

    const csv = BOM + headers.join(";") + "\n" + csvRows.join("\n") + "\n" + summaryRows.join("\n")

    console.log("[v0] Generated orders CSV with", csvRows.length, "rows and summary")

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
