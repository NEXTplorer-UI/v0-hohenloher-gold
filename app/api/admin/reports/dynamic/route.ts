import { type NextRequest, NextResponse } from "next/server"
import { getAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function normalizeLocationName(name: string | null | undefined): string {
  if (!name) return ""
  // Take only the part before the first comma, trim whitespace, lowercase
  return name.split(",")[0].trim().toLowerCase()
}

const AVAILABLE_COLUMNS_DEFS: Record<string, { type: string }> = {
  order_number: { type: "string" },
  customer_name: { type: "string" },
  customer_email: { type: "string" },
  customer_phone: { type: "string" },
  customer_postal_code: { type: "string" },
  customer_street: { type: "string" },
  customer_city: { type: "string" },
  customer_address: { type: "string" },
  pickup_location_normalized: { type: "string" },
  distribution_person: { type: "string" },
  status: { type: "string" },
  internal_status: { type: "string" },
  payment_method: { type: "string" },
  products: { type: "string" },
  product_count: { type: "number" },
  total: { type: "number" },
  created_at: { type: "date" },
  notes: { type: "string" },
  admin_notes: { type: "string" },
  special_requests: { type: "string" },
  pickup_month: { type: "string" },
  order_month: { type: "string" },
  delivery_method: { type: "string" },
  product_category: { type: "string" },
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] API: ========== REPORT DYNAMIC ROUTE CALLED ==========")

    const supabase = getAdminClient()
    const config = await request.json()

    console.log("[v0] API: Config received:", {
      hasFilters: !!config.filters,
      hasGroupBy: !!config.groupBy,
      groupByLength: config.groupBy?.length || 0,
      filtersKeys: config.filters ? Object.keys(config.filters) : [],
    })
    console.log("[v0] API: config.filters structure:", JSON.stringify(config.filters, null, 2))
    console.log("[v0] API: config.groupBy:", config.groupBy)

    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        *,
        customer:customers(*),
        order_items(*, product:products(*)),
        distribution_person:distribution_persons(id, name, phone),
        pickup_location_ref:pickup_locations!pickup_location_id(id, name)
      `)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1000)

    if (error) {
      console.error("[v0] API ERROR: Fetching orders failed:", error)
      throw error
    }

    console.log("[v0] API: Fetched orders count:", orders?.length || 0)

    // Apply filters
    let filteredOrders = orders || []

    if (config.filters?.dateRange?.start) {
      console.log("[v0] API: Applying start date filter:", config.filters.dateRange.start)
      const beforeCount = filteredOrders.length
      filteredOrders = filteredOrders.filter((order: any) => {
        if (!order.created_at) return false
        const orderDate = new Date(order.created_at)
        const startDate = new Date(config.filters.dateRange.start)
        // Set both to start of day for proper date-only comparison
        orderDate.setHours(0, 0, 0, 0)
        startDate.setHours(0, 0, 0, 0)
        return orderDate >= startDate
      })
      console.log("[v0] API: After start date filter:", beforeCount, "→", filteredOrders.length)
    }

    if (config.filters?.dateRange?.end) {
      console.log("[v0] API: Applying end date filter:", config.filters.dateRange.end)
      const beforeCount = filteredOrders.length
      filteredOrders = filteredOrders.filter((order: any) => {
        if (!order.created_at) return false
        const orderDate = new Date(order.created_at)
        const endDate = new Date(config.filters.dateRange.end)
        // Set both to end of day for proper date-only comparison
        orderDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)
        return orderDate <= endDate
      })
      console.log("[v0] API: After end date filter:", beforeCount, "→", filteredOrders.length)
    }

    if (
      config.filters?.deliveryType &&
      Array.isArray(config.filters.deliveryType) &&
      config.filters.deliveryType.length > 0
    ) {
      console.log("[v0] API: Applying deliveryType filter:", config.filters.deliveryType)
      const beforeCount = filteredOrders.length
      filteredOrders = filteredOrders.filter((order: any) => {
        if (config.filters.deliveryType.includes("pickup") && order.is_pickup) return true
        if (config.filters.deliveryType.includes("shipping") && !order.is_pickup) return true
        return false
      })
      console.log("[v0] API: After deliveryType filter:", beforeCount, "→", filteredOrders.length)
    }

    if (
      config.filters?.paymentMethod &&
      Array.isArray(config.filters.paymentMethod) &&
      config.filters.paymentMethod.length > 0
    ) {
      console.log("[v0] API: Applying paymentMethod filter:", config.filters.paymentMethod)
      const beforeCount = filteredOrders.length
      filteredOrders = filteredOrders.filter((order: any) =>
        config.filters.paymentMethod.includes(order.payment_method?.toLowerCase()),
      )
      console.log("[v0] API: After paymentMethod filter:", beforeCount, "→", filteredOrders.length)
    }

    if (
      config.filters?.pickupLocations &&
      Array.isArray(config.filters.pickupLocations) &&
      config.filters.pickupLocations.length > 0
    ) {
      console.log("[v0] API: Applying pickupLocations filter:", config.filters.pickupLocations)
      const { data: selectedLocations } = await supabase
        .from("pickup_locations")
        .select("name")
        .in("id", config.filters.pickupLocations)

      const normalizedLocationNames = selectedLocations?.map((loc: any) => normalizeLocationName(loc.name)) || []
      const beforeCount = filteredOrders.length

      filteredOrders = filteredOrders.filter((order: any) => {
        const orderLocation = normalizeLocationName(order.pickup_location_normalized)
        return normalizedLocationNames.includes(orderLocation)
      })
      console.log("[v0] API: After pickupLocations filter:", beforeCount, "→", filteredOrders.length)
    }

    if (config.filters?.tours && Array.isArray(config.filters.tours) && config.filters.tours.length > 0) {
      console.log("[v0] API: Applying tours filter:", config.filters.tours)
      const { data: routeLocations } = await supabase
        .from("route_locations")
        .select("pickup_location_id, pickup_locations!inner(name)")
        .in("route_id", config.filters.tours)

      const normalizedTourLocationNames =
        routeLocations?.map((rl: any) => normalizeLocationName(rl.pickup_locations.name)) || []
      const beforeCount = filteredOrders.length

      filteredOrders = filteredOrders.filter((order: any) => {
        const orderLocation = normalizeLocationName(order.pickup_location_normalized)
        return normalizedTourLocationNames.includes(orderLocation)
      })
      console.log("[v0] API: After tours filter:", beforeCount, "→", filteredOrders.length)
    }

    if (config.filters?.months && Array.isArray(config.filters.months) && config.filters.months.length > 0) {
      console.log("[v0] API: Applying months filter:", config.filters.months)
      const beforeCount = filteredOrders.length
      filteredOrders = filteredOrders.filter((order: any) => {
        const match = order.order_number?.match(/HG-\d{4}-(\d{2})-\d+/)
        if (!match) return false
        const orderMonth = match[1]
        return config.filters.months.includes(orderMonth)
      })
      console.log("[v0] API: After months filter:", beforeCount, "→", filteredOrders.length)
    }

    if (config.filters?.statuses && Array.isArray(config.filters.statuses) && config.filters.statuses.length > 0) {
      console.log("[v0] API: Applying statuses filter:", config.filters.statuses)
      const beforeCount = filteredOrders.length
      filteredOrders = filteredOrders.filter((order: any) => config.filters.statuses.includes(order.status))
      console.log("[v0] API: After statuses filter:", beforeCount, "→", filteredOrders.length)
    }

    if (config.filters?.dateFrom) {
      const fromDate = new Date(config.filters.dateFrom)
      const beforeCount = filteredOrders.length
      filteredOrders = filteredOrders.filter((order: any) => new Date(order.created_at) >= fromDate)
      console.log("[v0] API: After dateFrom filter:", beforeCount, "→", filteredOrders.length)
    }

    if (config.filters?.dateTo) {
      const toDate = new Date(config.filters.dateTo)
      const beforeCount = filteredOrders.length
      filteredOrders = filteredOrders.filter((order: any) => new Date(order.created_at) <= toDate)
      console.log("[v0] API: After dateTo filter:", beforeCount, "→", filteredOrders.length)
    }

    // Process data based on grouping
    console.log("[v0] API: Starting processOrderData with:", {
      orderCount: filteredOrders.length,
      groupBy: config.groupBy,
      hasColumns: !!config.columns,
    })

    const processedData = processOrderData(filteredOrders, config)

    console.log("[v0] API: Processed data rows:", processedData.length)
    console.log("[v0] API: ========== RETURNING RESPONSE ==========")

    return NextResponse.json({ data: processedData })
  } catch (error) {
    console.error("[v0] API ERROR: Exception caught:", error)
    console.error("[v0] API ERROR: Stack trace:", error instanceof Error ? error.stack : "No stack trace")
    console.error("[v0] API ERROR: Error message:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to generate report", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

function processOrderData(orders: any[], config: any) {
  console.log("[v0] API processOrderData: Starting with", orders.length, "orders")
  console.log("[v0] API processOrderData: groupBy:", config.groupBy)

  const { groupBy, columns, aggregations, showAggregations, showProductSummary, showProductDetails } = config

  if (!groupBy || groupBy.length === 0) {
    // No grouping - return flat data
    console.log("[v0] API processOrderData: No grouping, returning flat data")
    return orders.map((order) => flattenOrder(order, columns))
  }

  // Group data
  const grouped = new Map<string, any[]>()

  console.log("[v0] API processOrderData: Grouping by fields:", groupBy)

  orders.forEach((order, index) => {
    try {
      const groupKey = groupBy
        .map((field: string) => {
          const value = getFieldValue(order, field)
          console.log(`[v0] API processOrderData: Order ${index}, field "${field}" = "${value}"`)
          return value
        })
        .join("|||")

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, [])
      }
      grouped.get(groupKey)!.push(order)
    } catch (error) {
      console.error(`[v0] API processOrderData ERROR: Failed processing order ${index}:`, error)
      throw error
    }
  })

  console.log("[v0] API processOrderData: Created", grouped.size, "groups")

  const result: any[] = []
  const globalProductTotals: Record<string, number> = {}

  grouped.forEach((groupOrders, groupKey) => {
    const groupValues = groupKey.split("|||")

    const headerRow: any = { _isGroup: true }

    // Create readable label for the group
    const groupLabels: string[] = []
    groupBy.forEach((field: string, index: number) => {
      const fieldLabel = AVAILABLE_COLUMNS_DEFS[field] ? getFieldLabel(field) : field
      const fieldValue = groupValues[index]
      groupLabels.push(`${fieldLabel}: ${fieldValue}`)
      headerRow[field] = groupValues[index]
    })

    headerRow._groupLabel = groupLabels.join(" | ")

    result.push(headerRow)

    // Add detail rows
    groupOrders.forEach((order) => {
      result.push(flattenOrder(order, columns))
    })

    const aggRow: any = { _isAggregation: true }
    let hasAggregations = false

    columns.forEach((col: string) => {
      const colDef = AVAILABLE_COLUMNS_DEFS[col]
      if (colDef?.type === "number") {
        const sum = groupOrders.reduce((sum, order) => {
          const value = getFieldValue(order, col)
          return sum + (typeof value === "number" ? value : 0)
        }, 0)
        aggRow[col] = sum
        hasAggregations = true
      }
    })

    const productTotals: Record<string, number> = {}

    groupOrders.forEach((order) => {
      if (order.order_items && Array.isArray(order.order_items)) {
        order.order_items.forEach((item: any) => {
          const productName = item.product_name || "Unbekanntes Produkt"
          productTotals[productName] = (productTotals[productName] || 0) + (item.quantity || 0)
          globalProductTotals[productName] = (globalProductTotals[productName] || 0) + (item.quantity || 0)
        })
      }
    })

    if (showProductSummary && Object.keys(productTotals).length > 0) {
      const entries = Object.entries(productTotals).sort(([a], [b]) => a.localeCompare(b))
      const productsText = entries.map(([name, qty]) => `${qty}× ${name}`).join(", ")
      aggRow.product_summary = productsText
    }

    if (showAggregations && hasAggregations) {
      result.push(aggRow)
    }

    if (showProductDetails && Object.keys(productTotals).length > 0) {
      Object.entries(productTotals)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([product, quantity]) => {
          result.push({
            _isAggregation: true,
            _isProductDetail: true,
            products: `${quantity}× ${product}`,
          })
        })
    }
  })

  if ((showProductSummary || showProductDetails) && Object.keys(globalProductTotals).length > 0) {
    result.push({
      _isGroup: true,
      _isGlobalTotal: true,
      _groupLabel: "═══ GESAMTSUMME ALLER PRODUKTE ═══",
      [groupBy[0]]: "═══ GESAMTSUMME ═══",
    })

    if (showProductDetails) {
      Object.entries(globalProductTotals)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([product, quantity]) => {
          result.push({
            _isAggregation: true,
            _isProductDetail: true,
            _isGlobalTotal: true,
            products: `${quantity}× ${product}`,
          })
        })
    } else if (showProductSummary) {
      const entries = Object.entries(globalProductTotals).sort(([a], [b]) => a.localeCompare(b))
      const productsText = entries.map(([name, qty]) => `${qty}× ${name}`).join(", ")
      result.push({
        _isAggregation: true,
        product_summary: productsText,
      })
    }
  }

  return result
}

function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    pickup_location_normalized: "Abholort",
    distribution_person: "Verteilperson",
    product_category: "Warengruppe",
    pickup_month: "Abholmonat",
    order_month: "Bestellmonat",
    delivery_method: "Lieferart",
  }
  return labels[field] || field
}

function flattenOrder(order: any, columns: string[]) {
  const row: any = {}

  columns.forEach((col) => {
    row[col] = getFieldValue(order, col)
  })

  return row
}

function getFieldValue(order: any, field: string): any {
  switch (field) {
    case "order_number":
      return order.order_number
    case "customer_name":
      return `${order.customer?.last_name || ""}, ${order.customer?.first_name || ""}`.trim()
    case "customer_email":
      return order.customer?.email
    case "customer_phone":
      return order.customer?.phone
    case "customer_postal_code":
      return order.customer?.postal_code
    case "customer_street":
      return order.customer?.street
    case "customer_city":
      return order.customer?.city
    case "customer_country":
      return order.customer?.country
    case "status":
      return order.status
    case "internal_status":
      return order.internal_status
    case "payment_method":
      return order.payment_method
    case "payment_status":
      return order.payment_status
    case "pickup_location":
      return order.pickup_location
    case "pickup_location_normalized":
      return order.pickup_location_normalized || order.pickup_location_ref?.name || order.pickup_location
    case "distribution_person":
      return order.distribution_person?.name
    case "total":
      return order.total
    case "created_at":
      return new Date(order.created_at).toLocaleDateString("de-DE")
    case "products":
      return order.order_items?.map((item: any) => `${item.quantity}x ${item.product_name}`).join(", ") || ""
    case "product_count":
      return order.order_items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0
    case "notes":
      return order.notes
    case "admin_notes":
      return order.admin_notes
    case "special_requests":
      return order.customer?.special_requests
    case "pickup_month":
      if (order.pickup_date) {
        const date = new Date(order.pickup_date)
        const monthNames = [
          "Januar",
          "Februar",
          "März",
          "April",
          "Mai",
          "Juni",
          "Juli",
          "August",
          "September",
          "Oktober",
          "November",
          "Dezember",
        ]
        return `${monthNames[date.getMonth()]} ${date.getFullYear()}`
      }
      const pickupMatch = order.order_number?.match(/HG-(\d{4})-(\d{2})-\d+/)
      if (pickupMatch) {
        const year = pickupMatch[1]
        const month = Number.parseInt(pickupMatch[2], 10) - 1
        const monthNames = [
          "Januar",
          "Februar",
          "März",
          "April",
          "Mai",
          "Juni",
          "Juli",
          "August",
          "September",
          "Oktober",
          "November",
          "Dezember",
        ]
        return `${monthNames[month]} ${year}`
      }
      return "Unbekannt"

    case "order_month":
      const orderMatch = order.order_number?.match(/HG-(\d{4})-(\d{2})-\d+/)
      if (orderMatch) {
        const year = orderMatch[1]
        const month = Number.parseInt(orderMatch[2], 10) - 1
        const monthNames = [
          "Januar",
          "Februar",
          "März",
          "April",
          "Mai",
          "Juni",
          "Juli",
          "August",
          "September",
          "Oktober",
          "November",
          "Dezember",
        ]
        return `${monthNames[month]} ${year}`
      }
      return "Unbekannt"

    case "delivery_method":
      return order.is_pickup ? "Abholung" : "Lieferung"
    default:
      return order[field]
  }
}
