import { type NextRequest, NextResponse } from "next/server"
import { getAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface ExportOptions {
  format:
    | "standard"
    | "by-customer"
    | "by-location"
    | "by-article"
    | "by-price-analysis"
    | "delivery-list"
    | "picking-list"
    | "packing-list"
  sorting:
    | "order_number"
    | "customer_name"
    | "date"
    | "total"
    | "category"
    | "pickup_location"
    | "pickup_location_normalized"
  showSubtotals: boolean
  emptyLinesBetweenGroups: boolean
  showGroupHeaders: boolean
}

function escapeCSV(value: string | null | undefined): string {
  if (!value) return ""
  return `"${value.toString().replace(/"/g, '""')}"`
}

function translateStatus(status: string): string {
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

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Starting advanced orders export...")

    const supabase = getAdminClient()
    const { searchParams } = new URL(request.url)

    const idsParam = searchParams.get("ids")
    const selectedIds = idsParam ? idsParam.split(",").filter(Boolean) : null
    const format = (searchParams.get("format") || "standard") as ExportOptions["format"]
    const sorting = (searchParams.get("sorting") || "date") as ExportOptions["sorting"]
    const showSubtotals = searchParams.get("showSubtotals") === "true"
    const emptyLinesBetweenGroups = searchParams.get("emptyLinesBetweenGroups") === "true"
    const showGroupHeaders = searchParams.get("showGroupHeaders") === "true"

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

    let ordersToExport = selectedIds ? orders?.filter((order: any) => selectedIds.includes(order.id)) : orders

    ordersToExport = sortOrders(ordersToExport || [], sorting)

    const BOM = "\uFEFF"
    const timestamp = new Date().toISOString().split("T")[0]
    let csv = ""

    switch (format) {
      case "by-customer":
        csv = generateByCustomerCSV(ordersToExport, { showSubtotals, emptyLinesBetweenGroups, showGroupHeaders })
        break
      case "by-location":
        csv = generateByLocationCSV(ordersToExport, { showSubtotals, emptyLinesBetweenGroups, showGroupHeaders })
        break
      case "by-article":
        csv = generateByArticleCSV(ordersToExport, { showSubtotals, emptyLinesBetweenGroups, showGroupHeaders })
        break
      case "by-price-analysis":
        csv = generateByPriceAnalysisCSV(ordersToExport)
        break
      case "delivery-list":
        csv = generateDeliveryListCSV(ordersToExport)
        break
      case "picking-list":
        csv = generatePickingListCSV(ordersToExport)
        break
      case "packing-list":
        csv = generatePackingListCSV(ordersToExport)
        break
      default:
        csv = generateStandardCSV(ordersToExport)
    }

    console.log("[v0] Generated advanced orders CSV")

    return new NextResponse(BOM + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bestellungen-${format}-${timestamp}.csv"`,
      },
    })
  } catch (error) {
    console.error("[v0] Error generating advanced orders export:", error)
    return NextResponse.json({ error: "Failed to generate orders export" }, { status: 500 })
  }
}

function sortOrders(orders: any[], sorting: ExportOptions["sorting"]): any[] {
  return [...orders].sort((a, b) => {
    switch (sorting) {
      case "order_number":
        return a.order_number.localeCompare(b.order_number)
      case "customer_name":
        const nameA = `${a.customer?.last_name} ${a.customer?.first_name}`.toLowerCase()
        const nameB = `${b.customer?.last_name} ${b.customer?.first_name}`.toLowerCase()
        return nameA.localeCompare(nameB)
      case "date":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case "total":
        return (a.total || 0) - (b.total || 0)
      case "category":
        const categoryA = a.order_items?.[0]?.category || "Sonstiges"
        const categoryB = b.order_items?.[0]?.category || "Sonstiges"
        return categoryA.localeCompare(categoryB)
      case "pickup_location":
        const locationA = (a.pickup_location || "Lieferung").toLowerCase()
        const locationB = (b.pickup_location || "Lieferung").toLowerCase()
        return locationA.localeCompare(locationB, "de")
      case "pickup_location_normalized":
        const normalizedA = (a.pickup_location_normalized || a.pickup_location || "Lieferung").toLowerCase()
        const normalizedB = (b.pickup_location_normalized || b.pickup_location || "Lieferung").toLowerCase()
        return normalizedA.localeCompare(normalizedB, "de")
      default:
        return 0
    }
  })
}

