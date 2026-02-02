"use client"

import { useEffect, useState, useRef } from "react"
import { Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PaymentSumUpProps {
  checkoutId: string
  onSuccess?: (transactionData: any) => void
  onError?: (error: string) => void
  onFailed?: (failureData: any) => void
}

declare global {
  interface Window {
    SumUpCard?: any
  }
}

export function PaymentSumUp({ checkoutId, onSuccess, onError, onFailed }: PaymentSumUpProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentFailed, setPaymentFailed] = useState(false)
  const [failureReason, setFailureReason] = useState<string | null>(null)
  const [adblockDetected, setAdblockDetected] = useState(false)
  const [loadTimeout, setLoadTimeout] = useState(false)

  const originalConsoleError = useRef<typeof console.error>()
  const originalConsoleWarn = useRef<typeof console.warn>()

  useEffect(() => {
    console.log("[v0] [SumUp Widget] Initializing with checkoutId:", checkoutId)

    if (!checkoutId) {
      console.error("[v0] [SumUp Widget] No checkout ID provided")
      setError("Keine Checkout-ID vorhanden")
      setIsLoading(false)
      return
    }

    originalConsoleError.current = console.error
    originalConsoleWarn.current = console.warn

    console.error = (...args: any[]) => {
      const message = args[0]?.toString() || ""

      // Suppress SumUp internal monitoring errors (CORS, pythia-json)
      if (
        message.includes("pythia-json") ||
        message.includes("sumup.com") ||
        message.includes("CORS policy") ||
        message.includes("Access to fetch")
      ) {
        return // Silently ignore these errors
      }

      originalConsoleError.current?.apply(console, args)
    }

    console.warn = (...args: any[]) => {
      const message = args[0]?.toString() || ""

      // Suppress Optimizely warnings from SumUp SDK
      if (
        message.includes("OPTIMIZELY") ||
        message.includes("eventBatchSize") ||
        message.includes("eventFlushInterval")
      ) {
        return // Silently ignore these warnings
      }

      originalConsoleWarn.current?.apply(console, args)
    }

    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        console.error("[v0] [SumUp Widget] SDK loading timeout")
        setLoadTimeout(true)
        setError(
          "Das Zahlungsformular konnte nicht geladen werden. Bitte überprüfen Sie Ihre Internetverbindung oder deaktivieren Sie Ihren Adblocker.",
        )
        setIsLoading(false)
      }
    }, 30000)

    const script = document.createElement("script")
    script.src = "https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js"
    script.async = true

    script.onload = () => {
      clearTimeout(loadingTimeout)
      console.log("[v0] [SumUp Widget] SDK loaded successfully")

      if (window.SumUpCard) {
        try {
          console.log("[v0] [SumUp Widget] Mounting card widget")

          window.SumUpCard.mount({
            id: "sumup-card",
            checkoutId,
            onResponse: (type: string, body: any) => {
              console.log("[v0] [SumUp Widget] Response received:", { type, body })

              if (type === "success") {
                if (body?.status === "PAID") {
                  console.log("[v0] [SumUp Widget] Payment successful - status: PAID")
                  setIsLoading(false)
                  onSuccess?.(body)
                } else if (body?.status === "FAILED") {
                  console.log("[v0] [SumUp Widget] Payment failed - status: FAILED", body)
                  
                  // Detaillierte Fehleranalyse basierend auf SumUp failure_reason
                  const failureCode = body?.failure_reason || body?.error_code || ""
                  const failureMessage = body?.message || ""
                  
                  let detailedReason = "Die Zahlung konnte nicht abgeschlossen werden."
                  
                  // 3D-Secure spezifische Fehler
                  if (failureCode.includes("3ds") || failureCode.includes("3DS") || 
                      failureMessage.toLowerCase().includes("3d secure") ||
                      failureMessage.toLowerCase().includes("authentication")) {
                    detailedReason = "Die 3D-Secure Authentifizierung ist fehlgeschlagen. Bitte stellen Sie sicher, dass Sie die Authentifizierung in Ihrer Banking-App oder per SMS-Code bestätigen."
                  } 
                  // Karte abgelehnt
                  else if (failureCode.includes("declined") || failureCode.includes("DECLINED") ||
                           failureMessage.toLowerCase().includes("declined") ||
                           failureMessage.toLowerCase().includes("abgelehnt")) {
                    detailedReason = "Ihre Karte wurde von Ihrer Bank abgelehnt. Bitte kontaktieren Sie Ihre Bank oder verwenden Sie eine andere Karte."
                  }
                  // Unzureichendes Guthaben
                  else if (failureCode.includes("insufficient") || failureCode.includes("INSUFFICIENT") ||
                           failureMessage.toLowerCase().includes("insufficient") ||
                           failureMessage.toLowerCase().includes("guthaben")) {
                    detailedReason = "Das Kartenguthaben reicht nicht aus. Bitte verwenden Sie eine andere Karte oder Zahlungsmethode."
                  }
                  // Karte abgelaufen
                  else if (failureCode.includes("expired") || failureCode.includes("EXPIRED") ||
                           failureMessage.toLowerCase().includes("expired") ||
                           failureMessage.toLowerCase().includes("abgelaufen")) {
                    detailedReason = "Ihre Karte ist abgelaufen. Bitte verwenden Sie eine gültige Karte."
                  }
                  // Ungültige Kartendaten
                  else if (failureCode.includes("invalid") || failureCode.includes("INVALID") ||
                           failureMessage.toLowerCase().includes("invalid") ||
                           failureMessage.toLowerCase().includes("ungültig")) {
                    detailedReason = "Die Kartendaten sind ungültig. Bitte überprüfen Sie Kartennummer, Ablaufdatum und CVV."
                  }
                  // Abgebrochen vom Benutzer
                  else if (failureCode.includes("cancelled") || failureCode.includes("CANCELLED") ||
                           failureCode.includes("aborted") || failureCode.includes("ABORTED") ||
                           failureMessage.toLowerCase().includes("cancelled") ||
                           failureMessage.toLowerCase().includes("abgebrochen")) {
                    detailedReason = "Die Zahlung wurde abgebrochen. Bitte versuchen Sie es erneut, wenn Sie fortfahren möchten."
                  }
                  // Netzwerkfehler
                  else if (failureCode.includes("network") || failureCode.includes("timeout") ||
                           failureMessage.toLowerCase().includes("network") ||
                           failureMessage.toLowerCase().includes("timeout")) {
                    detailedReason = "Es gab ein Netzwerkproblem. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut."
                  }
                  // Fallback mit Original-Nachricht wenn vorhanden
                  else if (failureMessage) {
                    detailedReason = failureMessage
                  }
                  
                  setFailureReason(detailedReason)
                  setPaymentFailed(true)
                  setIsLoading(false)
                  onFailed?.(body)
                } else if (body?.status === "PENDING") {
                  console.log("[v0] [SumUp Widget] Payment pending - status: PENDING")
                  setFailureReason("Die Zahlung wird noch verarbeitet. Bitte schließen Sie diese Seite nicht. Falls die Verarbeitung länger als 2 Minuten dauert, kontaktieren Sie uns bitte.")
                  setPaymentFailed(true)
                  setIsLoading(false)
                  onFailed?.(body)
                } else {
                  console.warn("[v0] [SumUp Widget] Unknown payment status:", body?.status)
                  setFailureReason(
                    `Die Zahlung hat einen unerwarteten Status (${body?.status}). Bitte kontaktieren Sie uns unter kontakt@suedfruechte-hohenlohe.de falls Sie Fragen haben.`,
                  )
                  setPaymentFailed(true)
                  setIsLoading(false)
                  onFailed?.(body)
                }
              } else if (type === "error") {
                const errorMsg = body?.message || "Zahlung fehlgeschlagen"
                console.error("[v0] [SumUp Widget] Payment error:", errorMsg, body)
                setError(errorMsg)
                setIsLoading(false)
                onError?.(errorMsg)
              }
            },
          })

          setIsLoading(false)
          console.log("[v0] [SumUp Widget] Widget mounted successfully")
        } catch (err: any) {
          clearTimeout(loadingTimeout)
          console.error("[v0] [SumUp Widget] Mount error:", err)
          console.error("[v0] [SumUp Widget] Error stack:", err.stack)
          setError(err.message || "Widget konnte nicht geladen werden")
          setIsLoading(false)
          onError?.(err.message)
        }
      } else {
        clearTimeout(loadingTimeout)
        console.error("[v0] [SumUp Widget] SumUpCard not available")
        setError("SumUp Widget konnte nicht initialisiert werden")
        setIsLoading(false)
      }
    }

    script.onerror = (err) => {
      clearTimeout(loadingTimeout)
      console.error("[v0] [SumUp Widget] SDK loading error:", err)
      setAdblockDetected(true)
      setError(
        "Das Zahlungsformular konnte nicht geladen werden. Möglicherweise blockiert ein Adblocker oder eine Firewall die Verbindung.",
      )
      setIsLoading(false)
      onError?.("SumUp SDK konnte nicht geladen werden")
    }

    console.log("[v0] [SumUp Widget] Adding SDK script to document")
    document.body.appendChild(script)

    return () => {
      clearTimeout(loadingTimeout)
      console.log("[v0] [SumUp Widget] Cleaning up")

      if (originalConsoleError.current) {
        console.error = originalConsoleError.current
      }
      if (originalConsoleWarn.current) {
        console.warn = originalConsoleWarn.current
      }

      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [checkoutId, onSuccess, onError, onFailed])

  if (paymentFailed) {
    return (
      <div className="space-y-4">
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-2">Zahlung nicht abgeschlossen</h3>
              <p className="text-sm text-red-700 mb-3">{failureReason}</p>
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                <p className="font-semibold mb-1">Was Sie tun können:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Versuchen Sie es erneut mit derselben oder einer anderen Karte</li>
                  <li>Stellen Sie sicher, dass 3D-Secure / Verified by Visa aktiviert ist</li>
                  <li>Wählen Sie alternativ "Überweisung" als Zahlungsmethode</li>
                  <li>Bei weiteren Problemen: kontakt@suedfruechte-hohenlohe.de</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => {
              setPaymentFailed(false)
              setFailureReason(null)
              window.location.reload()
            }}
            className="flex-1"
          >
            Erneut versuchen
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = "/checkout"
            }}
            className="flex-1 bg-transparent"
          >
            Zahlungsweise ändern
          </Button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-1">Zahlungsformular konnte nicht geladen werden</h3>
              <p className="text-sm text-red-700 mb-3">{error}</p>
              {(adblockDetected || loadTimeout) && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm font-semibold text-yellow-900 mb-2">Lösungsvorschläge:</p>
                  <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
                    <li>Deaktivieren Sie Ihren Adblocker für diese Seite</li>
                    <li>Überprüfen Sie Ihre Firewall-Einstellungen</li>
                    <li>Versuchen Sie es mit einem anderen Browser</li>
                    <li>Stellen Sie sicher, dass Sie eine stabile Internetverbindung haben</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => {
              window.location.reload()
            }}
            className="flex-1"
          >
            Seite neu laden
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = "/checkout"
            }}
            className="flex-1"
          >
            Andere Zahlungsweise wählen
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Zahlungsformular wird geladen...</span>
        </div>
      )}
      <div id="sumup-card" className={isLoading ? "hidden" : ""} />
      {isLoading && (
        <div className="text-center text-xs text-muted-foreground">
          <p>Falls das Formular nicht lädt, überprüfen Sie bitte Ihren Adblocker.</p>
        </div>
      )}
    </div>
  )
}
