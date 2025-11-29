"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Loader2, XCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { retryWithBackoff } from "@/lib/retry-utils"

type StepStatus = "pending" | "loading" | "success" | "error"

interface ProcessStep {
  id: string
  label: string
  status: StepStatus
  error?: string
}

function OrderProcessingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const checkoutId = searchParams.get("checkoutId")
  const source = searchParams.get("source")
  const isSumUpCheckout = source === "sumup" && checkoutId

  const [steps, setSteps] = useState<ProcessStep[]>(() => {
    if (isSumUpCheckout) {
      return [
        { id: "payment", label: "Zahlung bestätigen", status: "pending" as StepStatus },
        { id: "order", label: "Bestellung erstellen", status: "pending" as StepStatus },
        { id: "email", label: "Bestätigungs-E-Mail senden", status: "pending" as StepStatus },
      ]
    }

    const orderDataStr = typeof window !== "undefined" ? sessionStorage.getItem("pendingOrder") : null
    const shouldCreateAccount = orderDataStr ? JSON.parse(orderDataStr).createAccount : false

    const baseSteps = [
      { id: "customer", label: "Kundendaten speichern", status: "pending" as StepStatus },
      { id: "order", label: "Bestellung erstellen", status: "pending" as StepStatus },
      { id: "email", label: "Bestätigungs-E-Mail senden", status: "pending" as StepStatus },
    ]

    if (shouldCreateAccount) {
      baseSteps.push({ id: "account", label: "Benutzerkonto erstellen", status: "pending" as StepStatus })
    }

    return baseSteps
  })

  const [isComplete, setIsComplete] = useState(false)
  const [hasErrors, setHasErrors] = useState(false)
  const [orderNumber, setOrderNumber] = useState<string>("")

  useEffect(() => {
    if (isSumUpCheckout) {
      processSumUpOrder(checkoutId)
      return
    }

    processRegularOrder()
  }, [router, isSumUpCheckout, checkoutId])

  const processSumUpOrder = async (checkoutId: string) => {
    try {
      console.log("[v0] Processing SumUp order for checkout:", checkoutId)

      updateStep("payment", "loading")

      const isOptimistic = searchParams.get("optimistic") === "true"

      if (isOptimistic) {
        console.log("[v0] Optimistic loading - processing order in background")

        // Payment Step als Success markieren
        updateStep("payment", "success")

        // Order Step starten
        updateStep("order", "loading")

        // Hole Order-Daten aus sessionStorage
        const sumupOrderDataStr = typeof window !== "undefined" ? sessionStorage.getItem("sumupOrderData") : null

        if (!sumupOrderDataStr) {
          throw new Error("Bestelldaten nicht gefunden")
        }

        const orderDataWithCheckoutId = JSON.parse(sumupOrderDataStr)

        // Speichere Bestellung im Hintergrund
        const orderResponse = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(orderDataWithCheckoutId),
        })

        const rawText = await orderResponse.text()
        console.log("[checkout] raw response from /api/orders:", orderResponse.status, rawText)

        let orderParsed: any
        try {
          orderParsed = JSON.parse(rawText)
        } catch (e) {
          console.error("[checkout] Failed to parse JSON:", e)
          throw new Error(`Non-JSON response from /api/orders: ${rawText}`)
        }

        if (!orderResponse.ok) {
          console.error("[v0] Failed to save SumUp order:", orderParsed.error)
          updateStep("order", "error", "Bestellung konnte nicht gespeichert werden")
          updateStep("email", "pending")
          setHasErrors(true)

          // Cleanup
          sessionStorage.removeItem("sumupOrderData")
          return
        }

        console.log("[v0] SumUp order saved successfully:", orderParsed)
        setOrderNumber(orderParsed.data.order.order_number)
        updateStep("order", "success")

        // Email Step
        updateStep("email", "loading")
        await new Promise((resolve) => setTimeout(resolve, 1500))
        updateStep("email", "success")

        // Cleanup
        sessionStorage.removeItem("sumupOrderData")

        setIsComplete(true)

        setTimeout(() => {
          router.push(`/order-confirmation?orderNumber=${orderParsed.data.order.order_number}`)
        }, 2000)
        return
      }

      const orderNumber = searchParams.get("orderNumber")
      const hasError = searchParams.get("error")

      if (orderNumber) {
        console.log("[v0] Order already created:", orderNumber)
        updateStep("payment", "success")
        setOrderNumber(orderNumber)

        updateStep("order", "success")

        updateStep("email", "loading")
        await new Promise((resolve) => setTimeout(resolve, 2000))
        updateStep("email", "success")

        setIsComplete(true)

        setTimeout(() => {
          router.push(`/order-confirmation?orderNumber=${orderNumber}`)
        }, 2000)
        return
      }

      if (hasError) {
        updateStep("payment", "success")
        updateStep("order", "error", "Bestellung wurde gespeichert, aber einige Schritte sind fehlgeschlagen")
        updateStep("email", "pending")
        setHasErrors(true)
        return
      }

      let attempts = 0
      const maxAttempts = 10
      let order = null

      while (attempts < maxAttempts && !order) {
        const response = await fetch(`/api/checkout/status?checkoutId=${checkoutId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.order) {
            order = data.order
            break
          }
        }
        attempts++
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      if (!order) {
        throw new Error("Bestellung konnte nicht gefunden werden")
      }

      updateStep("payment", "success")
      setOrderNumber(order.order_number)

      updateStep("order", "success")

      updateStep("email", "loading")
      await new Promise((resolve) => setTimeout(resolve, 1000))
      updateStep("email", "success")

      setIsComplete(true)

      setTimeout(() => {
        router.push(`/order-confirmation?orderNumber=${order.order_number}`)
      }, 2000)
    } catch (error) {
      console.error("[v0] SumUp order processing error:", error)
      updateStep("payment", "error", error instanceof Error ? error.message : "Fehler bei der Verarbeitung")
      setHasErrors(true)
    }
  }

  const processRegularOrder = async () => {
    try {
      const orderDataStr = sessionStorage.getItem("pendingOrder")
      if (!orderDataStr) {
        console.error("[v0] No pending order found")
        router.push("/checkout")
        return
      }

      const orderData = JSON.parse(orderDataStr)
      console.log("[v0] Processing order:", orderData)

      updateStep("customer", "loading")
      try {
        await retryWithBackoff(
          async () => {
            const customerResponse = await fetch("/api/crm/customer", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(orderData.customerData),
            })

            if (!customerResponse.ok) {
              const errorData = await customerResponse.json()
              throw new Error(errorData.error || "Fehler beim Speichern der Kundendaten")
            }
          },
          {
            maxAttempts: 3,
            onRetry: (attempt, error) => {
              console.log(`[v0] Retrying customer creation (attempt ${attempt}):`, error.message)
            },
          },
        )

        updateStep("customer", "success")
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler"
        updateStep("customer", "error", errorMessage)
        setHasErrors(true)
        return
      }

      updateStep("order", "loading")
      let createdOrderNumber = ""
      let orderTime = ""
      let pickupToken = "" // Add pickupToken variable
      try {
        const orderResult = await retryWithBackoff(
          async () => {
            const orderResponse = await fetch("/api/orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(orderData.orderData),
            })

            const rawText = await orderResponse.text()
            console.log("[checkout] raw response from /api/orders:", orderResponse.status, rawText.substring(0, 200))

            let parsedResponse: any
            try {
              parsedResponse = JSON.parse(rawText)
            } catch (e) {
              console.error("[checkout] Failed to parse JSON:", e)
              throw new Error(
                `Non-JSON response from /api/orders (${orderResponse.status}): ${rawText.substring(0, 100)}`,
              )
            }

            if (!orderResponse.ok) {
              throw new Error(parsedResponse.error || "Fehler beim Erstellen der Bestellung")
            }

            return parsedResponse
          },
          {
            maxAttempts: 3,
            onRetry: (attempt, error) => {
              console.log(`[v0] Retrying order creation (attempt ${attempt}):`, error.message)
            },
          },
        )

        createdOrderNumber = orderResult.data.order.order_number
        orderTime = orderResult.data.order.order_time
        pickupToken = orderResult.data.pickupToken // Extract pickupToken from response
        setOrderNumber(createdOrderNumber)
        updateStep("order", "success")
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler"
        updateStep("order", "error", errorMessage)
        setHasErrors(true)
        return
      }

      updateStep("email", "loading")
      try {
        await retryWithBackoff(
          async () => {
            const emailResponse = await fetch("/api/send-order-confirmation", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                customerEmail: orderData.emailData.customerEmail,
                customerName: orderData.emailData.customerName,
                orderId: createdOrderNumber,
                orderTotal: orderData.emailData.orderTotal,
                paymentMethod: orderData.emailData.paymentMethod,
                deliveryMethod: orderData.emailData.deliveryMethod,
                orderItems: orderData.emailData.orderItems,
                order_time: orderTime,
                pickupToken: pickupToken, // Pass pickupToken to email
              }),
            })

            if (!emailResponse.ok) {
              const errorData = await emailResponse.json()
              throw new Error(errorData.error || "Fehler beim Senden der Bestätigungs-E-Mail")
            }
          },
          {
            maxAttempts: 2,
            onRetry: (attempt, error) => {
              console.log(`[v0] Retrying email send (attempt ${attempt}):`, error.message)
            },
          },
        )

        updateStep("email", "success")
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "E-Mail konnte nicht gesendet werden"
        console.error("[v0] Email sending failed:", error)
        updateStep("email", "error", errorMessage)
        // Don't return - email failure shouldn't fail the entire order
      }

      if (orderData.createAccount) {
        updateStep("account", "loading")
        try {
          const accountResponse = await fetch("/api/auth/create-account", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData.accountData),
          })

          if (!accountResponse.ok) {
            throw new Error("Fehler beim Erstellen des Benutzerkontos")
          }

          updateStep("account", "success")
        } catch (error) {
          updateStep("account", "error", error instanceof Error ? error.message : "Konto konnte nicht erstellt werden")
        }
      }

      sessionStorage.removeItem("pendingOrder")
      setIsComplete(true)

      setTimeout(() => {
        const params = new URLSearchParams({
          orderNumber: createdOrderNumber || "unknown",
          deliveryMethod: orderData.orderData.deliveryMethod,
          paymentMethod: orderData.orderData.paymentMethod,
          total: orderData.orderData.total.toString(),
          customerName: orderData.orderData.customerName,
        })
        router.push(`/order-confirmation?${params.toString()}`)
      }, 2000)
    } catch (error) {
      console.error("[v0] Order processing error:", error)
      setHasErrors(true)
    }
  }

  const updateStep = (stepId: string, status: StepStatus, error?: string) => {
    setSteps((prev) => prev.map((step) => (step.id === stepId ? { ...step, status, error } : step)))
  }

  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case "loading":
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
      case "error":
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {isComplete ? "Bestellung erfolgreich!" : "Ihre Bestellung wird verarbeitet..."}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {steps.map((step) => (
                <div key={step.id} className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">{getStepIcon(step.status)}</div>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        step.status === "success"
                          ? "text-green-600"
                          : step.status === "error"
                            ? "text-red-600"
                            : step.status === "loading"
                              ? "text-blue-600"
                              : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </p>
                    {step.error && (
                      <p className="text-sm text-red-600 mt-1">
                        <AlertCircle className="w-4 h-4 inline mr-1" />
                        {step.error}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {hasErrors && (
              <div className="border-t pt-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-900 mb-2">Teilweise erfolgreich</h3>
                  <p className="text-sm text-amber-800 mb-3">
                    Ihre Bestellung wurde möglicherweise gespeichert, aber einige Schritte sind fehlgeschlagen.
                  </p>
                  <div className="bg-white rounded p-3 mb-3">
                    <p className="text-sm font-medium text-amber-900 mb-2">Was können Sie tun?</p>
                    <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                      <li>Versuchen Sie es in einigen Minuten erneut</li>
                      <li>Prüfen Sie Ihre Internetverbindung</li>
                      <li>
                        Kontaktieren Sie uns unter <strong>0157 357 038 64</strong>
                      </li>
                      <li>
                        Oder per E-Mail: <strong>kontakt@suedfruechte-hohenlohe.de</strong>
                      </li>
                    </ul>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => (window.location.href = "/checkout")}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      Zurück zum Checkout
                    </Button>
                    <Button onClick={() => window.location.reload()} size="sm" className="flex-1">
                      Erneut versuchen
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {isComplete && !hasErrors && (
              <div className="border-t pt-6 text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <p className="text-lg font-semibold text-green-900 mb-2">Bestellung erfolgreich abgeschlossen!</p>
                <p className="text-sm text-muted-foreground">Sie werden in Kürze weitergeleitet...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function OrderProcessingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <OrderProcessingContent />
    </Suspense>
  )
}
