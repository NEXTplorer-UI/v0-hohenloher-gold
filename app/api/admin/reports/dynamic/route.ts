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
  customer_default_pickup_location: { type: "string" },
  customer_default_distribution_person: { type: "string" },
  pickup_location_normalized: { type: "string" },
  distribution_person: { type: "string" },
  status: { type: "string" },
  internal_status: { type: "string" },
  payment_method: { type: "string" },
  products: { type: "string" },
  products_südfrüchte: { type: "string" },
  products_other: { type: "string" },
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
      sortBy: config.sortBy,
      sortOrder: config.sortOrder,
      groupSortBy: config.groupSortBy,
      groupSortOrder: config.groupSortOrder,
      filtersKeys: config.filters ? Object.keys(config.filters) : [],
    })
    console.log("[v0] API: config.filters structure:", JSON.stringify(config.filters, null, 2))
    console.log("[v0] API: config.groupBy:", config.groupBy)

    const {
      columns,
      groupBy = [],
      filters = {},
      aggregations = [],
      showAggregations = false,
      showProductSummary = false,
      showProductDetails = false,
      showGroupProductTotals = false,
      showSeparateProductTotals = false,
      sortBy,
      sortOrder = "asc",
      groupSortBy,
      groupSortOrder = "asc",
    } = config

    const query = supabase
      .from("orders")
      .select(
        `
        *,
        customer:customers!orders_customer_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone,
          street,
          house_number,
          postal_code,
          city,
          default_pickup_location_id,
          default_distribution_person_id,
          default_pickup_location:pickup_locations!customers_default_pickup_location_id_fkey (
            name
          ),
          default_distribution_person:distribution_persons!customers_default_distribution_person_id_fkey (
            name
          )
        ),
        order_items!order_items_order_id_fkey (
          id,
          quantity,
          product_name,
          product_size,
          product_category,
          product_id,
          product:products!order_items_product_id_fkey (
            unit,
            category_id
          )
        ),
        distribution_person:distribution_persons!orders_distribution_person_id_fkey (
          name
        ),
        route:delivery_routes!orders_route_id_fkey (
          name
        )
      `,
      )
      .order("created_at", { ascending: false })

    // Fetch orders from the database
    const { data: orders, error } = await query

    if (error) {
      console.error("[v0] API ERROR: Failed to fetch orders:", error)
      throw error
    }

    // Apply filters
    let filteredOrders = orders || []

    if (filters.dateRange?.start) {
      console.log("[v0] API: Applying start date filter:", filters.dateRange.start)
      const beforeCount = filteredOrders.length
      filteredOrders = filteredOrders.filter((order: any) => {
        if (!order.created_at) return false
        const orderDate = new Date(order.created_at)
        const startDate = new Date(filters.dateRange.start)
        // Set both to start of day for proper date-only comparison
        orderDate.setHours(0, 0, 0, 0)
        startDate.setHours(0, 0, 0, 0)
        return orderDate >= startDate
      })
      console.log("[v0] API: After start date filter:", beforeCount, "→", filteredOrders.length)
    }

    if (filters.dateRange?.end) {
      console.log("[v0] API: Applying end date filter:", filters.dateRange.end)
      const beforeCount = filteredOrders.length
      filteredOrders = filteredOrders.filter((order: any) => {
        if (!order.created_at) return false
        const orderDate = new Date(order.created_at)
        const endDate = new Date(filters.dateRange.end)
        // Set both to end of day for proper date-only comparison
        orderDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)
        return orderDate <= endDate
      })
      console.log("[v0] API: After end date filter:", beforeCount, "→", filteredOrders.length)
    }

    if (filters.deliveryType && Array.isArray(filters.deliveryType) && filters.deliveryType.length > 0) {
      console.log("[v0] API: Applying deliveryType filter:", filters.deliveryType)
      const beforeCount = filteredOrders.length
      filteredOrders = filteredOrders.filter((order: any) => {
        if (filters.deliveryType.includes("pickup") && order.is_pickup) return true
        if (filters.deliveryType.includes("shipping") && !order.is_pickup) return true
        return false
      })
      console.log("[v0] API: After deliveryType filter:", beforeCount, "→", filteredOrders.length)
    }

    if (filters.paymentMethod && Array.isArray(filters.paymentMethod) && filters.paymentMethod.length > 0) {
      console.log("[v0] API: Applying paymentMethod filter:", filters.paymentMethod)
      const beforeCount = filteredOrders.length
      filteredOrders = filteredOrders.filter((order: any) =>
        filters.paymentMethod.includes(order.payment_method?.toLowerCase()),
      )
      console.log("[v0] API: After paymentMethod filter:", beforeCount, "→", filteredOrders.length)
    }

    if (filters.pickupLocations && Array.isArray(filters.pickupLocations) && filters.pickupLocations.length > 0) {
      console.log("[v0] API: Applying pickupLocations filter:", filters.pickupLocations)
      const { data: selectedLocations } = await supabase
        .from("pickup_locations")
        .select("name")
        .in("id", filters.pickupLocations)

      const normalizedLocationNames = selectedLocations?.map((loc: any) => normalizeLocationName(loc.name)) || []
      const beforeCount = filteredOrders.length

      filteredOrders = filteredOrders.filter((order: any) => {
        const orderLocation = normalizeLocationName(order.pickup_location_normalized)
        return normalizedLocationNames.includes(orderLocation)
      })
      console.log("[v0] API: After pickupLocations filter:", beforeCount, "→", filteredOrders.length)
    }

    if (filters.legacyChiemgau === true) {
      console.log("[v0] API: Applying legacy chiemgau filter")
      const beforeCount = filteredOrders.length

      filteredOrders = filteredOrders.filter((order: any) => {
        const orderLocation = normalizeLocationName(order.pickup_location_normalized)
        return orderLocation === "chiemgau"
      })
      console.log("[v0] API: After legacy chiemgau filter:", beforeCount, "→", filteredOrders.length)
    }

    if (filters.months && Array.isArray(filters.months) && filters.months.length > 0) {
      console.log("[v0] API: Applying months filter:", filters.months)
      const beforeCount = filteredOrders.length
      filteredOrders = filteredOrders.filter((order: any) => {
        const match = order.order_number?.match(/HG-\d{4}-(\d{2})-\d+/)
        if (!match) return false
        const orderMonth = match[1]
        return filters.months.includes(orderMonth)
      })
      console.log("[v0] API: After months filter:", beforeCount, "→", filteredOrders.length)
    }

    if (filters.statuses && Array.isArray(filters.statuses) && filters.statuses.length > 0) {
      console.log("[v0] API: Applying statuses filter:", filters.statuses)
      const beforeCount = filteredOrders.length
      filteredOrders = filteredOrders.filter((order: any) => filters.statuses.includes(order.status))
      console.log("[v0] API: After statuses filter:", beforeCount, "→", filteredOrders.length)
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom)
      const beforeCount = filteredOrders.length
      filteredOrders = filteredOrders.filter((order: any) => new Date(order.created_at) >= fromDate)
      console.log("[v0] API: After dateFrom filter:", beforeCount, "→", filteredOrders.length)
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo)
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

  const {
    columns,
    groupBy = [],
    filters = {},
    aggregations = [],
    showAggregations = false,
    showProductSummary = false,
    showProductDetails = false,
    showGroupProductTotals = false,
    showSeparateProductTotals = false,
    sortBy,
    sortOrder = "asc",
    groupSortBy,
    groupSortOrder = "asc",
  } = config

  if (!groupBy || groupBy.length === 0) {
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
          const normalizedValue = field === "pickup_location_normalized" ? normalizeLocationName(value) : value
          console.log(
            `[v0] API processOrderData: Order ${index}, field "${field}" = "${value}" (normalized: "${normalizedValue}")`,
          )
          return normalizedValue
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

  const groupEntries = Array.from(grouped.entries())

  if (groupSortBy) {
    console.log("[v0] API processOrderData: Sorting groups by:", groupSortBy, "order:", groupSortOrder)

    groupEntries.sort((a, b) => {
      const [keyA] = a
      const [keyB] = b

      if (groupSortBy === "name") {
        // Sort by group name (the groupKey)
        const comparison = keyA.localeCompare(keyB, "de-DE")
        return groupSortOrder === "desc" ? -comparison : comparison
      } else if (groupSortBy === "count") {
        // Sort by number of orders in group
        const countA = a[1].length
        const countB = b[1].length
        return groupSortOrder === "desc" ? countB - countA : countA - countB
      }

      return 0
    })

    console.log("[v0] API processOrderData: Groups sorted")
  }

  const result: any[] = []
  const globalProductTotals: Record<string, number> = {}
  const globalProductTotalsSuedfruechte: Record<string, number> = {}
  const globalProductTotalsOther: Record<string, number> = {}

  groupEntries.forEach(([groupKey, groupOrders]) => {
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

    console.log(
      "[v0] API processOrderData: Sorting group, sortBy:",
      sortBy,
      "sortOrder:",
      sortOrder,
      "group size:",
      groupOrders.length,
    )

    if (sortBy && groupOrders.length > 1) {
      console.log("[v0] API processOrderData: Applying sort to group...")
      groupOrders.sort((a, b) => {
        const aVal = getFieldValue(a, sortBy)
        const bVal = getFieldValue(b, sortBy)

        console.log("[v0] API processOrderData: Comparing values:", aVal, "vs", bVal)

        // Handle different types
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortOrder === "desc" ? bVal - aVal : aVal - bVal
        }

        // Convert to string for comparison
        const aStr = String(aVal || "").toLowerCase()
        const bStr = String(bVal || "").toLowerCase()
        const comparison = aStr.localeCompare(bStr, "de-DE")

        return sortOrder === "desc" ? -comparison : comparison
      })
      console.log("[v0] API processOrderData: Sort complete")
    } else {
      console.log(
        "[v0] API processOrderData: Sort skipped - sortBy:",
        sortBy,
        "groupOrders.length:",
        groupOrders.length,
      )
    }

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
          const productSize = item.product_size || item.product?.unit || ""
          const productKey = productSize ? `${productName} (${productSize})` : productName
          const category = (item.product_category || "").toLowerCase()

          productTotals[productKey] = (productTotals[productKey] || 0) + (item.quantity || 0)
          globalProductTotals[productKey] = (globalProductTotals[productKey] || 0) + (item.quantity || 0)

          if (category.includes("südfr")) {
            globalProductTotalsSuedfruechte[productKey] =
              (globalProductTotalsSuedfruechte[productKey] || 0) + (item.quantity || 0)
          } else {
            globalProductTotalsOther[productKey] = (globalProductTotalsOther[productKey] || 0) + (item.quantity || 0)
          }
        })
      }
    })

    if (showGroupProductTotals && Object.keys(productTotals).length > 0) {
      const entries = Object.entries(productTotals).sort(([a], [b]) => a.localeCompare(b))
      const productsText = entries.map(([name, qty]) => `${qty}× ${name}`).join(", ")
      aggRow.product_summary = productsText
    }

    if ((showGroupProductTotals && Object.keys(productTotals).length > 0) || (showAggregations && hasAggregations)) {
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

  if (
    showSeparateProductTotals &&
    (Object.keys(globalProductTotalsSuedfruechte).length > 0 || Object.keys(globalProductTotalsOther).length > 0)
  ) {
    if (Object.keys(globalProductTotalsSuedfruechte).length > 0) {
      result.push({
        _isGroup: true,
        _isGlobalTotal: true,
        _groupLabel: "═══ GESAMTSUMME SÜDFRÜCHTE ═══",
        [groupBy[0]]: "═══ SÜDFRÜCHTE ═══",
      })

      if (showProductDetails) {
        Object.entries(globalProductTotalsSuedfruechte)
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
        const entries = Object.entries(globalProductTotalsSuedfruechte).sort(([a], [b]) => a.localeCompare(b))
        const productsText = entries.map(([name, qty]) => `${qty}× ${name}`).join(", ")
        result.push({
          _isAggregation: true,
          product_summary: productsText,
        })
      }
    }

    if (Object.keys(globalProductTotalsOther).length > 0) {
      result.push({
        _isGroup: true,
        _isGlobalTotal: true,
        _groupLabel: "═══ GESAMTSUMME RESTLICHE PRODUKTE ═══",
        [groupBy[0]]: "═══ RESTLICHE PRODUKTE ═══",
      })

      if (showProductDetails) {
        Object.entries(globalProductTotalsOther)
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
        const entries = Object.entries(globalProductTotalsOther).sort(([a], [b]) => a.localeCompare(b))
        const productsText = entries.map(([name, qty]) => `${qty}× ${name}`).join(", ")
        result.push({
          _isAggregation: true,
          product_summary: productsText,
        })
      }
    }
  } else if ((showProductSummary || showProductDetails) && Object.keys(globalProductTotals).length > 0) {
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
      return order.order_number || ""
    case "customer_name":
      return order.customer ? `${order.customer.first_name || ""} ${order.customer.last_name || ""}`.trim() : ""
    case "customer_email":
      return order.customer?.email || ""
    case "customer_phone":
      return order.customer?.phone || ""
    case "customer_postal_code":
      return order.customer?.postal_code || ""
    case "customer_street":
      return order.customer?.street || ""
    case "customer_city":
      return order.customer?.city || ""
    case "customer_address":
      const street = order.customer?.street || ""
      const houseNumber = order.customer?.house_number || ""
      const postalCode = order.customer?.postal_code || ""
      const city = order.customer?.city || ""
      return `${street} ${houseNumber}, ${postalCode} ${city}`.trim()
    case "customer_default_pickup_location":
      return order.customer?.default_pickup_location?.name || ""
    case "customer_default_distribution_person":
      return order.customer?.default_distribution_person?.name || ""
    case "pickup_location_normalized":
      return order.pickup_location_normalized || ""
    case "distribution_person":
      return order.distribution_person?.name || ""
    case "status":
      return order.status || ""
    case "internal_status":
      return order.internal_status || ""
    case "payment_method":
      return order.payment_method || ""
    case "total":
      return order.total || 0
    case "created_at":
      return order.created_at ? new Date(order.created_at).toLocaleDateString("de-DE") : ""
    case "notes":
      return order.notes || ""
    case "admin_notes":
      return order.admin_notes || ""
    case "special_requests":
      return order.customer?.special_requests || ""
    case "pickup_month":
      return order.pickup_date ? new Date(order.pickup_date).toLocaleDateString("de-DE", { month: "long" }) : ""
    case "order_month":
      return order.created_at ? new Date(order.created_at).toLocaleDateString("de-DE", { month: "long" }) : ""
    case "delivery_method":
      return order.delivery_method || ""
    case "products":
      if (order.order_items && order.order_items.length > 0) {
        console.log("[v0] DEBUG products - First item:", {
          product_name: order.order_items[0].product_name,
          product_category: order.order_items[0].product_category,
          product_size: order.order_items[0].product_size,
          product_unit: order.order_items[0].product?.unit,
        })
      }
      return (order.order_items || [])
        .map((item: any) => {
          const productName = item.product_name || "Unbekannt"
          const productSize = item.product_size || item.product?.unit || ""
          const displayName = productSize ? `${productName} (${productSize})` : productName
          return `${item.quantity}× ${displayName}`
        })
        .join(", ")
    case "products_südfrüchte":
      return (order.order_items || [])
        .filter((item: any) => {
          const category = item.product_category?.toLowerCase() || ""
          console.log(
            "[v0] DEBUG südfrüchte filter - category:",
            category,
            "includes südfr:",
            category.includes("südfr"),
          )
          return category.includes("südfr")
        })
        .map((item: any) => {
          const productName = item.product_name || "Unbekannt"
          const productSize = item.product_size || item.product?.unit || ""
          const displayName = productSize ? `${productName} (${productSize})` : productName
          return `${item.quantity}× ${displayName}`
        })
        .join(", ")
    case "products_other":
      return (order.order_items || [])
        .filter((item: any) => {
          const category = item.product_category?.toLowerCase() || ""
          return !category.includes("südfr")
        })
        .map((item: any) => {
          const productName = item.product_name || "Unbekannt"
          const productSize = item.product_size || item.product?.unit || ""
          const displayName = productSize ? `${productName} (${productSize})` : productName
          return `${item.quantity}× ${displayName}`
        })
        .join(", ")
    default:
      return ""
  }
}
