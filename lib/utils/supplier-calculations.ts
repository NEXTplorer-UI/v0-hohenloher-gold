export interface ProductDemand {
  productId: string
  productName: string
  category: string
  orderedQuantity: number
  currentStock: number
  minimumStock: number
  leadTimeDays: number
  supplier: string
  unitCost: number
  minimumOrderQuantity: number
}

export interface SupplierRecommendation {
  productId: string
  productName: string
  category: string
  currentStock: number
  orderedQuantity: number
  neededQuantity: number
  recommendedOrder: number
  priority: "high" | "medium" | "low"
  supplier: string
  unitCost: number
  totalCost: number
  reason: string
}

export class SupplierCalculations {
  /**
   * Calculate supplier order recommendations based on current demand and stock levels
   */
  static calculateOrderRecommendations(demands: ProductDemand[]): SupplierRecommendation[] {
    return demands.map((demand) => {
      const stockAfterOrders = demand.currentStock - demand.orderedQuantity
      const safetyStock = Math.ceil(demand.minimumStock * 1.2) // 20% safety buffer
      const neededQuantity = Math.max(0, safetyStock - stockAfterOrders)

      // Round up to minimum order quantity
      const recommendedOrder =
        neededQuantity > 0 ? Math.ceil(neededQuantity / demand.minimumOrderQuantity) * demand.minimumOrderQuantity : 0

      const priority = this.calculatePriority(stockAfterOrders, demand.minimumStock, demand.leadTimeDays)
      const reason = this.generateReason(stockAfterOrders, demand.minimumStock, neededQuantity)

      return {
        productId: demand.productId,
        productName: demand.productName,
        category: demand.category,
        currentStock: demand.currentStock,
        orderedQuantity: demand.orderedQuantity,
        neededQuantity,
        recommendedOrder,
        priority,
        supplier: demand.supplier,
        unitCost: demand.unitCost,
        totalCost: recommendedOrder * demand.unitCost,
        reason,
      }
    })
  }

  /**
   * Calculate priority based on stock levels and lead time
   */
  private static calculatePriority(
    stockAfterOrders: number,
    minimumStock: number,
    leadTimeDays: number,
  ): "high" | "medium" | "low" {
    const stockRatio = stockAfterOrders / minimumStock

    // High priority: stock will be below minimum or very close
    if (stockRatio <= 0.5 || (stockRatio <= 1 && leadTimeDays > 7)) {
      return "high"
    }

    // Medium priority: stock is low but manageable
    if (stockRatio <= 1.5) {
      return "medium"
    }

    // Low priority: sufficient stock
    return "low"
  }

  /**
   * Generate human-readable reason for the recommendation
   */
  private static generateReason(stockAfterOrders: number, minimumStock: number, neededQuantity: number): string {
    if (neededQuantity === 0) {
      return "Ausreichend Lagerbestand vorhanden"
    }

    if (stockAfterOrders <= 0) {
      return "Lager wird komplett aufgebraucht - dringend bestellen"
    }

    if (stockAfterOrders < minimumStock) {
      return "Unterschreitet Mindestbestand - baldige Bestellung empfohlen"
    }

    return "Sicherheitsbestand auffüllen"
  }

  /**
   * Group recommendations by supplier for easier ordering
   */
  static groupBySupplier(recommendations: SupplierRecommendation[]): Record<string, SupplierRecommendation[]> {
    return recommendations
      .filter((rec) => rec.recommendedOrder > 0)
      .reduce(
        (groups, rec) => {
          if (!groups[rec.supplier]) {
            groups[rec.supplier] = []
          }
          groups[rec.supplier].push(rec)
          return groups
        },
        {} as Record<string, SupplierRecommendation[]>,
      )
  }

  /**
   * Calculate total order value by supplier
   */
  static calculateSupplierTotals(recommendations: SupplierRecommendation[]): Record<string, number> {
    const grouped = this.groupBySupplier(recommendations)
    const totals: Record<string, number> = {}

    for (const [supplier, items] of Object.entries(grouped)) {
      totals[supplier] = items.reduce((sum, item) => sum + item.totalCost, 0)
    }

    return totals
  }

  /**
   * Generate order summary for export
   */
  static generateOrderSummary(recommendations: SupplierRecommendation[]): {
    totalItems: number
    totalValue: number
    highPriorityItems: number
    supplierCount: number
    ordersBySupplier: Record<string, SupplierRecommendation[]>
  } {
    const ordersToPlace = recommendations.filter((rec) => rec.recommendedOrder > 0)
    const ordersBySupplier = this.groupBySupplier(recommendations)

    return {
      totalItems: ordersToPlace.length,
      totalValue: ordersToPlace.reduce((sum, rec) => sum + rec.totalCost, 0),
      highPriorityItems: ordersToPlace.filter((rec) => rec.priority === "high").length,
      supplierCount: Object.keys(ordersBySupplier).length,
      ordersBySupplier,
    }
  }
}
