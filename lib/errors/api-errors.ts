// Custom Error Classes for different error types
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode = 500,
    public code?: string,
    public details?: any,
  ) {
    super(message)
    this.name = "APIError"
  }
}

export class ValidationError extends APIError {
  constructor(message: string, details?: any) {
    super(message, 400, "VALIDATION_ERROR", details)
    this.name = "ValidationError"
  }
}

export class AuthenticationError extends APIError {
  constructor(message = "Nicht authentifiziert") {
    super(message, 401, "AUTHENTICATION_ERROR")
    this.name = "AuthenticationError"
  }
}

export class AuthorizationError extends APIError {
  constructor(message = "Keine Berechtigung") {
    super(message, 403, "AUTHORIZATION_ERROR")
    this.name = "AuthorizationError"
  }
}

export class NotFoundError extends APIError {
  constructor(resource = "Ressource") {
    super(`${resource} nicht gefunden`, 404, "NOT_FOUND")
    this.name = "NotFoundError"
  }
}

export class DatabaseError extends APIError {
  constructor(message = "Datenbankfehler", details?: any) {
    super(message, 500, "DATABASE_ERROR", details)
    this.name = "DatabaseError"
  }
}

export class ExternalServiceError extends APIError {
  constructor(service: string, message?: string) {
    super(message || `Fehler beim externen Service: ${service}`, 502, "EXTERNAL_SERVICE_ERROR")
    this.name = "ExternalServiceError"
  }
}
