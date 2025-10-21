"use client"

import type React from "react"

import { useState, useCallback, useEffect } from "react"
import { useCart } from "@/contexts/cart-context"
import { usePricing } from "@/components/pricing-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import {
  MapPin,
  Truck,
  CreditCard,
  Plus,
  Minus,
  Trash2,
  Eye,
  EyeOff,
  ShoppingCart,
  Mail,
  Warehouse,
  Edit3,
  Package,
  Calendar,
  AlertCircle,
} from "lucide-react"
import { saveCustomerToCRM, createUserAccount, sendOrderConfirmationEmail } from "@/lib/crm-utils"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { createBrowserClient } from "@supabase/ssr"
import Link from "next/link"
import { EnhancedErrorHandler, classifyError, type ErrorInfo } from "@/components/enhanced-error-handler"
import { useRetryLogic } from "@/hooks/use-retry-logic"
import { determineOrderDeliveryDate } from "@/lib/delivery-schedule-utils"

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null

function StripePaymentForm({
  orderData,
  onSuccess,
  onError,
}: {
  orderData: any
  onSuccess: () => void
  onError: (error: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState<ErrorInfo | null>(null)
  const { executeWithRetry, isRetrying } = useRetryLogic({
    maxAttempts: 3,
    baseDelay: 2000,
  })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setPaymentError(null)

    try {
      await executeWithRetry(async () => {
        const { error } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/order-confirmation?orderNumber=${orderData.orderNumber}&paymentMethod=stripe`,
          },
        })

        if (error) {
          const classifiedError = classifyError(error)
          setPaymentError(classifiedError)
          throw error
        } else {
          onSuccess()
        }
      })
    } catch (error) {
      console.error("Payment error:", error)
      if (!paymentError) {
        const classifiedError = classifyError(error)
        setPaymentError(classifiedError)
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const retryPayment = async () => {
    setPaymentError(null)
    await handleSubmit(new Event("submit") as any)
  }

  return (
    <div className="space-y-6">
      <EnhancedErrorHandler
        error={paymentError}
        onRetry={paymentError?.retryable ? retryPayment : undefined}
        onDismiss={() => setPaymentError(null)}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <PaymentElement />
        <Button type="submit" disabled={!stripe || isProcessing || isRetrying} className="w-full" size="lg">
          {isProcessing || isRetrying ? "Zahlung wird verarbeitet..." : `€${orderData.total} bezahlen`}
        </Button>
      </form>
    </div>
  )
}

const NEXT_PICKUP_DATE = "15. Dezember 2024"

export default function CheckoutPage() {
  const { state, dispatch } = useCart()
  const { pricingMode, calculatePrice, setPricingMode } = usePricing()

  const [deliveryMethod, setDeliveryMethod] = useState("pickup")
  const [pickupLocation, setPickupLocation] = useState("station")
  const [paymentMethod, setPaymentMethod] = useState("transfer")
  const [emailReminder, setEmailReminder] = useState(false)
  const [emailUpdates, setEmailUpdates] = useState(false)
  const [createAccount, setCreateAccount] = useState(false)
  const [isEditingCart, setIsEditingCart] = useState(false)

  const [deliveryDateInfo, setDeliveryDateInfo] = useState<{
    deliveryDate: string | null
    scheduleId: string | null
    message: string
  } | null>(null)
  const [isLoadingDeliveryDate, setIsLoadingDeliveryDate] = useState(false)

  const [isLoginMode, setIsLoginMode] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [street, setStreet] = useState("")
  const [houseNumber, setHouseNumber] = useState("")
  const [zip, setZip] = useState("")
  const [city, setCity] = useState("")

  const [searchPlz, setSearchPlz] = useState("")
  const [nearestLocations, setNearestLocations] = useState<any[]>([])
  const [selectedLocation, setSelectedLocation] = useState<any>(null)
  const [pickupLocations, setPickupLocations] = useState<any[]>([])
  const [isLoadingLocations, setIsLoadingLocations] = useState(false)
  const [orderMessage, setOrderMessage] = useState("")

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const hasFreshFruits = state.items.some(
    (item) => item.category === "Frische Südfrüchte" || item.category === "Südfrüchte",
  )
  const hasOliveOil = state.items.some((item) => item.category === "Olivenöl")

  const hasOnlyDeliverableItems = true // All products can be shipped if under weight limit

  const [showStripePayment, setShowStripePayment] = useState(false)
  const [clientSecret, setClientSecret] = useState("")
  const [stripeOrderData, setStripeOrderData] = useState<any>(null)

  const [orderError, setOrderError] = useState<ErrorInfo | null>(null)
  const { executeWithRetry } = useRetryLogic({
    maxAttempts: 2,
    baseDelay: 1000,
  })

  const safeCalculatePrice = useCallback(
    (price: string | number): number => {
      return calculatePrice(price)
    },
    [calculatePrice],
  )

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) {
      return "Das Passwort muss mindestens 8 Zeichen haben"
    }
    return ""
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    setPasswordError(validatePassword(value))
  }

  const handleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      })

      if (error) {
        console.error("Login error:", error)
        alert("Anmeldung fehlgeschlagen: " + error.message)
        return
      }

      if (data.user?.user_metadata) {
        const metadata = data.user.user_metadata
        setFirstName(metadata.firstName || "")
        setLastName(metadata.lastName || "")
        setEmail(data.user.email || "")
        setPhone(metadata.phone || "")
        setStreet(metadata.street || "")
        setHouseNumber(metadata.houseNumber || "")
        setZip(metadata.zip || "")
        setCity(metadata.city || "")
      }

      setIsLoginMode(false)
      setCreateAccount(false)
    } catch (error) {
      console.error("Login error:", error)
      alert("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.")
    }
  }

  useEffect(() => {
    const fetchPickupLocations = async () => {
      setIsLoadingLocations(true)
      try {
        const response = await fetch("/api/pickup-locations")
        if (response.ok) {
          const data = await response.json()
          setPickupLocations(data)
          console.log("[v0] Loaded pickup locations from database:", data)
        } else {
          console.error("[v0] Failed to load pickup locations")
        }
      } catch (error) {
        console.error("[v0] Error loading pickup locations:", error)
      } finally {
        setIsLoadingLocations(false)
      }
    }

    fetchPickupLocations()
  }, [])

  const findNearestPickupLocations = (plz: string) => {
    if (pickupLocations.length === 0) {
      console.log("[v0] No pickup locations available yet")
      return []
    }

    if (!plz || typeof plz !== "string" || plz.trim() === "") {
      return pickupLocations.slice(0, 1) // Return first location as default
    }

    const cleanPlz = plz.trim()
    const userPlz = Number.parseInt(cleanPlz)

    if (isNaN(userPlz)) {
      return pickupLocations.slice(0, 1)
    }

    // Calculate PLZ-based distances for all stations
    const stationsWithDistance = pickupLocations.map((station) => ({
      ...station,
      plzDistance: Math.abs(userPlz - Number.parseInt(station.postal_code)),
    }))

    // Sort by PLZ distance
    const sorted = stationsWithDistance.sort((a, b) => a.plzDistance - b.plzDistance)
    const nearest = sorted[0]

    // Show multiple stations if they're within similar PLZ range (threshold: 200)
    const threshold = 200
    const similarStations = sorted.filter((station) => station.plzDistance <= nearest.plzDistance + threshold)

    console.log("[v0] PLZ search for", cleanPlz, "found", similarStations.length, "similar stations")

    return similarStations.length > 1 ? similarStations : [nearest]
  }

  const handlePickupLocationSearch = () => {
    if (!searchPlz || searchPlz.trim().length < 5) {
      return
    }

    const locations = findNearestPickupLocations(searchPlz)
    setNearestLocations(locations)

    // Auto-select first location if only one, otherwise let user choose
    if (locations.length === 1) {
      setSelectedLocation(locations[0])
    } else {
      setSelectedLocation(null) // Reset selection for multiple options
    }
  }

  const handleOrderSubmission = useCallback(async () => {
    if (!firstName || !lastName || !email) {
      alert("Bitte füllen Sie alle Pflichtfelder aus.")
      return
    }

    if (!street || !houseNumber || !zip || !city) {
      alert("Bitte geben Sie eine vollständige Rechnungsadresse an.")
      return
    }

    if (email && email.includes("@")) {
      console.log("[v0] Checking email before order submission:", email)
      const emailCheck = await checkEmailExists(email)

      if (emailCheck.existsInAuth && createAccount) {
        alert(
          "Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an oder verwenden Sie eine andere E-Mail-Adresse.",
        )
        setIsLoginMode(true)
        setLoginEmail(email)
        return
      }

      if (emailCheck.existsInAuth && !createAccount) {
        const shouldLogin = confirm("Ein Konto mit dieser E-Mail existiert bereits. Möchten Sie sich anmelden?")
        if (shouldLogin) {
          setIsLoginMode(true)
          setLoginEmail(email)
          return
        }
      }
    }

    if (createAccount && !isLoginMode) {
      if (!password || password !== confirmPassword || passwordError) {
        alert("Bitte überprüfen Sie Ihre Passwort-Eingaben.")
        return
      }
    }

    const customerData = {
      firstName,
      lastName,
      email,
      phone,
      street,
      houseNumber,
      zip,
      city,
      category: "Gemischt",
      notes: orderMessage || `Bestellung vom ${new Date().toLocaleDateString("de-DE")}`,
      deliveryMethod,
      paymentMethod,
      emailReminder,
      emailUpdates,
      createAccount,
    }

    try {
      setOrderError(null)

      await executeWithRetry(async () => {
        await saveCustomerToCRM(customerData)

        if (createAccount && !isLoginMode) {
          const accountResult = await createUserAccount({
            ...customerData,
            password,
          })

          if (accountResult.success) {
            console.log("User account created, confirmation email sent")
          }
        }

        const totalAmount =
          state.items.reduce((sum, item) => sum + safeCalculatePrice(item.price) * item.quantity, 0) +
          (deliveryMethod === "delivery" ? 4.9 : 0)
        const totalAmountCents = Math.round(
          (state.items.reduce((sum, item) => sum + safeCalculatePrice(item.price) * item.quantity, 0) +
            (deliveryMethod === "delivery" ? 4.9 : 0)) *
            100,
        )

        let finalPickupLocation = "Zentrallager Pfedelbach"
        let finalPickupLocationId = null

        if (deliveryMethod === "delivery") {
          finalPickupLocation = null
          finalPickupLocationId = null
        } else if (deliveryMethod === "pickup") {
          if (pickupLocation === "warehouse") {
            // User selected warehouse - use first location (should be warehouse)
            const warehouseLocation = pickupLocations.find(
              (loc) => loc.name.includes("Zentrallager") || loc.name.includes("Pfedelbach"),
            )
            if (warehouseLocation) {
              finalPickupLocation = warehouseLocation.name
              finalPickupLocationId = warehouseLocation.id
            } else if (pickupLocations[0]) {
              finalPickupLocation = pickupLocations[0].name
              finalPickupLocationId = pickupLocations[0].id
            }
          } else if (pickupLocation === "station") {
            // User selected a station via PLZ search
            if (selectedLocation) {
              finalPickupLocation = selectedLocation.name
              finalPickupLocationId = selectedLocation.id
            } else if (nearestLocations[0]) {
              finalPickupLocation = nearestLocations[0].name
              finalPickupLocationId = nearestLocations[0].id
            }
          }
        }

        console.log("[v0] Final pickup location:", finalPickupLocation, "ID:", finalPickupLocationId)

        const orderData = {
          customerName: `${firstName} ${lastName}`,
          email,
          phone,
          items: state.items.map((item) => ({
            ...item,
            price: safeCalculatePrice(item.price),
          })),
          total: totalAmount,
          deliveryMethod,
          paymentMethod,
          pickupLocation: finalPickupLocation,
          pickupLocationId: finalPickupLocationId,
          notes: orderMessage,
          emailReminder,
          emailUpdates,
          orderTime: new Date().toISOString(), // Add order time
          deliveryDate: deliveryDateInfo?.deliveryDate || null, // Include delivery date
          deliveryScheduleId: deliveryDateInfo?.scheduleId || null, // Include schedule ID
        }

        if (paymentMethod === "stripe") {
          if (!stripePublishableKey) {
            throw new Error("Stripe ist nicht konfiguriert. Bitte wählen Sie eine andere Zahlungsmethode.")
          }

          const tempOrderNumber = `HG-TEMP-${Date.now()}`

          const response = await fetch("/api/create-payment-intent", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              amount: totalAmountCents,
              currency: "eur",
              orderNumber: tempOrderNumber,
              customerEmail: email,
              customerName: `${firstName} ${lastName}`,
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || "Payment intent creation failed")
          }

          const { clientSecret } = await response.json()
          setClientSecret(clientSecret)
          setStripeOrderData({ ...orderData, orderNumber: tempOrderNumber })
          setShowStripePayment(true)
          return
        }

        console.log("[v0] Saving order to database:", orderData)
        const orderResponse = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(orderData),
        })

        if (!orderResponse.ok) {
          const errorData = await orderResponse.json()
          throw new Error(errorData.error || "Failed to save order")
        }

        const orderResult = await orderResponse.json()
        console.log("[v0] Order saved successfully:", orderResult)

        const finalOrderData = {
          ...orderData,
          orderNumber: orderResult.data.order.order_number,
          orderTime: orderResult.data.order.order_time,
        }

        const emailResult = await sendOrderConfirmationEmail(finalOrderData)
        if (emailResult.success) {
          console.log("Order confirmation email sent successfully")
        }

        dispatch({ type: "CLEAR_CART" })
        const params = new URLSearchParams({
          orderNumber: orderResult.data.order.order_number, // Use backend-generated number
          deliveryMethod,
          paymentMethod,
          total: totalAmount.toString(),
          customerName: `${firstName} ${lastName}`,
        })

        window.location.href = `/order-confirmation?${params.toString()}`
      })
    } catch (error) {
      console.error("Order submission error:", error)
      const classifiedError = classifyError(error)
      setOrderError(classifiedError)
    }
  }, [
    state.items,
    deliveryMethod,
    paymentMethod,
    emailReminder,
    emailUpdates,
    createAccount,
    firstName,
    lastName,
    email,
    phone,
    street,
    houseNumber,
    zip,
    city,
    orderMessage,
    dispatch,
    executeWithRetry,
    stripePublishableKey,
    nearestLocations,
    selectedLocation,
    pickupLocations,
    pickupLocation, // Added pickupLocation to dependencies
    safeCalculatePrice,
    deliveryDateInfo, // Include deliveryDateInfo in dependencies
  ])

  const handleStripeSuccess = async () => {
    if (stripeOrderData) {
      console.log("[v0] Saving Stripe order to database:", stripeOrderData)
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stripeOrderData),
      })

      if (orderResponse.ok) {
        const orderResult = await orderResponse.json()
        console.log("[v0] Stripe order saved successfully:", orderResult)

        const updatedStripeOrderData = {
          ...stripeOrderData,
          orderNumber: orderResult.data.order.order_number,
          orderTime: orderResult.data.order.order_time,
        }

        const emailResult = await sendOrderConfirmationEmail(updatedStripeOrderData)
        if (emailResult.success) {
          console.log("Order confirmation email sent successfully")
        }

        dispatch({ type: "CLEAR_CART" })
        const params = new URLSearchParams({
          orderNumber: orderResult.data.order.order_number,
          deliveryMethod: updatedStripeOrderData.deliveryMethod,
          paymentMethod: "stripe",
          total: updatedStripeOrderData.total,
          customerName: updatedStripeOrderData.customerName,
        })

        window.location.href = `/order-confirmation?${params.toString()}`
      } else {
        console.error("[v0] Failed to save Stripe order to database")
        // Fallback to original order number if database save fails
        const emailResult = await sendOrderConfirmationEmail(stripeOrderData)
        if (emailResult.success) {
          console.log("Order confirmation email sent successfully")
        }

        dispatch({ type: "CLEAR_CART" })
        const params = new URLSearchParams({
          orderNumber: stripeOrderData.orderNumber,
          deliveryMethod: stripeOrderData.deliveryMethod,
          paymentMethod: "stripe",
          total: stripeOrderData.total,
          customerName: stripeOrderData.customerName,
        })

        window.location.href = `/order-confirmation?${params.toString()}`
      }
    }
  }

  const handleStripeError = (errorMessage: string) => {
    console.error("Stripe payment error:", errorMessage)
    const classifiedError = classifyError(new Error(errorMessage))
    setOrderError(classifiedError)
  }

  const updateQuantity = (itemId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      dispatch({ type: "REMOVE_ITEM", payload: itemId })
    } else {
      dispatch({ type: "UPDATE_QUANTITY", payload: { id: itemId, quantity: newQuantity } })
    }
  }

  const removeItem = (itemId: number) => {
    dispatch({ type: "REMOVE_ITEM", payload: itemId })
  }

  const formatPrice = useCallback((amount: number): string => {
    if (typeof amount !== "number" || isNaN(amount)) {
      return "0,00"
    }

    try {
      const formattedAmount = amount.toFixed(2)
      const finalFormatted = formattedAmount.replace(".", ",")
      return finalFormatted
    } catch (error) {
      return "0,00"
    }
  }, [])

  const calculateTotalWeight = () => {
    return state.items.reduce((total, item) => {
      let itemWeight = 1 // Default weight for most items

      if (item.category === "Frische Südfrüchte" || item.category === "Südfrüchte") {
        itemWeight = 7.5
      }

      return total + itemWeight * item.quantity
    }, 0)
  }

  const totalWeight = calculateTotalWeight()
  const isOverWeightLimit = totalWeight > 10

  useEffect(() => {
    if (isOverWeightLimit && deliveryMethod === "delivery") {
      setDeliveryMethod("pickup")
    }
  }, [isOverWeightLimit, deliveryMethod])

  useEffect(() => {
    setPricingMode(deliveryMethod === "pickup" ? "pickup" : "shipping")
  }, [deliveryMethod, setPricingMode])

  useEffect(() => {
    const loadDeliveryDate = async () => {
      if (state.items.length === 0) return

      setIsLoadingDeliveryDate(true)
      try {
        const deliveryInfo = await determineOrderDeliveryDate(state.items)
        setDeliveryDateInfo(deliveryInfo)
        console.log("[v0] Delivery date info:", deliveryInfo)
      } catch (error) {
        console.error("[v0] Error loading delivery date:", error)
      } finally {
        setIsLoadingDeliveryDate(false)
      }
    }

    loadDeliveryDate()
  }, [state.items])

  const checkEmailExists = async (email: string) => {
    try {
      const response = await fetch("/api/crm/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        throw new Error("Fehler bei der E-Mail-Überprüfung")
      }

      const result = await response.json()
      return {
        existsInAuth: result.existsInAuth,
        existsInCRM: result.existsInCRM,
        error: null,
      }
    } catch (error) {
      console.error("[v0] Error checking email:", error)
      return { existsInAuth: false, existsInCRM: false, error: "Fehler bei der E-Mail-Überprüfung" }
    }
  }

  const [emailError, setEmailError] = useState("")
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)

  const handleEmailBlur = async () => {
    if (!email || !email.includes("@")) return

    setIsCheckingEmail(true)
    setEmailError("")

    const result = await checkEmailExists(email)

    if (result.error) {
      setEmailError(result.error)
    } else if (result.existsInAuth && createAccount) {
      setEmailError(
        "Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an oder verwenden Sie eine andere E-Mail-Adresse.",
      )
      setIsLoginMode(true)
      setLoginEmail(email)
    } else if (result.existsInAuth && !createAccount) {
      // User exists but doesn't want to create account - suggest login
      setEmailError("Ein Konto mit dieser E-Mail existiert bereits. Möchten Sie sich anmelden?")
    }

    setIsCheckingEmail(false)
  }

  if (showStripePayment && clientSecret && stripePromise) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Zahlung abschließen</CardTitle>
                <p className="text-center text-muted-foreground">
                  Bestellung {stripeOrderData.orderNumber} - €{stripeOrderData.total}
                </p>
              </CardHeader>
              <CardContent>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <StripePaymentForm
                    orderData={stripeOrderData}
                    onSuccess={handleStripeSuccess}
                    onError={handleStripeError}
                  />
                </Elements>
                <div className="mt-4 text-center">
                  <Button variant="outline" onClick={() => setShowStripePayment(false)}>
                    Zurück zur Bestellung
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (showStripePayment) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Stripe-Zahlung ist derzeit nicht verfügbar.</p>
            <p>Bitte wählen Sie eine andere Zahlungsmethode.</p>
            <Button onClick={() => setShowStripePayment(false)} className="mt-4">
              Zurück zur Zahlungsauswahl
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (state.items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-md mx-auto text-center">
            <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
            <h1 className="font-serif font-bold text-2xl text-foreground mb-4">Ihr Warenkorb ist leer</h1>
            <p className="text-muted-foreground mb-8">
              Fügen Sie Produkte zu Ihrem Warenkorb hinzu, um mit der Bestellung fortzufahren.
            </p>
            <Link href="/shop">
              <Button size="lg">Jetzt einkaufen</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <EnhancedErrorHandler
          error={orderError}
          onRetry={orderError?.retryable ? handleOrderSubmission : undefined}
          onDismiss={() => setOrderError(null)}
          className="mb-6"
        />

        {hasFreshFruits && deliveryDateInfo && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-yellow-700 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900 mb-1">Liefertermin für Südfrüchte</h3>
                  <p className="text-sm text-yellow-800">{deliveryDateInfo.message}</p>
                  {deliveryDateInfo.deliveryDate && (
                    <p className="text-xs text-yellow-700 mt-1">
                      Ihre Bestellung enthält frische Südfrüchte und wird zum nächsten verfügbaren Termin geliefert.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Ihre Daten</CardTitle>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setIsLoginMode(!isLoginMode)}
                    className="text-primary p-0 h-auto"
                  >
                    {isLoginMode ? "Neues Konto erstellen" : "Bereits ein Konto? Anmelden"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoginMode && (
                  <div className="space-y-4 p-4 bg-card border rounded-lg mb-4">
                    <h4 className="font-medium">Anmelden</h4>
                    <div>
                      <Label htmlFor="loginEmail">E-Mail</Label>
                      <Input
                        id="loginEmail"
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="loginPassword">Passwort</Label>
                      <Input
                        id="loginPassword"
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleLogin} className="w-full">
                      Anmelden
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Vorname</Label>
                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Nachname</Label>
                    <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">E-Mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setEmailError("") // Clear error when typing
                    }}
                    onBlur={handleEmailBlur}
                    className={emailError ? "border-red-500" : ""}
                  />
                  {isCheckingEmail && <p className="text-sm text-muted-foreground mt-1">E-Mail wird überprüft...</p>}
                  {emailError && <p className="text-sm text-red-500 mt-1">{emailError}</p>}
                </div>
                <div>
                  <Label htmlFor="phone">Telefon</Label>
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>

                <div className="space-y-4 p-4 bg-card border rounded-lg">
                  <h4 className="font-medium">Rechnungsadresse</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="street">Straße *</Label>
                      <Input id="street" value={street} onChange={(e) => setStreet(e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor="houseNumber">Hausnummer *</Label>
                      <Input
                        id="houseNumber"
                        value={houseNumber}
                        onChange={(e) => setHouseNumber(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="zip">PLZ *</Label>
                      <Input id="zip" value={zip} onChange={(e) => setZip(e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor="city">Ort *</Label>
                      <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-card border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="createAccount"
                      checked={createAccount}
                      onCheckedChange={(checked) => {
                        setCreateAccount(checked as boolean)
                        if (!checked) {
                          setPassword("")
                          setConfirmPassword("")
                          setPasswordError("")
                        }
                      }}
                      className="w-4 h-4 rounded-full border-2 border-primary bg-transparent data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                    />
                    <Label htmlFor="createAccount" className="font-medium">
                      Nutzerkonto erstellen
                    </Label>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Profitieren Sie von unseren Aktionen und bekommen Sie regelmäßig Updates zu Ihren Bestellungen.
                  </p>

                  {createAccount && !isLoginMode && (
                    <div className="space-y-4 border-t pt-4">
                      <div>
                        <Label htmlFor="password">Passwort</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => handlePasswordChange(e.target.value)}
                            className={passwordError ? "border-red-500" : ""}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-gold-hover hover:text-gold-foreground"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        {passwordError && <p className="text-sm text-red-500 mt-1">{passwordError}</p>}
                      </div>
                      <div>
                        <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={confirmPassword && password !== confirmPassword ? "border-red-500" : ""}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-gold-hover hover:text-gold-foreground"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        {confirmPassword && password !== confirmPassword && (
                          <p className="text-sm text-red-500 mt-1">Die Passwörter stimmen nicht überein</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4 p-4 bg-card border rounded-lg">
                  <h4 className="font-medium flex items-center space-x-2">
                    <Mail className="w-4 h-4" />
                    <span>E-Mail Benachrichtigungen</span>
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="emailReminder"
                        checked={emailReminder}
                        onCheckedChange={setEmailReminder}
                        className="w-4 h-4 rounded-full border-2 border-primary bg-transparent data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                      <Label htmlFor="emailReminder" className="text-sm">
                        Erinnerung für Abholtermin per E-Mail erhalten
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="emailUpdates"
                        checked={emailUpdates}
                        onCheckedChange={setEmailUpdates}
                        className="w-4 h-4 rounded-full border-2 border-primary bg-transparent data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                      <Label htmlFor="emailUpdates" className="text-sm">
                        Updates zu neuen Produkten und Terminen erhalten
                      </Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lieferung</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Added AlertCircle icon and updated message for Olive Oil */}
                {hasOliveOil && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2 text-blue-700" />
                      <span className="text-sm text-blue-700">Olivenöl kann nur an Abholorte abgeholt werden.</span>
                    </div>
                  </div>
                )}

                {hasFreshFruits && deliveryDateInfo?.deliveryDate && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-green-700" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-900">
                          Liefertermin:{" "}
                          {new Date(deliveryDateInfo.deliveryDate).toLocaleDateString("de-DE", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-xs text-green-700 mt-0.5">
                          Ihre Südfrüchte werden frisch zu diesem Termin geliefert
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <RadioGroup value={deliveryMethod} onValueChange={setDeliveryMethod}>
                  <div className="flex items-center space-x-2 p-4 border rounded-lg">
                    <RadioGroupItem
                      value="pickup"
                      id="pickup"
                      className="w-4 h-4 rounded-full border-2 border-primary bg-transparent data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                    />
                    <Label htmlFor="pickup" className="flex-1 cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <MapPin className="w-5 h-5 text-primary" />
                        <div>
                          <div className="font-medium">Abholung</div>
                          <div className="text-sm text-muted-foreground">Kostenlos</div>
                        </div>
                      </div>
                    </Label>
                  </div>
                  {hasOnlyDeliverableItems && (
                    <div
                      className={`flex items-center space-x-2 p-4 border rounded-lg ${isOverWeightLimit ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <RadioGroupItem
                        value="delivery"
                        id="delivery"
                        disabled={isOverWeightLimit}
                        className="w-4 h-4 rounded-full border-2 border-primary bg-transparent data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                      <Label
                        htmlFor="delivery"
                        className={`flex-1 ${isOverWeightLimit ? "cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        <div className="flex items-center space-x-3">
                          <Truck className="w-5 h-5 text-primary" />
                          <div>
                            <div className="font-medium">Lieferung nach Hause</div>
                            <div className="text-sm text-muted-foreground">
                              €4,90 (bis 10kg Gesamtgewicht)
                              {isOverWeightLimit && " - Nicht verfügbar"}
                            </div>
                          </div>
                        </div>
                      </Label>
                    </div>
                  )}
                </RadioGroup>

                {isOverWeightLimit && (
                  <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-center">
                      <Package className="h-4 w-4 mr-2 text-amber-700" />
                      <span className="text-amber-700">
                        Gesamtgewicht: {totalWeight.toFixed(1)} kg - Überschreitet Versandlimit von 10 kg
                      </span>
                    </div>
                    <p className="text-sm text-amber-600 mt-1">
                      Für Bestellungen über 10kg ist nur Abholung möglich. Die Preise wurden automatisch auf Abholpreise
                      angepasst.
                    </p>
                  </div>
                )}

                {deliveryMethod === "pickup" && (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-3">
                      <Label>Abholort wählen</Label>
                      <RadioGroup value={pickupLocation} onValueChange={setPickupLocation}>
                        <div className="flex items-center space-x-2 p-3 border rounded-lg">
                          <RadioGroupItem
                            value="station"
                            id="station"
                            className="w-4 h-4 rounded-full border-2 border-primary bg-transparent data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                          />
                          <Label htmlFor="station" className="flex-1 cursor-pointer">
                            <div className="flex items-center space-x-3">
                              <MapPin className="w-4 h-4 text-primary" />
                              <div>
                                <div className="font-medium text-sm">Abholort</div>
                                <div className="text-xs text-muted-foreground">An einem regionalen Abholort</div>
                              </div>
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 p-3 border rounded-lg">
                          <RadioGroupItem
                            value="warehouse"
                            id="warehouse"
                            className="w-4 h-4 rounded-full border-2 border-primary bg-transparent data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                          />
                          <Label htmlFor="warehouse" className="flex-1 cursor-pointer">
                            <div className="flex items-center space-x-3">
                              <Warehouse className="w-4 h-4 text-primary" />
                              <div>
                                <div className="font-medium text-sm">Zentrallager</div>
                                <div className="text-xs text-muted-foreground">Direkt bei uns in Pfedelbach</div>
                              </div>
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {pickupLocation === "station" && (
                      <div className="space-y-2">
                        <Label htmlFor="plz">PLZ für Abholort</Label>
                        {isLoadingLocations && (
                          <p className="text-sm text-muted-foreground">Abholorte werden geladen...</p>
                        )}
                        <div className="flex space-x-2">
                          <Input
                            id="plz"
                            placeholder="74653"
                            value={searchPlz}
                            onChange={(e) => setSearchPlz(e.target.value)}
                            disabled={isLoadingLocations}
                          />
                          <Button
                            variant="outline"
                            onClick={handlePickupLocationSearch}
                            disabled={searchPlz.length < 5 || isLoadingLocations}
                          >
                            Suchen
                          </Button>
                        </div>

                        {nearestLocations.length > 0 && (
                          <div className="space-y-3 mt-3">
                            <p className="text-sm font-medium">
                              {nearestLocations.length === 1
                                ? "Nächstgelegener Abholort:"
                                : `${nearestLocations.length} Abholorte in Ihrer Nähe:`}
                            </p>

                            {nearestLocations.length === 1 ? (
                              <div className="p-3 bg-card border rounded-lg">
                                <p className="text-sm">
                                  <strong>{nearestLocations[0].name}</strong>
                                  <br />
                                  {nearestLocations[0].address}
                                  <br />
                                  <span className="text-muted-foreground">PLZ: {nearestLocations[0].postal_code}</span>
                                  <br />
                                  <span className="text-muted-foreground">
                                    Kontakt: {nearestLocations[0].contact_phone}
                                  </span>
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {nearestLocations.map((location) => (
                                  <div
                                    key={location.id}
                                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                      selectedLocation?.id === location.id
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:border-primary/50"
                                    }`}
                                    onClick={() => setSelectedLocation(location)}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <p className="font-medium text-sm">{location.name}</p>
                                        <p className="text-xs text-muted-foreground">{location.address}</p>
                                        <p className="text-xs text-muted-foreground">
                                          PLZ: {location.postal_code} • Kontakt: {location.contact_phone}
                                        </p>
                                      </div>
                                      <div
                                        className={`w-4 h-4 rounded-full border-2 ${
                                          selectedLocation?.id === location.id
                                            ? "border-primary bg-primary"
                                            : "border-muted-foreground"
                                        }`}
                                      />
                                    </div>
                                  </div>
                                ))}

                                {!selectedLocation && (
                                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                                    Bitte wählen Sie einen Abholort aus der Liste aus.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {nearestLocations.length === 0 && !isLoadingLocations && (
                          <p className="text-sm text-muted-foreground">
                            Geben Sie Ihre PLZ ein, um den nächstgelegenen Abholort zu finden.
                          </p>
                        )}
                      </div>
                    )}

                    {pickupLocation === "warehouse" && (
                      <div className="p-3 bg-card border rounded-lg">
                        {pickupLocations.length > 0 && pickupLocations[0] ? (
                          <p className="text-sm text-muted-foreground">
                            <strong>Adresse:</strong> {pickupLocations[0].address}
                            <br />
                            <strong>Kontakt:</strong> {pickupLocations[0].contact_phone}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            <strong>Adresse:</strong> Weststraße 28, 74629 Pfedelbach
                            <br />
                            <strong>Kontakt:</strong> 0157 357 038 64
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {deliveryMethod === "delivery" && (
                  <div
                    className={`mb-4 p-3 rounded-lg ${isOverWeightLimit ? "bg-red-50 border border-red-200" : "bg-blue-50 border border-blue-200"}`}
                  >
                    <div className="flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      <span className={isOverWeightLimit ? "text-red-700" : "text-blue-700"}>
                        Gesamtgewicht: {totalWeight.toFixed(1)} kg
                        {isOverWeightLimit && " - Überschreitet Versandlimit von 10 kg"}
                      </span>
                    </div>
                    {isOverWeightLimit && (
                      <p className="text-sm text-red-600 mt-1">
                        Bitte reduzieren Sie die Menge oder wählen Sie Abholung.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="sticky top-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Ihre Bestellung
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingCart(!isEditingCart)}
                    className="gap-2"
                  >
                    <Edit3 className="w-4 w-4" />
                    {isEditingCart ? "Fertig" : "Bearbeiten"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasFreshFruits && deliveryDateInfo?.deliveryDate && (
                  <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-accent" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-accent">Liefertermin</p>
                        <p className="text-sm font-semibold">
                          {new Date(deliveryDateInfo.deliveryDate).toLocaleDateString("de-DE", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {state.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        <p className="text-xs text-muted-foreground">{item.origin}</p>
                        {isEditingCart ? (
                          <div className="flex items-center space-x-2 mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="h-6 w-6 p-0 hover:bg-primary hover:text-primary-foreground"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="text-xs font-medium w-8 text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="h-6 w-6 p-0 hover:bg-primary hover:text-primary-foreground"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                removeItem(item.id)
                              }}
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-primary hover:text-primary-foreground"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">Menge: {item.quantity}</p>
                        )}
                      </div>
                      <p className="font-medium text-sm">
                        €{formatPrice(safeCalculatePrice(item.price) * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                {isEditingCart && (
                  <div className="border-t pt-4">
                    <Link href="/shop">
                      <Button
                        variant="outline"
                        className="w-full bg-transparent hover:bg-primary hover:text-primary-foreground"
                        size="sm"
                      >
                        Weiter einkaufen
                      </Button>
                    </Link>
                  </div>
                )}

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Zwischensumme ({deliveryMethod === "pickup" ? "Abholung" : "Versand"}):</span>
                    <span>
                      €
                      {formatPrice(
                        state.items.reduce((sum, item) => sum + safeCalculatePrice(item.price) * item.quantity, 0),
                      )}
                    </span>
                  </div>
                  {deliveryMethod === "delivery" && (
                    <div className="flex justify-between">
                      <span>Versandkosten:</span>
                      <span>€4,90</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Gesamt:</span>
                    <span className="text-primary">
                      €
                      {formatPrice(
                        state.items.reduce((sum, item) => sum + safeCalculatePrice(item.price) * item.quantity, 0) +
                          (deliveryMethod === "delivery" ? 4.9 : 0),
                      )}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold">Zahlungsart</h3>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem
                        value="transfer"
                        id="transfer"
                        className="w-4 h-4 rounded-full border-2 border-primary bg-transparent data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                      <Label htmlFor="transfer" className="flex-1 cursor-pointer">
                        <div>
                          <div className="font-medium text-sm">Überweisung</div>
                          <div className="text-xs text-muted-foreground">Sie erhalten die Bankdaten per E-Mail</div>
                        </div>
                      </Label>
                    </div>
                    <div
                      className={`flex items-center space-x-2 p-3 border rounded-lg ${deliveryMethod === "delivery" ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <RadioGroupItem
                        value="cash"
                        id="cash"
                        disabled={deliveryMethod === "delivery"}
                        className="w-4 h-4 rounded-full border-2 border-primary bg-transparent data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                      <Label
                        htmlFor="cash"
                        className={`flex-1 ${deliveryMethod === "delivery" ? "cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        <div>
                          <div className="font-medium text-sm">Barzahlung bei Abholung</div>
                          <div className="text-xs text-muted-foreground">Nur bei Abholung möglich</div>
                        </div>
                      </Label>
                    </div>
                    {hasOnlyDeliverableItems && (
                      <>
                        <div className="flex items-center space-x-2 p-3 border rounded-lg">
                          <RadioGroupItem
                            value="stripe"
                            id="stripe"
                            className="w-4 h-4 rounded-full border-2 border-primary bg-transparent data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                          />
                          <Label htmlFor="stripe" className="flex-1 cursor-pointer">
                            <div className="flex items-center space-x-3">
                              <CreditCard className="w-4 h-4 text-primary" />
                              <div>
                                <div className="font-medium text-sm">Online bezahlen</div>
                                <div className="text-xs text-muted-foreground">
                                  Kreditkarte, PayPal, SEPA-Lastschrift
                                </div>
                              </div>
                            </div>
                          </Label>
                        </div>
                      </>
                    )}
                  </RadioGroup>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold">Nachricht zur Bestellung (optional)</h3>
                  <div>
                    <Label htmlFor="orderMessage">Besondere Wünsche oder Anmerkungen</Label>
                    <textarea
                      id="orderMessage"
                      className="w-full p-3 border rounded-lg resize-none"
                      rows={3}
                      placeholder="z.B. Allergien, Lieferwünsche, etc."
                      value={orderMessage}
                      onChange={(e) => {
                        setOrderMessage(e.target.value)
                      }}
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Button
                    onClick={() => {
                      handleOrderSubmission()
                    }}
                    className="w-full"
                    size="lg"
                  >
                    {`Bestellung abschließen - €${formatPrice(
                      state.items.reduce((sum, item) => sum + safeCalculatePrice(item.price) * item.quantity, 0) +
                        (deliveryMethod === "delivery" ? 4.9 : 0),
                    )}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">Bei Fragen erreichen Sie uns unter: 0157 357 038 64</p>
          </div>
        </div>
      </div>
    </div>
  )
}