function generateStandardCSV(orders: any[]): string {
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
    "Abholort (Original)",
    "Abholort (Normalisiert)",
    "Gesamtbetrag",
    "Artikel (Name)",
    "Artikel (Menge)",
    "Artikel (Einzelpreis)",
    "Artikel (Gesamtpreis)",
    "Notizen",
    "Admin-Notizen",
  ]

  const csvRows: string[] = []

  orders?.forEach((order: any) => {
    const date = new Date(order.created_at)
    const dateStr = date.toLocaleDateString("de-DE")
    const timeStr = date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
    const customer = order.customer || {}
    const items = Array.isArray(order.order_items) ? order.order_items : []

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
            escapeCSV(order.payment_method),
            escapeCSV(order.payment_status),
            escapeCSV(order.delivery_method),
            escapeCSV(order.pickup_location),
            escapeCSV(order.pickup_location_normalized),
            order.total?.toString() || "0",
            escapeCSV(item.product_name),
            item.quantity?.toString() || "0",
            item.unit_price?.toString() || "0",
            item.total_price?.toString() || "0",
            escapeCSV(order.notes),
            escapeCSV(order.admin_notes),
          ].join(";"),
        )
      })
    }
  })

  return headers.join(";") + "\n" + csvRows.join("\n")
}

function generateByCustomerCSV(orders: any[], options: Partial<ExportOptions>): string {
  const headers = [
    "Kunde",
    "Bestellnummer",
    "Datum",
    "Status",
    "Zahlungsart",
    "Abholort (Original)",
    "Abholort (Normalisiert)",
    "Notizen",
    "Artikel",
    "Menge",
    "Einzelpreis",
    "Gesamtpreis",
  ]

  const csvRows: string[] = [headers.join(";")]

  const byCustomer = new Map<string, any[]>()
  orders.forEach((order: any) => {
    const customerKey = `${order.customer?.last_name}, ${order.customer?.first_name}`
    if (!byCustomer.has(customerKey)) {
      byCustomer.set(customerKey, [])
    }
    byCustomer.get(customerKey)!.push(order)
  })

  byCustomer.forEach((customerOrders, customerName) => {
    if (options.showGroupHeaders) {
      csvRows.push(`\n"=== ${customerName} ===";;;;;;;;;;;;`)
    }

    let customerTotal = 0
    customerOrders.forEach((order: any) => {
      const date = new Date(order.created_at).toLocaleDateString("de-DE")
      const items = Array.isArray(order.order_items) ? order.order_items : []

      items.forEach((item: any, index: number) => {
        csvRows.push(
          [
            index === 0 ? escapeCSV(customerName) : "",
            index === 0 ? escapeCSV(order.order_number) : "",
            index === 0 ? date : "",
            index === 0 ? escapeCSV(translateStatus(order.status)) : "",
            index === 0 ? escapeCSV(order.payment_method) : "",
            index === 0 ? escapeCSV(order.pickup_location) : "",
            index === 0 ? escapeCSV(order.pickup_location_normalized) : "",
            index === 0 ? escapeCSV(order.notes) : "",
            escapeCSV(item.product_name),
            item.quantity?.toString() || "0",
            `€${(item.unit_price || 0).toFixed(2)}`,
            `€${(item.total_price || 0).toFixed(2)}`,
          ].join(";"),
        )
      })

      customerTotal += order.total || 0
    })

    if (options.showSubtotals) {
      csvRows.push(`;;;;;;;;"Zwischensumme ${customerName}:";;;€${customerTotal.toFixed(2)}`)
    }

    if (options.emptyLinesBetweenGroups) {
      csvRows.push("")
    }
  })

  return csvRows.join("\n")
}

