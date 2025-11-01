/**
 * Admin notification system
 * Sends alerts to admins when critical errors occur
 */

import { createClient } from "@/lib/supabase/server"

export type NotificationType =
  | "order_creation_failed"
  | "email_failed"
  | "payment_error"
  | "customer_creation_failed"
  | "system_error"

export type NotificationSeverity = "info" | "warning" | "error" | "critical"

export interface AdminNotification {
  type: NotificationType
  severity: NotificationSeverity
  title: string
  message: string
  metadata?: Record<string, any>
}

/**
 * Send an admin notification
 * Stores notification in database and optionally sends email
 */
export async function sendAdminNotification(notification: AdminNotification): Promise<void> {
  try {
    const supabase = await createClient()

    // Store notification in database
    const { error } = await supabase.from("admin_notifications").insert({
      type: notification.type,
      severity: notification.severity,
      title: notification.title,
      message: notification.message,
      metadata: notification.metadata || {},
    })

    if (error) {
      console.error("[Admin Notification] Failed to store notification:", error)
    }

    // For critical errors, also log to console
    if (notification.severity === "critical") {
      console.error("[CRITICAL ERROR]", notification.title, notification.message)
    }

    // TODO: Send email to admin for critical errors
    // This would require an admin email configuration
  } catch (error) {
    console.error("[Admin Notification] System error:", error)
  }
}

/**
 * Queue a failed email for retry
 */
export async function queueFailedEmail(params: {
  orderId: string
  emailTo: string
  emailType: string
  emailData: Record<string, any>
  error: string
}): Promise<void> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from("pending_emails").insert({
      order_id: params.orderId,
      email_to: params.emailTo,
      email_type: params.emailType,
      email_data: params.emailData,
      retry_count: 0,
      last_error: params.error,
      scheduled_for: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // Retry in 5 minutes
    })

    if (error) {
      console.error("[Email Queue] Failed to queue email:", error)
    }
  } catch (error) {
    console.error("[Email Queue] System error:", error)
  }
}

/**
 * Get unread admin notifications count
 */
export async function getUnreadNotificationsCount(): Promise<number> {
  try {
    const supabase = await createClient()

    const { count, error } = await supabase
      .from("admin_notifications")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false)

    if (error) {
      console.error("[Admin Notification] Failed to get count:", error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error("[Admin Notification] System error:", error)
    return 0
  }
}
