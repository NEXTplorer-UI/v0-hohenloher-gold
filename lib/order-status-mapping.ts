/**
 * Central Order Status Mapping
 * Maps UI status (picked_up) to DB status (completed) and vice versa
 */

export type UIOrderStatus = "pending" | "confirmed" | "ready" | "picked_up" | "cancelled"
export type DBOrderStatus = "pending" | "confirmed" | "ready" | "completed" | "cancelled"

export function mapUIToDBStatus(uiStatus: UIOrderStatus): DBOrderStatus {
  if (uiStatus === "picked_up") return "completed"
  return uiStatus as DBOrderStatus
}

export function mapDBToUIStatus(dbStatus: DBOrderStatus): UIOrderStatus {
  if (dbStatus === "completed") return "picked_up"
  return dbStatus as UIOrderStatus
}

export function getEmailTemplateForStatus(status: UIOrderStatus): string {
  switch (status) {
    case "confirmed":
      return "orderConfirmation"
    case "ready":
      return "readyForPickup"
    case "picked_up":
      return "orderPickedUp"
    case "cancelled":
      return "orderCancelled"
    default:
      return "orderConfirmation"
  }
}

export function getEmailTemplateForPaymentStatus(paymentStatus: string): string | null {
  switch (paymentStatus) {
    case "paid":
      return "paymentReceipt"
    default:
      return null
  }
}
