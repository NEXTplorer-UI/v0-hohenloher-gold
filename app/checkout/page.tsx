"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
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
  LogOut,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { saveCustomerToCRM, sendOrderConfirmationEmail } from "@/lib/crm-utils"
import { PaymentSumUp } from "@/components/payment-sumup"
import Link from "next/link"
import { EnhancedErrorHandler, classifyError, type ErrorInfo } from "@/components/enhanced-error-handler"
import { CustomArrangementNotice } from "@/components/custom-arrangement-notice"
import { useRetryLogic } from "@/hooks/use-retry-logic"
import { determineOrderDeliveryDate } from "@/lib/delivery-schedule-utils"
import { safeJson } from "@/lib/utils/safe-json"
import { useNearbyPickups } from "@/lib/hooks/use-nearby-pickups"
import { createClient } from "@/lib/supabase/client" // Import the singleton client
import { Textarea } from "@/components/ui/textarea" // Import Textarea

const NEXT_PICKUP_DATE = "15. Dezember 2024"

// Removed StripePaymentForm component

export default function CheckoutPage() {
  const { state, dispatch } = useCart()
  const { pricingMode, calculatePrice, setPricingMode } = usePricing()

  const [authSession, setAuthSession] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [isReloadingCustomerData, setIsReloadingCustomerData] = useState(false)

  const [deliveryMethod, setDeliveryMethod] = useState("pickup")
  const [pickupLocation, setPickupLocation] = useState("station")
  const [paymentMethod, setPaymentMethod] = useState("transfer")
  const [emailReminder, setEmailReminder] = useState(false)
  const [emailUpdates, setEmailUpdates] = useState(false)
  const [createAccount, setCreateAccount] = useState(false)
  const [isEditingCart, setIsEditingCart] = useState(false)

  const [acceptedAGB, setAcceptedAGB] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)

  const [deliveryDateInfo, setDeliveryDateInfo] = useState<{
    deliveryDate: string | null
    scheduleId: string | null
    message: string
    pickupStartTime?: string | null
    pickupEndTime?: string | null
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
  const [selectedLocation, setSelectedLocation] = useState<any>(null)
  const [pickupLocations, setPickupLocations] = useState<any[]>([])
  const [isLoadingLocations, setIsLoadingLocations] = useState(false)
  const [orderMessage, setOrderMessage] = useState("") // Renamed from 'notes'
  const [customPickupPerson, setCustomPickupPerson] = useState("")

  const [bulkOrderNames, setBulkOrderNames] = useState<string[]>(["", "", ""])
  const [isBulkOrderExpanded, setIsBulkOrderExpanded] = useState(false)

  const {
    locations: nearestLocations,
    allLocations: allPickupLocations, // Renamed from 'locations' to 'allLocations' to avoid conflict with nearestLocations
    isLoading: isLoadingNearbyPickups, // Renamed from 'isLoadingLocations' to avoid conflict
  } = useNearbyPickups({
    userPlz: searchPlz,
    radiusKm: 30,
    maxPlpZDelta: 300,
    take: 5,
  })

  useEffect(() => {
    if (nearestLocations.length === 1 && !selectedLocation) {
      setSelectedLocation(nearestLocations[0])
    }
  }, [nearestLocations, selectedLocation])

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let isMounted = true

    // Load initial session
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setAuthSession(data.session ?? null)
    })

    // Subscribe to auth state changes
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      setAuthSession(session ?? null)
      if (session) {
        // User logged in - clear login mode and errors
        setIsLoginMode(false)
        setCreateAccount(false)
        setEmailError("")
      }
    })

    return () => {
      isMounted = false
      subscription?.subscription?.unsubscribe()
    }
  }, [supabase])

  const handleReloadCustomerData = async () => {
    if (!authSession) return

    setIsReloadingCustomerData(true)
    try {
      const token = authSession.access_token
      if (!token) {
        alert("Keine Sitzung gefunden")
        return
      }

      const res = await fetch("/api/crm/get-customer", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        alert("Fehler beim Laden der Kundendaten")
        return
      }

      const { customer } = await res.json()

      if (customer) {
        console.log("[v0] Reloaded customer data from CRM:", customer)
        setFirstName(customer.first_name ?? "")
        setLastName(customer.last_name ?? "")
        setEmail(customer.email ?? authSession.user?.email ?? "")
        setPhone(customer.phone ?? "")
        setStreet(customer.street ?? "")
        setHouseNumber(customer.house_number ?? "")
        setZip(customer.postal_code ?? "")
        setCity(customer.city ?? "")
        alert("Kundendaten erfolgreich geladen!")
      } else {
        alert("Keine Kundendaten gefunden")
      }
    } catch (error) {
      console.error("Error reloading customer data:", error)
      alert("Ein Fehler ist aufgetreten")
    } finally {
      setIsReloadingCustomerData(false)
    }
  }

  const hasFreshFruits = state.items.some(
    (item) => item.category === "Frische Südfrüchte" || item.category === "Südfrüchte",
  )
  const hasOliveOil = state.items.some((item) => item.category === "Olivenöl")

  const hasOnlyDeliverableItems = true // All products can be shipped if under weight limit

  const [showSumUpPayment, setShowSumUpPayment] = useState(false)
  const [sumupCheckoutId, setSumupCheckoutId] = useState("")
  const [sumupOrderData, setSumupOrderData] = useState<any>(null)

  const [orderError, setOrderError] = useState<ErrorInfo | null>(null)
  const { executeWithRetry: executeOrderRetry } = useRetryLogic({
    // Renamed to avoid conflict
    maxAttempts: 2,
    baseDelay: 1000,
  })

  const safeCalculatePrice = useCallback(
    (price: string | number, category?: string): number => {
      return calculatePrice(price, category)
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

      const { data: sessionData } = await supabase.auth.getSession()
      setAuthSession(sessionData.session ?? null)

      const token = sessionData.session?.access_token
      if (!token) {
        console.error("No session token available")
        alert("Anmeldung fehlgeschlagen: Keine Sitzung gefunden")
        return
      }

      const res = await fetch("/api/crm/get-customer", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        console.error("Failed to fetch customer data:", res.status)
        // Continue anyway - user can fill out form manually
      } else {
        const { customer } = await res.json()

        if (customer) {
          console.log("[v0] Loaded customer data from CRM:", customer)
          setFirstName(customer.first_name ?? "")
          setLastName(customer.last_name ?? "")
          setEmail(customer.email ?? data.user?.email ?? "")
          setPhone(customer.phone ?? "")
          setStreet(customer.street ?? "")
          setHouseNumber(customer.house_number ?? "")
          setZip(customer.postal_code ?? "")
          setCity(customer.city ?? "")
        } else {
          // No CRM record found - user can fill out form manually
          console.log("[v0] No customer profile found in CRM - form remains empty")
          setEmail(data.user?.email ?? "")
        }
      }

      setIsLoginMode(false)
      setCreateAccount(false)
    } catch (error) {
      console.error("Login error:", error)
      alert("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.")
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setAuthSession(null)
    setEmail("")
    setFirstName("")
    setLastName("")
    setPhone("")
    setStreet("")
    setHouseNumber("")
    setZip("")
    setCity("")
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

    const userPlz = Number.parseInt(plz.trim(), 10)
    if (!Number.isFinite(userPlz)) {
      return pickupLocations.slice(0, 1)
    }

    // Calculate PLZ-based distances for all stations
    const stationsWithDistance = pickupLocations
      .map((station) => {
        const pc = Number.parseInt(String(station.postal_code ?? "").trim(), 10)
        if (!Number.isFinite(pc)) return null
        return { ...station, plzDistance: Math.abs(userPlz - pc) }
      })
      .filter(Boolean) as Array<any & { plzDistance: number }>

    if (stationsWithDistance.length === 0) {
      return pickupLocations.slice(0, 1)
    }

    // Sort by PLZ distance
    stationsWithDistance.sort((a, b) => a.plzDistance - b.plzDistance)
    const nearest = stationsWithDistance[0]

    // Show multiple stations if they're within similar PLZ range (threshold: 200)
    const threshold = 200
    const similarStations = stationsWithDistance.filter((s) => s.plzDistance <= nearest.plzDistance + threshold)

    console.log("[v0] PLZ search for", plz, "found", similarStations.length, "similar stations")

    return similarStations.length > 1 ? similarStations : [nearest]
  }

  const handlePickupLocationSearch = () => {
    if (!searchPlz || searchPlz.trim().length < 5) {
      return
    }
    // Search is automatic via useNearbyPickups hook
  }

  const checkEmailExists = useCallback(async (email: string) => {
    try {
      const response = await fetch("/api/crm/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const result = await safeJson(response)

      if (!response.ok) {
        throw new Error(result.error || "Fehler bei der E-Mail-Überprüfung")
      }

      return {
        existsInAuth: result.existsInAuth,
        existsInCRM: result.existsInCRM,
        error: null,
      }
    } catch (error) {
      console.error("[v0] Error checking email:", error)
      return { existsInAuth: false, existsInCRM: false, error: "Fehler bei der E-Mail-Überprüfung" }
    }
  }, [])

  const handleOrderSubmission = useCallback(async () => {
    console.log("[v0] [Checkout] Order submission started")

    if (isSubmitting) {
      console.log("[v0] [Checkout] Already submitting, ignoring duplicate click")
      return
    }

    // Set submitting flag immediately to prevent race conditions
    setIsSubmitting(true)

    try {
      if (!acceptedAGB || !acceptedPrivacy) {
        alert("Bitte bestätigen Sie die AGB und die Datenschutzerklärung.")
        return
      }

      if (!firstName || !lastName || !email) {
        console.log("[v0] [Checkout] Missing required fields")
        alert("Bitte füllen Sie alle Pflichtfelder aus.")
        return
      }

      if (!street || !houseNumber || !zip || !city) {
        console.log("[v0] [Checkout] Missing address fields")
        alert("Bitte geben Sie eine vollständige Rechnungsadresse an.")
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      const needsEmailCheck = !session && createAccount && !isLoginMode

      if (needsEmailCheck && email && email.includes("@")) {
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

      const filledBulkOrderNames = bulkOrderNames.filter((name) => name.trim() !== "")
      let finalOrderMessage = orderMessage

      if (filledBulkOrderNames.length > 0) {
        const bulkOrderText =
          "\n\nSammelbestellung für:\n" + filledBulkOrderNames.map((name, i) => `${i + 1}. ${name}`).join("\n")
        finalOrderMessage = orderMessage + bulkOrderText
      }

      const isTestMode = typeof window !== "undefined" && localStorage.getItem("admin_test_mode") === "true"

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
        notes: finalOrderMessage || `Bestellung vom ${new Date().toLocaleDateString("de-DE")}`,
        deliveryMethod,
        paymentMethod,
        emailReminder,
        emailUpdates,
        createAccount,
        isTest: isTestMode, // Add test flag to customer data
      }

      // Removed the duplicate try/catch block and integrated it here
      if (paymentMethod === "sumup") {
        await executeOrderRetry(async () => {
          await saveCustomerToCRM(customerData)

          const totalAmount =
            state.items.reduce((sum, item) => sum + safeCalculatePrice(item.price, item.category) * item.quantity, 0) +
            (deliveryMethod === "delivery" ? 4.9 : 0)

          let finalPickupLocation = "Zentrallager Pfedelbach"
          let finalPickupLocationId = null

          if (deliveryMethod === "delivery") {
            finalPickupLocation = null
            finalPickupLocationId = null
          } else if (deliveryMethod === "pickup") {
            if (pickupLocation === "warehouse") {
              const warehouseLocation = allPickupLocations.find(
                (loc) => loc.name.includes("Zentrallager") || loc.name.includes("Pfedelbach"),
              )
              if (warehouseLocation) {
                finalPickupLocation = warehouseLocation.name
                finalPickupLocationId = warehouseLocation.id
              } else if (allPickupLocations[0]) {
                finalPickupLocation = allPickupLocations[0].name
                finalPickupLocationId = allPickupLocations[0].id
              }
            } else if (pickupLocation === "station") {
              if (selectedLocation?.id === "custom") {
                finalPickupLocation = customPickupPerson // Use custom name
                finalPickupLocationId = null
              } else if (selectedLocation) {
                finalPickupLocation = selectedLocation.name
                finalPickupLocationId = selectedLocation.id
              } else if (nearestLocations[0]) {
                finalPickupLocation = nearestLocations[0].name
                finalPickupLocationId = nearestLocations[0].id
              }
            }
          }

          const tempOrderNumber = `HG-TEMP-${Date.now()}`

          const response = await fetch("/api/payments/sumup/create-checkout", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              amount: totalAmount.toFixed(2),
              currency: "eur",
              orderNumber: tempOrderNumber,
              customerEmail: email,
            }),
          })

          const parsed = await safeJson(response)

          if (!response.ok) {
            throw new Error(parsed.error || `Request failed (${response.status})`)
          }

          const { checkoutId } = parsed

          setSumupCheckoutId(checkoutId)
          setSumupOrderData({
            customerName: `${firstName} ${lastName}`,
            email,
            phone,
            items: state.items.map((item) => ({
              ...item,
              price: safeCalculatePrice(item.price, item.category),
            })),
            total: totalAmount,
            deliveryMethod,
            paymentMethod,
            pickupLocation: finalPickupLocation,
            pickupLocationId: finalPickupLocationId,
            notes: finalOrderMessage,
            emailReminder,
            emailUpdates,
            orderTime: new Date().toISOString(),
            deliveryDate: deliveryDateInfo?.deliveryDate || null,
            deliveryScheduleId: deliveryDateInfo?.scheduleId || null,
            pickupStartTime: deliveryDateInfo?.pickupStartTime || null,
            pickupEndTime: deliveryDateInfo?.pickupEndTime || null,
            attributes: filledBulkOrderNames.length > 0 ? { bulk_order_names: filledBulkOrderNames } : undefined,
            orderNumber: tempOrderNumber,
            isTest: isTestMode, // Add test flag to order data
          })
          setShowSumUpPayment(true)
          return
        })
        return
      }

      const totalAmount =
        state.items.reduce((sum, item) => sum + safeCalculatePrice(item.price, item.category) * item.quantity, 0) +
        (deliveryMethod === "delivery" ? 4.9 : 0)

      let finalPickupLocation = "Zentrallager Pfedelbach"
      let finalPickupLocationId = null

      if (deliveryMethod === "delivery") {
        finalPickupLocation = null
        finalPickupLocationId = null
      } else if (deliveryMethod === "pickup") {
        if (pickupLocation === "warehouse") {
          const warehouseLocation = allPickupLocations.find(
            (loc) => loc.name.includes("Zentrallager") || loc.name.includes("Pfedelbach"),
          )
          if (warehouseLocation) {
            finalPickupLocation = warehouseLocation.name
            finalPickupLocationId = warehouseLocation.id
          } else if (allPickupLocations[0]) {
            finalPickupLocation = allPickupLocations[0].name
            finalPickupLocationId = allPickupLocations[0].id
          }
        } else if (pickupLocation === "station") {
          if (selectedLocation?.id === "custom") {
            finalPickupLocation = customPickupPerson // Use custom name
            finalPickupLocationId = null
          } else if (selectedLocation) {
            finalPickupLocation = selectedLocation.name
            finalPickupLocationId = selectedLocation.id
          } else if (nearestLocations[0]) {
            finalPickupLocation = nearestLocations[0].name
            finalPickupLocationId = nearestLocations[0].id
          }
        }
      }

      const orderData = {
        customerName: `${firstName} ${lastName}`,
        email,
        phone,
        items: state.items.map((item) => ({
          ...item,
          price: safeCalculatePrice(item.price, item.category),
        })),
        total: totalAmount,
        deliveryMethod,
        paymentMethod,
        pickupLocation: finalPickupLocation,
        pickupLocationId: finalPickupLocationId,
        notes: finalOrderMessage,
        emailReminder,
        emailUpdates,
        orderTime: new Date().toISOString(),
        deliveryDate: deliveryDateInfo?.deliveryDate || null,
        deliveryScheduleId: deliveryDateInfo?.scheduleId || null,
        pickupStartTime: deliveryDateInfo?.pickupStartTime || null,
        pickupEndTime: deliveryDateInfo?.pickupEndTime || null,
        attributes: filledBulkOrderNames.length > 0 ? { bulk_order_names: filledBulkOrderNames } : undefined,
        isTest: isTestMode, // Add test flag to order data
      }

      // Store order data in sessionStorage for processing page
      const pendingOrder = {
        customerData,
        orderData,
        emailData: {
          customerEmail: email,
          customerName: `${firstName} ${lastName}`,
          orderTotal: totalAmount.toString(),
          paymentMethod,
          deliveryMethod,
          orderItems: state.items.map((item) => ({
            product_name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: safeCalculatePrice(item.price, item.category),
            total_price: item.quantity * safeCalculatePrice(item.price, item.category),
          })),
        },
        createAccount,
        accountData: createAccount
          ? {
              ...customerData,
              password,
            }
          : null,
      }

      sessionStorage.setItem("pendingOrder", JSON.stringify(pendingOrder))

      // Clear cart and redirect to processing page
      dispatch({ type: "CLEAR_CART" })
      window.location.href = "/order-processing"
    } catch (error) {
      console.error("Order submission error:", error)
      const classifiedError = classifyError(error)
      setOrderError(classifiedError)
    } finally {
      setIsSubmitting(false)
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
    orderMessage, // Updated dependency
    dispatch,
    executeOrderRetry, // Use renamed function
    nearestLocations,
    selectedLocation,
    allPickupLocations, // Changed from pickupLocations
    pickupLocation, // Added pickupLocation to dependencies
    safeCalculatePrice,
    deliveryDateInfo, // Include deliveryDateInfo in dependencies
    supabase,
    password,
    confirmPassword,
    passwordError,
    isLoginMode,
    loginEmail,
    checkEmailExists, // Added checkEmailExists to dependencies - this is the fix
    setLoginEmail, // Added setLoginEmail to dependencies
    setIsLoginMode, // Added setIsLoginMode to dependencies
    acceptedAGB, // Added to dependencies
    acceptedPrivacy, // Added to dependencies
    bulkOrderNames, // Added to dependencies
    isSubmitting,
    customPickupPerson, // Added dependency
  ])

  const handleSumUpFailed = async (failureData: any) => {
    console.log("[v0] [Checkout] SumUp payment failed:", failureData)

    // Update checkout status to 'failed' in database
    if (sumupCheckoutId) {
      try {
        await fetch("/api/checkout/update-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checkoutId: sumupCheckoutId,
            status: "failed",
            failureReason: failureData?.message || failureData?.failure_reason || "Unknown error",
          }),
        })
      } catch (error) {
        console.error("[v0] [Checkout] Failed to update checkout status:", error)
      }
    }
  }

  const handleSumUpSuccess = async (transactionData: any) => {
    console.log("[v0] [Checkout] SumUp payment successful:", transactionData)

    if (sumupOrderData) {
      console.log("[v0] [Checkout] Saving SumUp order to database:", sumupOrderData)
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sumupOrderData),
      })

      const orderParsed = await safeJson(orderResponse)

      if (orderResponse.ok) {
        console.log("[v0] [Checkout] SumUp order saved successfully:", orderParsed)

        const updatedSumUpOrderData = {
          ...sumupOrderData,
          orderNumber: orderParsed.data.order.order_number,
          orderTime: orderParsed.data.order.order_time,
        }

        const emailResult = await sendOrderConfirmationEmail(updatedSumUpOrderData)
        if (emailResult.success) {
          console.log("Order confirmation email sent successfully")
        }

        dispatch({ type: "CLEAR_CART" })
        const params = new URLSearchParams({
          orderNumber: orderParsed.data.order.order_number,
          deliveryMethod: updatedSumUpOrderData.deliveryMethod,
          paymentMethod: "sumup",
          total: updatedSumUpOrderData.total,
          customerName: updatedSumUpOrderData.customerName,
        })

        window.location.href = `/order-confirmation?${params.toString()}`
      } else {
        console.error("[v0] [Checkout] Failed to save SumUp order to database:", orderParsed.error)
        // Fallback to just redirecting if saving fails, but still send confirmation
        const emailResult = await sendOrderConfirmationEmail(sumupOrderData)
        if (emailResult.success) {
          console.log("Order confirmation email sent successfully (fallback)")
        }

        dispatch({ type: "CLEAR_CART" })
        const params = new URLSearchParams({
          orderNumber: sumupOrderData.orderNumber,
          deliveryMethod: sumupOrderData.deliveryMethod,
          paymentMethod: "sumup",
          total: sumupOrderData.total,
          customerName: sumupOrderData.customerName,
        })

        window.location.href = `/order-confirmation?${params.toString()}`
      }
    }
  }

  const handleSumUpError = (errorMessage: string) => {
    console.error("SumUp payment error:", errorMessage)
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

  const [emailError, setEmailError] = useState("")
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)

  const handleEmailBlur = async () => {
    if (authSession) {
      setEmailError("")
      return
    }

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

  if (showSumUpPayment && sumupCheckoutId) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Zahlung abschließen</CardTitle>
                <p className="text-center text-muted-foreground">
                  Bestellung {sumupOrderData.orderNumber} - €{sumupOrderData.total}
                </p>
              </CardHeader>
              <CardContent>
                <PaymentSumUp
                  checkoutId={sumupCheckoutId}
                  onSuccess={handleSumUpSuccess}
                  onError={handleSumUpError}
                  onFailed={handleSumUpFailed}
                />
                <div className="mt-4 text-center">
                  <Button variant="outline" onClick={() => setShowSumUpPayment(false)}>
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

  // Replace Stripe payment error UI with SumUp
  if (showSumUpPayment) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>SumUp-Zahlung ist derzeit nicht verfügbar.</p>
            <p>Bitte wählen Sie eine andere Zahlungsmethode.</p>
            <Button onClick={() => setShowSumUpPayment(false)} className="mt-4">
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
        <div className="mb-6">
          <CustomArrangementNotice />
        </div>

        <EnhancedErrorHandler
          error={orderError}
          onRetry={orderError?.retryable ? handleOrderSubmission : undefined}
          onDismiss={() => setOrderError(null)}
          className="mb-6"
        />

        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-700 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">Wichtige Hinweise:</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>
                    <strong>Abholstation nicht dabei?</strong> Tragen Sie bitte den Namen Ihrer Abholperson in das
                    Nachrichtenfeld ein.
                  </li>
                  <li>
                    <strong>Sammelbestellung?</strong> Tragen Sie die Namen aller Kunden in das Feld für
                    Sammelbestellungen ein oder senden Sie uns diese per E-Mail.
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle>Ihre Daten</CardTitle>
                    {authSession && (
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="w-2 h-2 bg-green-600 rounded-full" />
                          <span className="text-xs">
                            Angemeldet als <strong className="text-foreground">{authSession.user.email}</strong>
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleLogout}
                          className="h-6 px-2 text-xs hover:bg-destructive/10 hover:text-destructive"
                        >
                          <LogOut className="w-3 h-3 mr-1" />
                          Abmelden
                        </Button>
                      </div>
                    )}
                    {authSession && (
                      <button
                        onClick={handleReloadCustomerData}
                        disabled={isReloadingCustomerData}
                        className="mt-1 text-xs text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isReloadingCustomerData ? "Lädt..." : "Kundendaten erneut laden"}
                      </button>
                    )}
                  </div>
                  {!authSession && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setIsLoginMode(!isLoginMode)}
                      className="text-primary p-0 h-auto"
                    >
                      {isLoginMode ? "Neues Konto erstellen" : "Bereits ein Konto? Anmelden"}
                    </Button>
                  )}
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
                      <div className="mt-2 text-right">
                        <Link href="/customer/forgot-password" className="text-sm text-primary hover:underline">
                          Passwort vergessen?
                        </Link>
                      </div>
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
                {hasOliveOil && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2 text-blue-700" />
                      <span className="text-sm text-blue-700">Olivenöl kann nur an Abholorte abgeholt werden.</span>
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
                          <div className="font-medium">Abholung / Lieferung an Abholort</div>
                          <div className="text-xs text-muted-foreground italic">bei Verteiler</div>
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
                            <div className="text-xs text-muted-foreground italic">nach Hause</div>
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
                      Bitte reduzieren Sie die Menge oder wählen Sie Abholung.
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
                                <div className="text-xs text-muted-foreground">Direkt bei uns in Baumerlenbach</div>
                              </div>
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* CHANGED: Removed the blue info card completely */}
                    {pickupLocation === "station" && (
                      <div className="space-y-2">
                        <Label htmlFor="plz">PLZ für Abholort</Label>
                        {isLoadingNearbyPickups && (
                          <p className="text-sm text-muted-foreground">Abholorte werden geladen...</p>
                        )}
                        <div className="flex space-x-2">
                          <Input
                            id="plz"
                            placeholder="74653"
                            value={searchPlz}
                            onChange={(e) => setSearchPlz(e.target.value)}
                            disabled={isLoadingNearbyPickups}
                          />
                          <Button
                            variant="outline"
                            onClick={handlePickupLocationSearch}
                            disabled={searchPlz.length < 5 || isLoadingNearbyPickups}
                          >
                            {" "}
                            Suchen
                          </Button>
                        </div>

                        <div className="space-y-3 mt-3">
                          <div className="space-y-2">
                            {/* CHANGED: "Mein Abholort ist nicht dabei" always visible at the top */}
                            <div
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                selectedLocation?.id === "custom"
                                  ? "border-green-600 bg-green-50 ring-2 ring-green-600"
                                  : "border-border hover:border-primary/50 hover:bg-accent/5"
                              }`}
                              onClick={() => {
                                setSelectedLocation({ id: "custom", name: "Mein Abholort ist nicht dabei" })
                              }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">Mein Abholort ist nicht dabei</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Geben Sie den Namen Ihrer Abholperson ein
                                  </p>
                                </div>
                                <div
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                    selectedLocation?.id === "custom"
                                      ? "border-green-600 bg-green-600"
                                      : "border-muted-foreground"
                                  }`}
                                >
                                  {selectedLocation?.id === "custom" && (
                                    <div className="w-2 h-2 bg-white rounded-full" />
                                  )}
                                </div>
                              </div>

                              {selectedLocation?.id === "custom" && (
                                <div className="mt-3 pt-3 border-t border-green-200">
                                  <Label htmlFor="customPickupPerson" className="text-sm font-medium">
                                    Name der Abholperson *
                                  </Label>
                                  <Input
                                    id="customPickupPerson"
                                    value={customPickupPerson}
                                    onChange={(e) => setCustomPickupPerson(e.target.value)}
                                    placeholder="z.B. Max Mustermann"
                                    className="mt-2"
                                    onClick={(e) => e.stopPropagation()} // Prevent click from propagating to parent div
                                  />
                                  {customPickupPerson && (
                                    <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
                                      <div className="w-2 h-2 bg-green-600 rounded-full" />
                                      Abholperson: <strong>{customPickupPerson}</strong>
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* CHANGED: Other pickup locations only shown when PLZ is entered */}
                            {searchPlz && searchPlz.length >= 5 && nearestLocations.length > 0 && (
                              <>
                                <p className="text-sm font-medium mt-4">
                                  {nearestLocations.length === 1
                                    ? "Nächstgelegener Abholort:"
                                    : `${nearestLocations.length} Abholorte in Ihrer Nähe:`}
                                </p>

                                {nearestLocations.map((location) => (
                                  <div
                                    key={location.id}
                                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                      selectedLocation?.id === location.id
                                        ? "border-green-600 bg-green-50 ring-2 ring-green-600"
                                        : "border-border hover:border-primary/50 hover:bg-accent/5"
                                    }`}
                                    onClick={() => {
                                      setSelectedLocation(location)
                                      setCustomPickupPerson("") // Clear custom pickup when selecting a location
                                    }}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <p className="font-medium text-sm">{location.name}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{location.address}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {location.distanceKm
                                            ? `ca. ${location.distanceKm.toFixed(1)} km entfernt`
                                            : `PLZ: ${location.postal_code}`}{" "}
                                          • Kontakt: {location.contact_phone}
                                        </p>
                                      </div>
                                      <div
                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                          selectedLocation?.id === location.id
                                            ? "border-green-600 bg-green-600"
                                            : "border-muted-foreground"
                                        }`}
                                      >
                                        {selectedLocation?.id === location.id && (
                                          <div className="w-2 h-2 bg-white rounded-full" />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                {nearestLocations.length > 1 && !selectedLocation && (
                                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                                    Bitte wählen Sie einen Abholort aus der Liste aus.
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {nearestLocations.length === 0 &&
                          !isLoadingNearbyPickups &&
                          searchPlz.length >= 5 && ( // Use renamed state
                            <p className="text-sm text-muted-foreground mt-3">
                              Keine Abholorte in Ihrer Nähe gefunden.
                            </p>
                          )}
                      </div>
                    )}

                    {pickupLocation === "warehouse" && (
                      <div className="p-3 bg-card border rounded-lg">
                        {allPickupLocations.length > 0 && allPickupLocations[0] ? ( // Use renamed state
                          <p className="text-sm text-muted-foreground">
                            <strong>Adresse:</strong> {allPickupLocations[0].address} {/* Use renamed state */}
                            <br />
                            <strong>Kontakt:</strong> {allPickupLocations[0].contact_phone}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            <strong>Adresse:</strong> Weststraße 28, 74653 Pfedelbach
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
                        {deliveryDateInfo.pickupStartTime && deliveryDateInfo.pickupEndTime && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Abholung: {deliveryDateInfo.pickupStartTime} - {deliveryDateInfo.pickupEndTime} Uhr
                            <br />
                            <span className="italic">oder nach Terminvereinbarung</span>
                          </p>
                        )}
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
                        €{formatPrice(safeCalculatePrice(item.price, item.category) * item.quantity)}
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
                        state.items.reduce(
                          (sum, item) => sum + safeCalculatePrice(item.price, item.category) * item.quantity,
                          0,
                        ),
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
                        state.items.reduce(
                          (sum, item) => sum + safeCalculatePrice(item.price, item.category) * item.quantity,
                          0,
                        ) + (deliveryMethod === "delivery" ? 4.9 : 0),
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
                    {/* Replace Stripe payment option with SumUp */}
                    {hasOnlyDeliverableItems && (
                      <div className="flex items-center space-x-2 p-3 border rounded-lg">
                        <RadioGroupItem
                          value="sumup"
                          id="sumup"
                          className="w-4 h-4 rounded-full border-2 border-primary bg-transparent data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        />
                        <Label htmlFor="sumup" className="flex-1 cursor-pointer">
                          <div className="flex items-center space-x-3">
                            <CreditCard className="w-4 h-4 text-primary" />
                            <div>
                              <div className="font-medium text-sm">Online bezahlen</div>
                              <div className="text-xs text-muted-foreground">Kreditkarte, Debitkarte, PayPa</div>
                            </div>
                          </div>
                        </Label>
                      </div>
                    )}
                  </RadioGroup>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold">Nachricht zur Bestellung (optional)</h3>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-base font-medium">
                      Besondere Wünsche oder Anmerkungen
                    </Label>

                    <div className="text-xs text-muted-foreground mb-2 mt-1">
                      <p className="flex items-start gap-1">
                        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>Abholstation nicht gelistet? Name der Abholperson hier angeben</span>
                      </p>
                    </div>

                    <Textarea
                      id="notes"
                      value={orderMessage}
                      onChange={(e) => setOrderMessage(e.target.value)}
                      placeholder="z.B. Lieferwünsche, Name Ihrer Abholstation..."
                      className="min-h-[100px] resize-none"
                    />

                    <div className="text-xs text-muted-foreground space-y-1 mt-2">
                      <p className="flex items-start gap-1">
                        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>Für Sammelbesteller: Bitte Namen aller Kunden hier eintragen</span>
                      </p>
                    </div>
                  </div>

                  <Card className="border-primary/20">
                    <CardContent className="p-4">
                      <button
                        type="button"
                        onClick={() => setIsBulkOrderExpanded(!isBulkOrderExpanded)}
                        className="w-full flex items-center justify-between text-left"
                      >
                        <h4 className="font-semibold text-sm">Für Groß- und Sammelbestellungen</h4>
                        {isBulkOrderExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>

                      {isBulkOrderExpanded && (
                        <div className="mt-4 space-y-3">
                          <p className="text-xs text-muted-foreground">
                            Tragen Sie hier die Namen der einzelnen Bestellungen ein, damit die Ware entsprechend
                            gerichtet werden kann.
                          </p>

                          <div className="space-y-2">
                            {bulkOrderNames.map((name, index) => (
                              <div key={index}>
                                <Label htmlFor={`bulk-name-${index}`} className="text-xs">
                                  Name für Bestellung {index + 1}
                                </Label>
                                <Input
                                  id={`bulk-name-${index}`}
                                  value={name}
                                  onChange={(e) => {
                                    const newNames = [...bulkOrderNames]
                                    newNames[index] = e.target.value
                                    setBulkOrderNames(newNames)
                                  }}
                                  placeholder="z.B. Max Mustermann"
                                  className="h-9"
                                />
                              </div>
                            ))}
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setBulkOrderNames([...bulkOrderNames, ""])}
                            className="w-full gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Weitere Person hinzufügen
                          </Button>

                          <div className="pt-3 border-t">
                            <p className="text-xs text-muted-foreground italic">
                              <strong>Hinweis:</strong> Haben Sie eine eigene Vereinbarung mit uns? Dann können Sie wie
                              gewohnt bestellen.
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="border-t pt-4">
                  <div className="space-y-4 mb-6">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="acceptAGB"
                        checked={acceptedAGB}
                        onCheckedChange={(checked) => setAcceptedAGB(checked as boolean)}
                        required
                        className="mt-0.5 w-4 h-4 flex-shrink-0 rounded border-2 border-primary bg-transparent data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                      <Label htmlFor="acceptAGB" className="text-sm leading-normal cursor-pointer flex-1">
                        <span className="text-balance">
                          Ich habe die{" "}
                          <Link href="/agb" target="_blank" className="text-primary hover:underline font-medium">
                            Allgemeinen Geschäftsbedingungen
                          </Link>{" "}
                          und die{" "}
                          <Link href="/widerruf" target="_blank" className="text-primary hover:underline font-medium">
                            Widerrufsbelehrung
                          </Link>{" "}
                          gelesen und akzeptiere diese. *
                        </span>
                      </Label>
                    </div>

                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="acceptPrivacy"
                        checked={acceptedPrivacy}
                        onCheckedChange={(checked) => setAcceptedPrivacy(checked as boolean)}
                        required
                        className="mt-0.5 w-4 h-4 flex-shrink-0 rounded border-2 border-primary bg-transparent data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                      <Label htmlFor="acceptPrivacy" className="text-sm leading-normal cursor-pointer flex-1">
                        <span className="text-balance">
                          Ich habe die{" "}
                          <Link href="/privacy" target="_blank" className="text-primary hover:underline font-medium">
                            Datenschutzerklärung
                          </Link>{" "}
                          zur Kenntnis genommen. *
                        </span>
                      </Label>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      handleOrderSubmission()
                    }}
                    className="w-full"
                    size="lg"
                    disabled={isSubmitting || !acceptedAGB || !acceptedPrivacy}
                  >
                    {isSubmitting
                      ? "Bestellung wird verarbeitet..."
                      : `Bestellung abschließen - €${formatPrice(
                          state.items.reduce(
                            (sum, item) => sum + safeCalculatePrice(item.price, item.category) * item.quantity,
                            0,
                          ) + (deliveryMethod === "delivery" ? 4.9 : 0),
                        )}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center"></div>
        </div>
      </div>
    </div>
  )
}
