import { getAdminClient } from "@/lib/supabase/admin"

export interface OrderItem {
  id?: string
  product_id: number
  product_name: string
  product_category: string
  quantity: number
  unit_price: number
}

export interface InventoryMovement {
  product_id: number
  order_id?: string | null
  order_item_id?: string | null
  qty: number
  reason: string
  reference_id: string
  occurred_at?: string
  created_by?: string | null
}

/**
 * Creates inventory movements from order items when order status changes
 */
export async function createMovementsFromOrder(
  orderId: string,
  orderNumber: string,
  orderItems: OrderItem[],
  reason = "Kundenbestellung",
) {
  console.log(`[v0] Creating inventory movements for order ${orderNumber}`)
  console.log(`[v0] Order ID: ${orderId}, Items count: ${orderItems.length}, Reason: ${reason}`)

  const movements: InventoryMovement[] = orderItems.map((item) => ({
    product_id: item.product_id,
    order_id: null,
    order_item_id: item.id || null,
    qty: -Math.abs(item.quantity),
    reason,
    reference_id: orderNumber,
    created_by: null,
  }))

  try {
    const { data, error } = await getAdminClient().from("inventory_movements").insert(movements).select()

    if (error) {
      console.error(`[v0] Error creating inventory movements:`, error)
      throw error
    }

    console.log(`[v0] Successfully created ${data.length} inventory movements for order ${orderNumber}`)

    return data
  } catch (error) {
    console.error(`[v0] Failed to create inventory movements:`, error)
    throw error
  }
}

/**
 * Creates manual inventory movement (by admin)
 */
export async function createManualMovement(
  productId: number,
  qty: number,
  reason: string,
  referenceId: string,
  createdBy: string,
  occurredAt?: string,
) {
  console.log(`[v0] Creating manual movement for product ${productId}: ${qty}`)

  const movement: InventoryMovement = {
    product_id: productId,
    qty,
    reason,
    reference_id: referenceId,
    occurred_at: occurredAt || new Date().toISOString(),
    created_by: createdBy,
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
      .select("product_id, qty")
      .order("occurred_at", { ascending: true })

    if (error) {
      console.error(`[v0] Error fetching all movements:`, error)
      return new Map()
    }

    const stockMap = new Map<number, number>()

    movements?.forEach((movement) => {
      const currentStock = stockMap.get(movement.product_id) || 0
      stockMap.set(movement.product_id, currentStock + movement.qty)
    })

    return stockMap
  } catch (error) {
    console.error(`[v0] Error calculating all stock:`, error)
    return new Map()
  }
}
