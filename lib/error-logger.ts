/**
 * Automatic error logging system
 * Tracks errors across the application and logs them to admin_notifications
 */

import { sendAdminNotification, type NotificationType, type NotificationSeverity } from "./admin-notifications"

export interface ErrorLogOptions {
  type?: NotificationType
  severity?: NotificationSeverity
  metadata?: Record<string, any>
  silent?: boolean // Don't log to console if true
}

/**
 * Log an error to the admin notification system
 */
export async function logError(error: Error | string, options: ErrorLogOptions = {}): Promise<void> {
  const { type = "system_error", severity = "error", metadata = {}, silent = false } = options

  const errorMessage = error instanceof Error ? error.message : error
  const errorStack = error instanceof Error ? error.stack : undefined

  if (!silent) {
    console.error(`[Error Logger] ${errorMessage}`, errorStack)
  }

  await sendAdminNotification({
    type,
    severity,
    title: getErrorTitle(type),
    message: errorMessage,
    metadata: {
      ...metadata,
      stack: errorStack,
      timestamp: new Date().toISOString(),
    },
  })
}

/**
 * Log an API error
 */
export async function logAPIError(
  endpoint: string,
  error: Error | string,
  statusCode?: number,
  metadata?: Record<string, any>,
): Promise<void> {
  await logError(error, {
    type: "system_error",
    severity: statusCode && statusCode >= 500 ? "critical" : "error",
    metadata: {
      endpoint,
      statusCode,
      ...metadata,
    },
  })
}

/**
 * Log a database error
 */
export async function logDatabaseError(
  operation: string,
  error: Error | string,
  metadata?: Record<string, any>,
): Promise<void> {
  await logError(error, {
    type: "system_error",
    severity: "critical",
    metadata: {
      operation,
      category: "database",
      ...metadata,
    },
  })
}

/**
 * Log an email error
 */
export async function logEmailError(
  emailType: string,
  recipient: string,
  error: Error | string,
  metadata?: Record<string, any>,
): Promise<void> {
  await logError(error, {
    type: "email_failed",
    severity: "warning",
    metadata: {
      emailType,
      recipient,
      category: "email",
      ...metadata,
    },
  })
}

/**
 * Log a payment error
 */
export async function logPaymentError(
  orderId: string,
  error: Error | string,
  metadata?: Record<string, any>,
): Promise<void> {
  await logError(error, {
    type: "payment_error",
    severity: "critical",
    metadata: {
      orderId,
      category: "payment",
      ...metadata,
    },
  })
}

function getErrorTitle(type: NotificationType): string {
  switch (type) {
    case "order_creation_failed":
      return "Bestellung konnte nicht erstellt werden"
    case "email_failed":
      return "E-Mail-Versand fehlgeschlagen"
    case "payment_error":
      return "Zahlungsfehler"
    case "customer_creation_failed":
      return "Kunde konnte nicht erstellt werden"
    case "system_error":
      return "Systemfehler"
    default:
      return "Fehler"
  }
}