function generateByLocationCSV(orders: any[], options: Partial<ExportOptions>): string {
  const headers = [
    "Abholort (Original)",
    "Abholort (Normalisiert)",
    "Bestellnummer",
    "Kunde",
    "Datum",
    "Status",
    "Artikel",
    "Menge",
    "Einzelpreis",
    "Gesamtpreis",
  ]

  const csvRows: string[] = [headers.join(";")]

  const byLocation = new Map<string, any[]>()
  orders.forEach((order: any) => {
    const location = order.pickup_location || "Lieferung"
    if (!byLocation.has(location)) {
      byLocation.set(location, [])
    }
    byLocation.get(location)!.push(order)
  })

  byLocation.forEach((locationOrders, location) => {
    if (options.showGroupHeaders) {
      csvRows.push(`\n"=== ${location} ===";;;;;;;;;;`)
    }

    let locationTotal = 0
    locationOrders.forEach((order: any) => {
      const date = new Date(order.created_at).toLocaleDateString("de-DE")
      const customerName = `${order.customer?.last_name}, ${order.customer?.first_name}`
      const items = Array.isArray(order.order_items) ? order.order_items : []

      items.forEach((item: any, index: number) => {
        csvRows.push(
          [
            index === 0 ? escapeCSV(location) : "",
            index === 0 ? escapeCSV(order.pickup_location_normalized) : "",
            index === 0 ? escapeCSV(order.order_number) : "",
            index === 0 ? escapeCSV(customerName) : "",
            index === 0 ? date : "",
            index === 0 ? escapeCSV(translateStatus(order.status)) : "",
            escapeCSV(item.product_name),
            item.quantity?.toString() || "0",
            `€${(item.unit_price || 0).toFixed(2)}`,
            `€${(item.total_price || 0).toFixed(2)}`,
          ].join(";"),
        )
      })

      locationTotal += order.total || 0
    })

    if (options.showSubtotals) {
      csvRows.push(`;;;;;;"Zwischensumme ${location}:";;;€${locationTotal.toFixed(2)}`)
    }

    if (options.emptyLinesBetweenGroups) {
      csvRows.push("")
    }
  })

  return csvRows.join("\n")
}

function generateByArticleCSV(orders: any[], options: Partial<ExportOptions>): string {
  const headers = [
    "Artikel",
    "Größe/Gewicht",
    "Preis",
    "Gesamtmenge",
    "Bestellnummer",
    "Kunde",
    "Menge",
    "Abholort (Original)",
    "Abholort (Normalisiert)",
  ]

  const csvRows: string[] = [headers.join(";")]

  const byArticle = new Map<
    string,
    {
      productName: string
      productSize: string
      unitPrice: number
      totalQuantity: number
      orders: Array<{
        orderNumber: string
        customerName: string
        quantity: number
        pickupLocation: string
        pickupLocationNormalized: string
      }>
    }
  >()

  orders.forEach((order: any) => {
    const items = Array.isArray(order.order_items) ? order.order_items : []
    const customerName = `${order.customer?.last_name}, ${order.customer?.first_name}`

    items.forEach((item: any) => {
      const articleKey = `${item.product_name}-${item.unit_price}`

      if (!byArticle.has(articleKey)) {
        byArticle.set(articleKey, {
          productName: item.product_name,
          productSize: item.product_size || item.weight ? `${item.weight}g` : "Standard",
          unitPrice: item.unit_price || 0,
          totalQuantity: 0,
          orders: [],
        })
      }

      const article = byArticle.get(articleKey)!
      article.totalQuantity += item.quantity || 0
      article.orders.push({
        orderNumber: order.order_number,
        customerName,
        quantity: item.quantity || 0,
        pickupLocation: order.pickup_location || "Lieferung",
        pickupLocationNormalized: order.pickup_location_normalized || order.pickup_location || "Lieferung",
      })
    })
  })

  byArticle.forEach((article) => {
    if (options.showGroupHeaders) {
      csvRows.push(`\n"=== ${article.productName} ===";;;;;;;;;;`)
      csvRows.push(`"Größe/Gewicht: ${article.productSize}";;;;;;;;;;`)
      csvRows.push(`"Preis: €${article.unitPrice.toFixed(2)}";;;;;;;;;;`)
      csvRows.push(`"Gesamtmenge: ${article.totalQuantity}";;;;;;;;;;`)
      csvRows.push("")
    }

    article.orders.forEach((orderInfo, index) => {
      csvRows.push(
        [
          index === 0 ? escapeCSV(article.productName) : "",
          index === 0 ? escapeCSV(article.productSize) : "",
          index === 0 ? `€${article.unitPrice.toFixed(2)}` : "",
          index === 0 ? article.totalQuantity.toString() : "",
          escapeCSV(orderInfo.orderNumber),
          escapeCSV(orderInfo.customerName),
          orderInfo.quantity.toString(),
          escapeCSV(orderInfo.pickupLocation),
          escapeCSV(orderInfo.pickupLocationNormalized),
        ].join(";"),
      )
    })

    if (options.showSubtotals) {
      const subtotal = article.totalQuantity * article.unitPrice
      csvRows.push(`;;;;"Zwischensumme:";;;€${subtotal.toFixed(2)};;`)
    }

    if (options.emptyLinesBetweenGroups) {
      csvRows.push("")
    }
  })

  return csvRows.join("\n")
}

