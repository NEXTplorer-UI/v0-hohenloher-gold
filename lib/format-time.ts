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
