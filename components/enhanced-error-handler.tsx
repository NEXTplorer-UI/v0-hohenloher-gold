"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, RefreshCw, Mail, Phone } from "lucide-react"

export interface ErrorInfo {
  type: "network" | "payment" | "validation" | "server" | "unknown"
  message: string
  code?: string
  retryable?: boolean
  contactSupport?: boolean
}

interface EnhancedErrorHandlerProps {
  error: ErrorInfo | null
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

export function EnhancedErrorHandler({ error, onRetry, onDismiss, className = "" }: EnhancedErrorHandlerProps) {
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = useCallback(async () => {
    if (!onRetry) return

    setIsRetrying(true)
    try {
      await onRetry()
    } finally {
      setIsRetrying(false)
    }
  }, [onRetry])

  if (!error) return null

  const getErrorIcon = () => {
    switch (error.type) {
      case "payment":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "network":
        return <RefreshCw className="h-4 w-4 text-orange-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-red-500" />
    }
  }

  const getErrorTitle = () => {
    switch (error.type) {
      case "payment":
        return "Zahlungsfehler"
      case "network":
        return "Verbindungsfehler"
      case "validation":
        return "Eingabefehler"
      case "server":
        return "Serverfehler"
      default:
        return "Fehler"
    }
  }

  const getSupportMessage = () => {
    if (error.contactSupport) {
      return (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Benötigen Sie Hilfe? Kontaktieren Sie uns:</p>
          <div className="flex gap-4 text-sm">
            <a
              href="mailto:info@hohenloher-gold.de"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
            >
              <Mail className="h-3 w-3" />
              E-Mail
            </a>
            <a href="tel:+4979429479990" className="flex items-center gap-1 text-blue-600 hover:text-blue-800">
              <Phone className="h-3 w-3" />
              Telefon
            </a>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Alert className={`border-red-200 bg-red-50 ${className}`}>
      <div className="flex items-start gap-3">
        {getErrorIcon()}
        <div className="flex-1">
          <h4 className="font-medium text-red-800 mb-1">{getErrorTitle()}</h4>
          <AlertDescription className="text-red-700">
            {error.message}
            {error.code && <span className="block text-xs text-red-600 mt-1">Fehlercode: {error.code}</span>}
          </AlertDescription>

          <div className="flex gap-2 mt-3">
            {error.retryable && onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={isRetrying}
                className="border-red-300 text-red-700 hover:bg-red-100 bg-transparent"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Wird wiederholt...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Erneut versuchen
                  </>
                )}
              </Button>
            )}

            {onDismiss && (
              <Button variant="ghost" size="sm" onClick={onDismiss} className="text-red-700 hover:bg-red-100">
                Schließen
              </Button>
            )}
          </div>

          {getSupportMessage()}
        </div>
      </div>
    </Alert>
  )
}

// Utility function to classify errors
export function classifyError(error: any): ErrorInfo {
  // Network errors
  if (error.name === "NetworkError" || error.message?.includes("fetch")) {
    return {
      type: "network",
      message: "Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung.",
      retryable: true,
      contactSupport: false,
    }
  }

  // Stripe payment errors
  if (error.type === "card_error") {
    return {
      type: "payment",
      message: error.message || "Ihre Karte wurde abgelehnt. Bitte versuchen Sie eine andere Zahlungsmethode.",
      code: error.code,
      retryable: true,
      contactSupport: true,
    }
  }

  if (error.type === "validation_error") {
    return {
      type: "validation",
      message: error.message || "Bitte überprüfen Sie Ihre Eingaben.",
      retryable: false,
      contactSupport: false,
    }
  }

  // Server errors
  if (error.status >= 500) {
    return {
      type: "server",
      message: "Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.",
      code: error.status?.toString(),
      retryable: true,
      contactSupport: true,
    }
  }

  // Default unknown error
  return {
    type: "unknown",
    message: error.message || "Ein unbekannter Fehler ist aufgetreten.",
    retryable: true,
    contactSupport: true,
  }
}