function generateByPriceAnalysisCSV(orders: any[]): string {
  const headers = [
    "Produktname",
    "Erkannter Preis",
    "Gesamtmenge",
    "Anzahl Bestellungen",
    "Gesamtumsatz",
    "Durchschnittsmenge pro Bestellung",
  ]

  const csvRows: string[] = [headers.join(";")]

  const byPriceAnalysis = new Map<
    string,
    {
      productName: string
      unitPrice: number
      totalQuantity: number
      orderCount: number
      totalRevenue: number
    }
  >()

  orders.forEach((order: any) => {
    const items = Array.isArray(order.order_items) ? order.order_items : []

    items.forEach((item: any) => {
      const analysisKey = `${item.product_name}-${item.unit_price}`

      if (!byPriceAnalysis.has(analysisKey)) {
        byPriceAnalysis.set(analysisKey, {
          productName: item.product_name,
          unitPrice: item.unit_price || 0,
          totalQuantity: 0,
          orderCount: 0,
          totalRevenue: 0,
        })
      }

      const analysis = byPriceAnalysis.get(analysisKey)!
      analysis.totalQuantity += item.quantity || 0
      analysis.orderCount += 1
      analysis.totalRevenue += item.total_price || 0
    })
  })

  const sortedAnalysis = Array.from(byPriceAnalysis.values()).sort((a, b) => {
    const nameCompare = a.productName.localeCompare(b.productName)
    if (nameCompare !== 0) return nameCompare
    return a.unitPrice - b.unitPrice
  })

  sortedAnalysis.forEach((analysis) => {
    const avgQuantity = analysis.orderCount > 0 ? analysis.totalQuantity / analysis.orderCount : 0

    csvRows.push(
      [
        escapeCSV(analysis.productName),
        `€${analysis.unitPrice.toFixed(2)}`,
        analysis.totalQuantity.toString(),
        analysis.orderCount.toString(),
        `€${analysis.totalRevenue.toFixed(2)}`,
        avgQuantity.toFixed(1),
      ].join(";"),
    )
  })

  const grandTotalQuantity = sortedAnalysis.reduce((sum, a) => sum + a.totalQuantity, 0)
  const grandTotalRevenue = sortedAnalysis.reduce((sum, a) => sum + a.totalRevenue, 0)
  const grandTotalOrders = sortedAnalysis.reduce((sum, a) => sum + a.orderCount, 0)

  csvRows.push("")
  csvRows.push(
    [
      '"=== GESAMT ==="',
      "",
      grandTotalQuantity.toString(),
      grandTotalOrders.toString(),
      `€${grandTotalRevenue.toFixed(2)}`,
      "",
    ].join(";"),
  )

  return csvRows.join("\n")
}

function generateDeliveryListCSV(orders: any[]): string {
  const headers = [
    "Bestellnummer",
    "Kundendaten",
    "Adresse",
    "Bestellpositionen",
    "Gesamtpreis",
    "Zahlungsart",
    "Bestellkommentar",
    "Abholort",
    "Verteilperson",
  ]

  const csvRows: string[] = [headers.join(";")]

  const sortedOrders = [...orders].sort((a, b) => {
    const nameA = `${a.customer?.last_name || ""} ${a.customer?.first_name || ""}`.trim().toLowerCase()
    const nameB = `${b.customer?.last_name || ""} ${b.customer?.first_name || ""}`.trim().toLowerCase()
    return nameA.localeCompare(nameB, "de")
  })

  sortedOrders.forEach((order: any) => {
    const customer = order.customer || {}
    const items = Array.isArray(order.order_items) ? order.order_items : []

    const customerData = [`${customer.first_name || ""} ${customer.last_name || ""}`.trim(), customer.phone || ""]
      .filter((line) => line.length > 0)
      .join("\n")

    let address = ""

    if (customer.street || customer.house_number || customer.postal_code || customer.city) {
      const streetLine = customer.street
        ? `${customer.street}${customer.house_number ? " " + customer.house_number : ""}`
        : ""
      const cityLine =
        customer.postal_code && customer.city
          ? `${customer.postal_code} ${customer.city}`
          : customer.city || customer.postal_code || ""

      address = [streetLine, cityLine].filter((line) => line.length > 0).join("\n")
    }

    if (!address && customer.address) {
      address = customer.address
    }

    const orderItems = items
      .map((item: any) => {
        const size = item.product_size || (item.weight ? `${item.weight}g` : "")
        const sizeStr = size ? ` (${size})` : ""
        const quantity = item.quantity || 1
        const price = (item.total_price || 0).toFixed(2)
        return `${quantity}x ${item.product_name}${sizeStr} – ${price}€`
      })
      .join("\n")

    const totalPrice = `${(order.total || 0).toFixed(2)}€`
    const paymentMethod = order.payment_method || ""
    const notes = order.notes || ""
    const pickupLocation = order.pickup_location_normalized || order.pickup_location || "Lieferung"

    let distributionPerson = ""
    if (order.distribution_person_id) {
      distributionPerson = order.distribution_person?.name || order.distribution_person_id
    }

    csvRows.push(
      [
        escapeCSV(order.order_number),
        escapeCSV(customerData),
        escapeCSV(address),
        escapeCSV(orderItems),
        escapeCSV(totalPrice),
        escapeCSV(paymentMethod),
        escapeCSV(notes),
        escapeCSV(pickupLocation),
        escapeCSV(distributionPerson),
      ].join(";"),
    )
  })

  return csvRows.join("\n")
}

