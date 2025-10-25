"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

function ReturnContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "failed" | "pending">("loading")
  const [orderNumber, setOrderNumber] = useState<string | null>(null)

  useEffect(() => {
    const checkoutId = searchParams.get("checkoutId")

    console.log("[v0] [SumUp Return] Checkout ID:", checkoutId)

    if (!checkoutId) {
      console.error("[v0] [SumUp Return] No checkout ID provided")
      setStatus("failed")
      return
    }

    const verifyPayment = async () => {
      try {
        console.log("[v0] [SumUp Return] Verifying payment...")

        const response = await fetch(`/api/payments/sumup/verify?checkoutId=${checkoutId}`)
        const data = await response.json()

        console.log("[v0] [SumUp Return] Verification response:", data)

        if (!response.ok) {
          console.error("[v0] [SumUp Return] Verification failed:", data)
          setStatus("failed")
          return
        }

        setOrderNumber(data.orderNumber)

        if (data.status === "PAID") {
          console.log("[v0] [SumUp Return] Payment successful, order:", data.orderNumber)
          setStatus("success")
          setTimeout(() => {
            router.push(`/order-confirmation?orderNumber=${data.orderNumber}&paymentMethod=sumup`)
          }, 2000)
        } else if (data.status === "PENDING") {
          console.log("[v0] [SumUp Return] Payment pending")
          setStatus("pending")
        } else {
          console.log("[v0] [SumUp Return] Payment failed, status:", data.status)
          setStatus("failed")
        }
      } catch (error) {
        console.error("[v0] [SumUp Return] Verification error:", error)
        setStatus("failed")
      }
    }

    verifyPayment()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Zahlungsstatus</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              {status === "loading" && (
                <>
                  <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin" />
                  <p className="text-muted-foreground">Zahlung wird überprüft...</p>
                </>
              )}

              {status === "success" && (
                <>
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
                  <div>
                    <h2 className="text-2xl font-bold text-green-600 mb-2">Zahlung erfolgreich!</h2>
                    <p className="text-muted-foreground">Ihre Bestellung {orderNumber} wurde bezahlt.</p>
                    <p className="text-sm text-muted-foreground mt-2">Sie werden automatisch weitergeleitet...</p>
                  </div>
                </>
              )}

              {status === "pending" && (
                <>
                  <Loader2 className="w-16 h-16 text-yellow-600 mx-auto animate-spin" />
                  <div>
                    <h2 className="text-2xl font-bold text-yellow-600 mb-2">Zahlung ausstehend</h2>
                    <p className="text-muted-foreground">
                      Ihre Zahlung wird noch verarbeitet. Bitte warten Sie einen Moment.
                    </p>
                  </div>
                  <Button onClick={() => window.location.reload()}>Status aktualisieren</Button>
                </>
              )}

              {status === "failed" && (
                <>
                  <XCircle className="w-16 h-16 text-red-600 mx-auto" />
                  <div>
                    <h2 className="text-2xl font-bold text-red-600 mb-2">Zahlung fehlgeschlagen</h2>
                    <p className="text-muted-foreground">Ihre Zahlung konnte nicht verarbeitet werden.</p>
                  </div>
                  <Button onClick={() => router.push("/checkout")}>Zurück zur Kasse</Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function SumUpReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background py-16 flex items-center justify-center">
          <Loader2 className="w-16 h-16 text-primary animate-spin" />
        </div>
      }
    >
      <ReturnContent />
    </Suspense>
  )
}
