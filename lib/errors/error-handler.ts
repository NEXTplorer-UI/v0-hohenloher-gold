import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { APIError } from "./api-errors"

interface ErrorResponse {
  error: string
  code?: string
  details?: any
  timestamp: string
}

export function handleAPIError(error: unknown): NextResponse<ErrorResponse> {
  const timestamp = new Date().toISOString()

  // Log error for monitoring
  console.error("[API Error]", {
    timestamp,
    error: error instanceof Error ? error.message : "Unknown error",
    stack: error instanceof Error ? error.stack : undefined,
    type: error?.constructor?.name,
  })

  // Handle custom API errors
  if (error instanceof APIError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
        timestamp,
      },
      { status: error.statusCode },
    )
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validierungsfehler",
        code: "VALIDATION_ERROR",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
        timestamp,
      },
      { status: 400 },
    )
  }

  // Handle Supabase errors
  if (error && typeof error === "object" && "code" in error) {
    const supabaseError = error as any

    // Map common Supabase error codes
    if (supabaseError.code === "23505") {
      return NextResponse.json(
        {
          error: "Dieser Eintrag existiert bereits",
          code: "DUPLICATE_ENTRY",
          timestamp,
        },
        { status: 409 },
      )
    }

    if (supabaseError.code === "23503") {
      return NextResponse.json(
        {
          error: "Referenzierter Eintrag nicht gefunden",
          code: "FOREIGN_KEY_VIOLATION",
          timestamp,
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: "Datenbankfehler",
        code: "DATABASE_ERROR",
        details: supabaseError.message,
        timestamp,
      },
      { status: 500 },
    )
  }

  // Handle standard JavaScript errors
  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: error.message || "Interner Serverfehler",
        code: "INTERNAL_ERROR",
        timestamp,
      },
      { status: 500 },
    )
  }

  // Fallback for unknown errors
  return NextResponse.json(
    {
      error: "Ein unbekannter Fehler ist aufgetreten",
      code: "UNKNOWN_ERROR",
      timestamp,
    },
    { status: 500 },
  )
}

// Async wrapper for API routes
export function withErrorHandling<T>(handler: (request: Request, context?: any) => Promise<NextResponse<T>>) {
  return async (request: Request, context?: any): Promise<NextResponse<T | ErrorResponse>> => {
    try {
      return await handler(request, context)
    } catch (error) {
      return handleAPIError(error)
    }
  }
}