function generatePickingListCSV(orders: any[]): string {
  const headers = ["Abholort", "Verteilperson", "Artikel", "Größe", "Gesamtmenge", "Bestellnummern"]
  const csvRows: string[] = [headers.join(";")]

  // Group by pickup location (normalized) and distribution person
  const byLocationAndPerson = new Map<
    string,
    Map<
      string,
      Map<
        string,
        {
          productName: string
          productSize: string
          totalQuantity: number
          orderNumbers: string[]
        }
      >
    >
  >()

  orders.forEach((order: any) => {
    const location = order.pickup_location_normalized || order.pickup_location || "Lieferung"
    const personName = order.distribution_person?.name || "Nicht zugeordnet"
    const items = Array.isArray(order.order_items) ? order.order_items : []

    if (!byLocationAndPerson.has(location)) {
      byLocationAndPerson.set(location, new Map())
    }

    const locationMap = byLocationAndPerson.get(location)!

    if (!locationMap.has(personName)) {
      locationMap.set(personName, new Map())
    }

    const personMap = locationMap.get(personName)!

    items.forEach((item: any) => {
      const productKey = `${item.product_name}-${item.product_size || item.weight || ""}`

      if (!personMap.has(productKey)) {
        personMap.set(productKey, {
          productName: item.product_name,
          productSize: item.product_size || (item.weight ? `${item.weight}g` : "Standard"),
          totalQuantity: 0,
          orderNumbers: [],
        })
      }

      const product = personMap.get(productKey)!
      product.totalQuantity += item.quantity || 0
      if (!product.orderNumbers.includes(order.order_number)) {
        product.orderNumbers.push(order.order_number)
      }
    })
  })

  const sortedLocations = Array.from(byLocationAndPerson.keys()).sort((a, b) => a.localeCompare(b, "de"))

  sortedLocations.forEach((location) => {
    const locationMap = byLocationAndPerson.get(location)!

    // Add location header
    csvRows.push(`\n"=== ${location.toUpperCase()} ===";;;;`)
    csvRows.push("")

    // Sort persons alphabetically
    const sortedPersons = Array.from(locationMap.keys()).sort((a, b) => a.localeCompare(b, "de"))

    sortedPersons.forEach((personName) => {
      const personMap = locationMap.get(personName)!

      // Add person subheader
      csvRows.push(`;"Verteilperson: ${personName}";;;`)
      csvRows.push("")

      // Sort products alphabetically
      const sortedProducts = Array.from(personMap.values()).sort((a, b) =>
        a.productName.localeCompare(b.productName, "de"),
      )

      sortedProducts.forEach((product) => {
        csvRows.push(
          [
            "",
            "",
            escapeCSV(product.productName),
            escapeCSV(product.productSize),
            product.totalQuantity.toString(),
            escapeCSV(product.orderNumbers.join(", ")),
          ].join(";"),
        )
      })

      csvRows.push("")
    })
  })

  // Add summary
  csvRows.push('\n"=== ZUSAMMENFASSUNG ===";;;;')
  csvRows.push("")

  sortedLocations.forEach((location) => {
    const locationMap = byLocationAndPerson.get(location)!
    const personCount = locationMap.size

    let totalOrders = 0
    let totalProducts = 0

    locationMap.forEach((personMap) => {
      personMap.forEach((product) => {
        totalOrders += product.orderNumbers.length
        totalProducts += 1
      })
    })

    csvRows.push(
      [escapeCSV(`${location}:`), `${personCount} Verteilperson(en)`, `${totalProducts} Produkttypen`, "", "", ""].join(
        ";",
      ),
    )
  })

  return csvRows.join("\n")
}

