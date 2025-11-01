/**
 * Formats a time string from HH:MM:SS to HH:MM
 * @param time - Time string in format HH:MM:SS or HH:MM
 * @returns Formatted time string HH:MM
 */
export function formatTime(time: string | null | undefined): string {
  if (!time) return ""

  // If already in HH:MM format, return as is
  if (time.length === 5 && time.includes(":")) {
    return time
  }

  // If in HH:MM:SS format, remove seconds
  const parts = time.split(":")
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`
  }

  return time
}

/**
 * Formats a date string to German locale format
 * @param dateString - ISO date string (e.g., "2024-11-22")
 * @returns Formatted date string in German format (e.g., "22. November 2024")
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

/**
 * Calculates payment deadline (order date + 14 days) and formats it in German
 * @param orderDate - ISO date string or Date object
 * @returns Formatted payment deadline string (e.g., "15.12.2024")
 */
export function calculatePaymentDeadline(orderDate: string | Date): string {
  const date = typeof orderDate === "string" ? new Date(orderDate) : orderDate

  // Add 14 days
  const deadline = new Date(date)
  deadline.setDate(deadline.getDate() + 14)

  // Format as DD.MM.YYYY
  return deadline.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}
