"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"

interface PaymentSumUpProps {
  checkoutId: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

declare global {
  interface Window {
    SumUpCard?: any
  }
}

export function PaymentSumUp({ checkoutId, onSuccess, onError }: PaymentSumUpProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!checkoutId) {
      setError("Keine Checkout-ID vorhanden")
      setIsLoading(false)
      return
    }

    const script = document.createElement("script")
    script.src = "https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js"
    script.async = true

    script.onload = () => {
      if (window.SumUpCard && cardRef.current) {
        try {
          const card = window.SumUpCard.mount({
            checkoutId,
            onResponse: (type: string, body: any) => {
              console.log("[sumup-widget] Response:", type, body)

              if (type === "success") {
                onSuccess?.()
              } else if (type === "error") {
                const errorMsg = body?.message || "Zahlung fehlgeschlagen"
                setError(errorMsg)
                onError?.(errorMsg)
              }
            },
          })

          card.render(cardRef.current)
          setIsLoading(false)
        } catch (err: any) {
          console.error("[sumup-widget] Mount error:", err)
          setError(err.message || "Widget konnte nicht geladen werden")
          setIsLoading(false)
          onError?.(err.message)
        }
      }
    }

    script.onerror = () => {
      setError("SumUp SDK konnte nicht geladen werden")
      setIsLoading(false)
      onError?.("SumUp SDK konnte nicht geladen werden")
    }

    document.body.appendChild(script)

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [checkoutId, onSuccess, onError])

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
      <div ref={cardRef} className={isLoading ? "hidden" : ""} />
    </div>
  )
}
