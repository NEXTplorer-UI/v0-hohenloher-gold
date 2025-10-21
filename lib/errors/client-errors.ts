// Client-side error handling utilities

export interface FetchError {
  message: string
  code?: string
  details?: any
  status?: number
}

export class ClientError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any,
    public status?: number,
  ) {
    super(message)
    this.name = "ClientError"
  }
}

export async function fetchWithErrorHandling<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, options)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))

      throw new ClientError(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        errorData.code,
        errorData.details,
        response.status,
      )
    }

    return await response.json()
  } catch (error) {
    if (error instanceof ClientError) {
      throw error
    }

    // Network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new ClientError("Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.", "NETWORK_ERROR")
    }

    // Unknown errors
    throw new ClientError(
      error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten",
      "UNKNOWN_ERROR",
    )
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ClientError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === "string") {
    return error
  }

  return "Ein unbekannter Fehler ist aufgetreten"
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof ClientError && error.code === "NETWORK_ERROR"
}

export function isAuthError(error: unknown): boolean {
  return error instanceof ClientError && (error.code === "AUTHENTICATION_ERROR" || error.status === 401)
}

export function isValidationError(error: unknown): boolean {
  return error instanceof ClientError && (error.code === "VALIDATION_ERROR" || error.status === 400)
}
