/**
 * Safely parse JSON responses, handling cases where APIs return plain text
 * instead of JSON (e.g., "Internal server error")
 */
export async function safeJson(response: Response) {
  const ct = response.headers.get("content-type") || ""
  const raw = await response.text()

  if (ct.includes("application/json")) {
    try {
      return JSON.parse(raw)
    } catch {
      // JSON parsing failed even though content-type says it's JSON
      return { error: raw || `HTTP ${response.status}` }
    }
  }

  // Not JSON content-type, return raw text as error
  return { error: raw || `HTTP ${response.status}` }
}
