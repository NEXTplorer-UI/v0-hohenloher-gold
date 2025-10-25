"use client"

import { useEffect, useState } from "react"
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

  useEffect(() => {
    console.log("[v0] [SumUp Widget] Initializing with checkoutId:", checkoutId)

    if (!checkoutId) {
      console.error("[v0] [SumUp Widget] No checkout ID provided")
      setError("Keine Checkout-ID vorhanden")
      setIsLoading(false)
      return
    }

    const script = document.createElement("script")
    script.src = "https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js"
    script.async = true

    script.onload = () => {
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
                // Widget operation completed successfully, but check actual payment status
                if (body?.status === "PAID") {
                  console.log("[v0] [SumUp Widget] Payment successful - status: PAID")
                  setIsLoading(false)
                  onSuccess?.(body)
                } else if (body?.status === "FAILED") {
                  console.log("[v0] [SumUp Widget] Payment failed - status: FAILED")
                  const reason = body?.message || body?.failure_reason || "Zahlung fehlgeschlagen"
                  setFailureReason(reason)
                  setPaymentFailed(true)
                  setIsLoading(false)
                  onFailed?.(body)
                } else if (body?.status === "PENDING") {
                  console.log("[v0] [SumUp Widget] Payment pending - status: PENDING")
                  setFailureReason("Zahlung wird noch verarbeitet")
                  setPaymentFailed(true)
                  setIsLoading(false)
                  onFailed?.(body)
                } else {
                  console.warn("[v0] [SumUp Widget] Unknown payment status:", body?.status)
                  setFailureReason(`Unbekannter Status: ${body?.status}`)
                  setPaymentFailed(true)
                  setIsLoading(false)
                  onFailed?.(body)
                }
              } else if (type === "error") {
                const errorMsg = body?.message || "Zahlung fehlgeschlagen"
                console.error("[v0] [SumUp Widget] Payment error:", errorMsg)
                setError(errorMsg)
                setIsLoading(false)
                onError?.(errorMsg)
              }
            },
          })

          setIsLoading(false)
          console.log("[v0] [SumUp Widget] Widget mounted successfully")
        } catch (err: any) {
          console.error("[v0] [SumUp Widget] Mount error:", err)
          console.error("[v0] [SumUp Widget] Error stack:", err.stack)
          setError(err.message || "Widget konnte nicht geladen werden")
          setIsLoading(false)
          onError?.(err.message)
        }
      } else {
        console.error("[v0] [SumUp Widget] SumUpCard not available")
        setError("SumUp Widget konnte nicht initialisiert werden")
        setIsLoading(false)
      }
    }

    script.onerror = (err) => {
      console.error("[v0] [SumUp Widget] SDK loading error:", err)
      setError("SumUp SDK konnte nicht geladen werden")
      setIsLoading(false)
      onError?.("SumUp SDK konnte nicht geladen werden")
    }

    console.log("[v0] [SumUp Widget] Adding SDK script to document")
    document.body.appendChild(script)

    return () => {
      console.log("[v0] [SumUp Widget] Cleaning up")
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
              <h3 className="font-semibold text-red-900 mb-1">Zahlung fehlgeschlagen</h3>
              <p className="text-sm text-red-700">{failureReason}</p>
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
            className="flex-1"
          >
            Zahlungsweise ändern
          </Button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">{error}</p>
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
    </div>
  )
}