function generatePackingListCSV(orders: any[]): string {
  const headers = [
    "Abholort",
    "Artikel",
    "Größe",
    "Gesamtmenge",
    "Einzelpreis",
    "Gesamtpreis",
    "Bestellnummern (Kunden)",
  ]
  const csvRows: string[] = [headers.join(";")]

  const byLocation = new Map<
    string,
    Map<
      string,
      {
        productName: string
        productSize: string
        totalQuantity: number
        unitPrice: number
        totalPrice: number
        orderDetails: string[]
      }
    >
  >()

  orders.forEach((order: any) => {
    const location = order.pickup_location_normalized || order.pickup_location || "Lieferung"
    const items = Array.isArray(order.order_items) ? order.order_items : []
    const customer = order.customer || {}
    const customerName = `${customer.last_name || ""}, ${customer.first_name || ""}`.trim()

    if (!byLocation.has(location)) {
      byLocation.set(location, new Map())
    }

    const locationMap = byLocation.get(location)!

    items.forEach((item: any) => {
      const productKey = `${item.product_name}-${item.product_size || item.weight || ""}-${item.unit_price || 0}`

      if (!locationMap.has(productKey)) {
        locationMap.set(productKey, {
          productName: item.product_name,
          productSize: item.product_size || (item.weight ? `${item.weight}g` : "Standard"),
          totalQuantity: 0,
          unitPrice: item.unit_price || 0,
          totalPrice: 0,
          orderDetails: [],
        })
      }

      const product = locationMap.get(productKey)!
      product.totalQuantity += item.quantity || 0
      product.totalPrice += item.total_price || 0
      product.orderDetails.push(`${order.order_number} (${customerName})`)
    })
  })

  const sortedLocations = Array.from(byLocation.keys()).sort((a, b) => a.localeCompare(b, "de"))

  sortedLocations.forEach((location) => {
    const locationMap = byLocation.get(location)!

    // Add location header
    csvRows.push(`\n"=== ABHOLORT: ${location.toUpperCase()} ===";;;;;;`)
    csvRows.push("")

    // Sort products alphabetically
    const sortedProducts = Array.from(locationMap.values()).sort((a, b) =>
      a.productName.localeCompare(b.productName, "de"),
    )

    let locationTotal = 0

    sortedProducts.forEach((product) => {
      locationTotal += product.totalPrice
      csvRows.push(
        [
          "",
          escapeCSV(product.productName),
          escapeCSV(product.productSize),
          product.totalQuantity.toString(),
          `€${product.unitPrice.toFixed(2)}`,
          `€${product.totalPrice.toFixed(2)}`,
          escapeCSV(product.orderDetails.join(", ")),
        ].join(";"),
      )
    })

    csvRows.push("")
    // Add location subtotal
    csvRows.push(
      [
        "",
        `"Zwischensumme ${location}:"`,
        "",
        "",
        "",
        `€${locationTotal.toFixed(2)}`,
        `${sortedProducts.reduce((sum, p) => sum + p.orderDetails.length, 0)} Bestellungen`,
      ].join(";"),
    )

    csvRows.push("")
  })

  // Add grand total
  csvRows.push('\n"=== GESAMTÜBERSICHT ===";;;;;;')
  csvRows.push("")

  let grandTotal = 0
  let grandOrderCount = 0

  sortedLocations.forEach((location) => {
    const locationMap = byLocation.get(location)!
    let locationTotal = 0
    const locationOrders = new Set<string>()

    locationMap.forEach((product) => {
      locationTotal += product.totalPrice
      product.orderDetails.forEach((detail) => {
        const orderNum = detail.split(" ")[0]
        locationOrders.add(orderNum)
      })
    })

    grandTotal += locationTotal
    grandOrderCount += locationOrders.size

    csvRows.push(
      [
        escapeCSV(`${location}:`),
        `${locationMap.size} Produkttypen`,
        "",
        "",
        "",
        `€${locationTotal.toFixed(2)}`,
        `${locationOrders.size} Bestellungen`,
      ].join(";"),
    )
  })

  csvRows.push("")
  csvRows.push(
    [
      '"GESAMT:"',
      `${sortedLocations.length} Abholorte`,
      "",
      "",
      "",
      `€${grandTotal.toFixed(2)}`,
      `${grandOrderCount} Bestellungen`,
    ].join(";"),
  )

  return csvRows.join("\n")
}
