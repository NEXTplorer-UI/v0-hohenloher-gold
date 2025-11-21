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
  payment_method: { type: "string" },
  products: { type: "string" },
  product_count: { type: "number" },
  total: { type: "number" },
  created_at: { type: "date" },
  notes: { type: "string" },
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getAdminClient()
    const config = await request.json()

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
      console.error("[v0] Error fetching orders:", error)
      throw error
    }

    // Apply filters
    let filteredOrders = orders || []

    if (config.filters?.deliveryType && config.filters.deliveryType.length > 0) {
      filteredOrders = filteredOrders.filter((order: any) => {
        if (config.filters.deliveryType.includes("pickup") && order.is_pickup) return true
        if (config.filters.deliveryType.includes("shipping") && !order.is_pickup) return true
        return false
      })
    }

    if (config.filters?.paymentMethod && config.filters.paymentMethod.length > 0) {
      filteredOrders = filteredOrders.filter((order: any) =>
        config.filters.paymentMethod.includes(order.payment_method?.toLowerCase()),
      )
    }

    if (config.filters?.pickupLocations && config.filters.pickupLocations.length > 0) {
      const { data: selectedLocations } = await supabase
        .from("pickup_locations")
        .select("name")
        .in("id", config.filters.pickupLocations)

      const normalizedLocationNames = selectedLocations?.map((loc: any) => normalizeLocationName(loc.name)) || []

      filteredOrders = filteredOrders.filter((order: any) => {
        const orderLocation = normalizeLocationName(order.pickup_location_normalized)
        return normalizedLocationNames.includes(orderLocation)
      })
    }

    if (config.filters?.tours && config.filters.tours.length > 0) {
      const { data: routeLocations } = await supabase
        .from("route_locations")
        .select("pickup_location_id, pickup_locations!inner(name)")
        .in("route_id", config.filters.tours)

      const normalizedTourLocationNames =
        routeLocations?.map((rl: any) => normalizeLocationName(rl.pickup_locations.name)) || []

      filteredOrders = filteredOrders.filter((order: any) => {
        const orderLocation = normalizeLocationName(order.pickup_location_normalized)
        return normalizedTourLocationNames.includes(orderLocation)
      })
    }

    if (config.filters?.dateFrom) {
      const fromDate = new Date(config.filters.dateFrom)
      filteredOrders = filteredOrders.filter((order: any) => new Date(order.created_at) >= fromDate)
    }

    if (config.filters?.dateTo) {
      const toDate = new Date(config.filters.dateTo)
      filteredOrders = filteredOrders.filter((order: any) => new Date(order.created_at) <= toDate)
    }

    // Process data based on grouping
    const processedData = processOrderData(filteredOrders, config)

    return NextResponse.json({ data: processedData })
  } catch (error) {
    console.error("[v0] Error generating dynamic report:", error)
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
  }
}

function processOrderData(orders: any[], config: any) {
  const { groupBy, columns, aggregations, showAggregations } = config

  if (!groupBy || groupBy.length === 0) {
    // No grouping - return flat data
    return orders.map((order) => flattenOrder(order, columns))
  }

  // Group data
  const grouped = new Map<string, any[]>()

  orders.forEach((order) => {
    const groupKey = groupBy.map((field: string) => getFieldValue(order, field)).join("|||")

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, [])
    }
    grouped.get(groupKey)!.push(order)
  })

  // Create result rows
  const result: any[] = []
  const globalProductTotals: Record<string, number> = {}

  grouped.forEach((groupOrders, groupKey) => {
    const groupValues = groupKey.split("|||")

    const headerRow: any = { _isGroup: true }
    groupBy.forEach((field: string, index: number) => {
      headerRow[field] = groupValues[index]
    })

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

    if (hasAggregations) {
      result.push(aggRow)
    }

    if (showAggregations) {
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

      if (Object.keys(productTotals).length > 0) {
        Object.entries(productTotals)
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([product, quantity]) => {
            result.push({
              _isAggregation: true,
              _isProductTotal: true,
              products: product,
              product_count: quantity,
            })
          })
      }
    }
  })

  if (showAggregations && Object.keys(globalProductTotals).length > 0) {
    result.push({
      _isGroup: true,
      _isGlobalTotal: true,
      [groupBy[0]]: "═══ GESAMTSUMME ═══",
    })

    Object.entries(globalProductTotals)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([product, quantity]) => {
        result.push({
          _isAggregation: true,
          _isProductTotal: true,
          _isGlobalTotal: true,
          products: product,
          product_count: quantity,
        })
      })
  }

  return result
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
    case "customer_address":
      return order.customer?.address
    case "customer_street":
      return order.customer?.street
    case "customer_city":
      return order.customer?.city
    case "customer_country":
      return order.customer?.country
    case "status":
      return order.status
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
    default:
      return order[field]
  }
}
