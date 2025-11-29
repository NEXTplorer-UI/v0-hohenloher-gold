import { getAdminClient } from "@/lib/supabase/admin"

export interface OrderItem {
  id?: string
  product_id: number
  product_name: string
  product_category: string
  quantity: number
  unit_price: number
  inventory_raw_id?: number | null
  weight_kg?: number | null // Changed from weight_grams to weight_kg to match database schema
}

export interface InventoryMovement {
  product_id: number | null
  order_id?: string | null
  order_item_id?: string | null
  qty: number | null
  qty_grams: number | null
  reason: string
  reference_id: string
  occurred_at?: string
  created_by?: string | null
  inventory_raw_id?: number | null
}

/**
 * Creates inventory movements from order items when order status changes
 */
export async function createMovementsFromOrder(
  orderId: string,
  orderNumber: string,
  orderItems: OrderItem[],
  reason = "Kundenbestellung",
  createdBy?: string | null, // Added createdBy parameter
) {
  console.log(`[v0] [MovementService] Creating inventory movements for order ${orderNumber}`)
  console.log(`[v0] [MovementService] Order ID: ${orderId}, Items count: ${orderItems.length}, Reason: ${reason}`)
  console.log(`[v0] [MovementService] Order items details: ${JSON.stringify(orderItems)}`)

  const productBasedItems = orderItems.filter((item) => !item.inventory_raw_id)
  const rawStockBasedItems = orderItems.filter((item) => item.inventory_raw_id)

  console.log(
    `[v0] [MovementService] Product-based items: ${productBasedItems.length}, Raw-stock-based items: ${rawStockBasedItems.length}`,
  )

  const productMovements: InventoryMovement[] = productBasedItems.map((item) => {
    const movement = {
      product_id: item.product_id,
      order_id: null, // NULL because order_item_id is set (constraint requirement)
      order_item_id: item.id || null,
      qty: -Math.abs(item.quantity),
      qty_grams: null, // Must be NULL for product-based movements
      reason,
      reference_id: orderNumber,
      created_by: createdBy || null,
    }
    console.log(`[v0] [MovementService] Product movement for ${item.product_name}: ${JSON.stringify(movement)}`)
    return movement
  })

  const rawStockMovements = rawStockBasedItems.map((item) => {
    const qtyGrams = item.weight_kg ? -Math.abs(item.quantity * item.weight_kg * 1000) : null
    console.log(
      `[v0] [MovementService] Raw stock item: ${item.product_name}, weight_kg: ${item.weight_kg}, quantity: ${item.quantity}, calculated qty_grams: ${qtyGrams}`,
    )

    const movement = {
      product_id: null, // Must be NULL for raw stock
      inventory_raw_id: item.inventory_raw_id,
      order_id: null, // NULL because order_item_id is set (constraint requirement)
      order_item_id: item.id || null,
      qty: null, // Must be NULL for raw stock movements
      qty_grams: qtyGrams, // Calculated from weight_kg
      reason,
      reference_id: orderNumber,
      created_by: createdBy || null,
    }
    console.log(`[v0] [MovementService] Raw stock movement for ${item.product_name}: ${JSON.stringify(movement)}`)
    return movement
  })

  const allMovements = [...productMovements, ...rawStockMovements]

  console.log(`[v0] [MovementService] Total movements to create: ${allMovements.length}`)
  console.log(`[v0] [MovementService] All movements: ${JSON.stringify(allMovements, null, 2)}`)

  if (allMovements.length === 0) {
    console.log(`[v0] [MovementService] No movements to create for order ${orderNumber}`)
    return []
  }

  try {
    console.log(`[v0] [MovementService] Inserting ${allMovements.length} movements into database...`)

    const { data, error } = await getAdminClient().from("inventory_movements").insert(allMovements).select()

    if (error) {
      console.error(`[v0] [MovementService] ERROR inserting inventory movements:`, error)
      console.error(`[v0] [MovementService] Error details:`, {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      throw error
    }

    console.log(
      `[v0] [MovementService] ✅ Successfully created ${data.length} inventory movements for order ${orderNumber}`,
    )
    console.log(`[v0] [MovementService] - ${productMovements.length} product-based movements`)
    console.log(`[v0] [MovementService] - ${rawStockMovements.length} raw-stock-based movements`)

    return data
  } catch (error) {
    console.error(`[v0] [MovementService] CRITICAL ERROR creating inventory movements:`, error)
    throw error
  }
}

/**
 * Creates manual inventory movement (by admin)
 */
export async function createManualMovement(
  productId: number | null,
  qty: number | null,
  reason: string,
  referenceId: string,
  createdBy: string,
  occurredAt?: string,
  inventoryRawId?: number | null,
  weightGrams?: number | null,
) {
  console.log(`[v0] Creating manual movement for product ${productId}: ${qty}`)

  const movement: InventoryMovement = {
    product_id: productId,
    qty,
    qty_grams: weightGrams ? qty * weightGrams : null,
    reason,
    reference_id: referenceId,
    occurred_at: occurredAt || new Date().toISOString(),
    created_by: createdBy,
    inventory_raw_id: inventoryRawId,
  }

  try {
    const { data, error } = await getAdminClient().from("inventory_movements").insert([movement]).select()

    if (error) {
      console.error(`[v0] Error creating manual movement:`, error)
      throw error
    }

    console.log(`[v0] Successfully created manual movement`)
    return data[0]
  } catch (error) {
    console.error(`[v0] Failed to create manual movement:`, error)
    throw error
  }
}

/**
 * Gets current stock level for a product
 */
export async function getCurrentStock(productId: number): Promise<number> {
  try {
    const { data, error } = await getAdminClient().rpc("get_current_stock", { p_product_id: productId })

    if (error) {
      console.error(`[v0] Error fetching stock for product ${productId}:`, error)
      return 0
    }

    return data || 0
  } catch (error) {
    console.error(`[v0] Error calculating current stock:`, error)
    return 0
  }
}

/**
 * Gets current stock for all products
 */
export async function getAllCurrentStock(): Promise<Map<number, number>> {
  try {
    const { data: movements, error } = await getAdminClient()
      .from("inventory_movements")
      .select("product_id, qty, qty_grams")
      .order("occurred_at", { ascending: true })

    if (error) {
      console.error(`[v0] Error fetching all movements:`, error)
      return new Map()
    }

    const stockMap = new Map<number, number>()

    movements?.forEach((movement) => {
      if (movement.product_id) {
        const currentStock = stockMap.get(movement.product_id) || 0
        stockMap.set(movement.product_id, currentStock + movement.qty)
      }
      // Handle raw stock logic if needed
    })

    return stockMap
  } catch (error) {
    console.error(`[v0] Error calculating all stock:`, error)
    return new Map()
  }
}
