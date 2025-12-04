"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { useCart } from "@/contexts/cart-context"
import { usePricing } from "@/components/pricing-context"
import { useAuth } from "@/contexts/auth-context"
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
  Package,
  Calendar,
  LogOut,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { saveCustomerToCRM } from "@/lib/crm-utils"
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

type CheckoutStep = "cart" | "delivery" | "customer" | "payment"

export default function CheckoutPage() {
  const { state, dispatch } = useCart()
  const { pricingMode, calculatePrice, setPricingMode } = usePricing()
  const { user: authUser } = useAuth() // Use authUser from context

  const [currentStep, setCurrentStep] = useState<CheckoutStep>("cart")
  const [completedSteps, setCompletedSteps] = useState<CheckoutStep[]>([])

  const [authSession, setAuthSession] = useState<any>(null) // Sync authUser from context to local state
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

  const [bulkOrderNames, setBulkOrderNames] = useState<string[]>([])
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

  // Removed useEffect that created the Supabase client and set up auth listener.
  // Now, we sync the authUser from the AuthProvider.
  useEffect(() => {
    setAuthSession(authUser ? { user: authUser } : null)
  }, [authUser])

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
  const {
    executeWithRetry: executeOrderRetry, // Renamed to avoid conflict
  } = useRetryLogic({
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
    setAuthSession(null) // Clear local auth session
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

  // This function was never called - the checkout uses useNearbyPickups hook and lib/geo.ts instead

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

  const isCartStepValid = useCallback(() => {
    return state.items.length > 0
  }, [state.items])

  const isDeliveryStepValid = useCallback(() => {
    if (deliveryMethod === "pickup") {
      if (pickupLocation === "station") {
        if (selectedLocation?.id === "custom") {
          return customPickupPerson.trim() !== ""
        }
        return selectedLocation !== null
      }
      return true // warehouse is always valid
    }
    return true // delivery is always valid if not over weight
  }, [deliveryMethod, pickupLocation, selectedLocation, customPickupPerson])

  const isCustomerStepValid = useCallback(async () => {
    const basicValidation =
      firstName.trim() !== "" &&
      lastName.trim() !== "" &&
      email.trim() !== "" &&
      street.trim() !== "" &&
      houseNumber.trim() !== "" &&
      zip.trim() !== "" &&
      city.trim() !== ""

    if (!basicValidation) {
      return false
    }

    // If user wants to create account and is not logged in, verify email doesn't exist
    if (createAccount && !authSession && email) {
      const result = await checkEmailExists(email)
      if (result.existsInAuth) {
        setEmailError(
          "Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an oder bestellen Sie ohne Konto.",
        )
        return false
      }
    }

    return true
  }, [firstName, lastName, email, street, houseNumber, zip, city, createAccount, authSession, checkEmailExists])

  const isPaymentStepValid = useCallback(() => {
    return acceptedAGB && acceptedPrivacy
  }, [acceptedAGB, acceptedPrivacy])

  const goToStep = useCallback(
    (step: CheckoutStep) => {
      const stepOrder: CheckoutStep[] = ["cart", "delivery", "customer", "payment"]
      const currentIndex = stepOrder.indexOf(currentStep)
      const targetIndex = stepOrder.indexOf(step)

      if (targetIndex > currentIndex && !completedSteps.includes(currentStep)) {
        let isValid = false
        switch (currentStep) {
          case "cart":
            isValid = isCartStepValid()
            break
          case "delivery":
            isValid = isDeliveryStepValid()
            break
          case "customer":
            // Note: customer validation is async but we skip it here for navigation
            // The step will be validated when user clicks "Weiter"
            isValid = true
            break
          case "payment":
            isValid = isPaymentStepValid()
            break
        }

        if (isValid) {
          setCompletedSteps([...completedSteps, currentStep])
        }
      }

      if (targetIndex <= currentIndex || completedSteps.includes(step)) {
        setCurrentStep(step)
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    },
    [currentStep, completedSteps, isCartStepValid, isDeliveryStepValid, isPaymentStepValid],
  )

  const goToNextStep = useCallback(async () => {
    // Added async
    const stepOrder: CheckoutStep[] = ["cart", "delivery", "customer", "payment"]
    const currentIndex = stepOrder.indexOf(currentStep)

    let isValid = false
    switch (currentStep) {
      case "cart":
        isValid = isCartStepValid()
        break
      case "delivery":
        isValid = isDeliveryStepValid()
        break
      case "customer":
        isValid = await isCustomerStepValid() // Fixed: changed isCustomerStepStepValid to isCustomerStepValid
        break
      case "payment":
        isValid = isPaymentStepValid()
        break
    }

    if (!isValid) {
      return
    }

    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep])
    }

    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1])
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [currentStep, completedSteps, isCartStepValid, isDeliveryStepValid, isCustomerStepValid, isPaymentStepValid])

  const handleOrderSubmission = useCallback(async () => {
    console.log("[v0] [Checkout] Order submission started")

    if (isSubmitting) {
      console.log("[v0] [Checkout] Already submitting, ignoring duplicate click")
      return
    }

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

      if (paymentMethod === "sumup") {
        await executeOrderRetry(async () => {
          await saveCustomerToCRM(customerData)

          const totalAmount =
            state.items.reduce((sum, item) => sum + safeCalculatePrice(item.price, item.category) * item.quantity, 0) +
            (deliveryMethod === "delivery" ? 4.9 : 0)

          let finalPickupLocation = "Zentrallager Pfedelbach"
          let finalPickupLocationId = null
          let finalPickupDate = deliveryDateInfo?.deliveryDate || null

          if (deliveryMethod === "delivery") {
            finalPickupLocation = null
            finalPickupLocationId = null
          } else if (deliveryMethod === "pickup") {
            if (pickupLocation === "warehouse") {
              const warehouseLocation = allPickupLocations.find(
                (loc) =>
                  loc.name?.toLowerCase().includes("zentrallager") ||
                  loc.name?.toLowerCase().includes("pfedelbach") ||
                  loc.name?.toLowerCase().includes("baumerlenbach") ||
                  loc.city?.toLowerCase().includes("pfedelbach"),
              )
              if (warehouseLocation) {
                finalPickupLocation = warehouseLocation.name
                finalPickupLocationId = warehouseLocation.id
              } else {
                const nullDistributorLocation = allPickupLocations.find((loc) => !loc.distributor_id)
                if (
                  nullDistributorLocation &&
                  (nullDistributorLocation.name?.toLowerCase().includes("zentral") ||
                    nullDistributorLocation.name?.toLowerCase().includes("pfedelbach"))
                ) {
                  finalPickupLocation = nullDistributorLocation.name
                  finalPickupLocationId = nullDistributorLocation.id
                } else {
                  finalPickupLocation = "Zentrallager Pfedelbach"
                  finalPickupLocationId = null
                }
              }
            } else if (pickupLocation === "station") {
              if (selectedLocation?.id === "custom") {
                finalPickupLocation = customPickupPerson
                finalPickupLocationId = null
              } else if (selectedLocation) {
                finalPickupLocation = selectedLocation.name
                finalPickupLocationId = selectedLocation.id
              } else {
                const warehouseLocation = allPickupLocations.find(
                  (loc) =>
                    loc.name?.toLowerCase().includes("zentrallager") ||
                    loc.name?.toLowerCase().includes("pfedelbach") ||
                    loc.name?.toLowerCase().includes("baumerlenbach"),
                )
                if (warehouseLocation) {
                  finalPickupLocation = warehouseLocation.name
                  finalPickupLocationId = warehouseLocation.id
                } else {
                  finalPickupLocation = "Zentrallager Pfedelbach"
                  finalPickupLocationId = null
                }
              }
            }

            if (!finalPickupDate && deliveryDateInfo?.scheduleId) {
              const schedule = await fetch(`/api/delivery-schedules/${deliveryDateInfo.scheduleId}`)
              if (schedule.ok) {
                const scheduleData = await schedule.json()
                finalPickupDate = scheduleData.delivery_date
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
            deliveryDate: finalPickupDate,
            deliveryScheduleId: deliveryDateInfo?.scheduleId || null,
            pickupStartTime: deliveryDateInfo?.pickupStartTime || null,
            pickupEndTime: deliveryDateInfo?.pickupEndTime || null,
            attributes: filledBulkOrderNames.length > 0 ? { bulk_order_names: filledBulkOrderNames } : undefined,
            orderNumber: tempOrderNumber,
            isTest: isTestMode,
            testMode: isTestMode, // Add testMode flag for invoice creation
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

      let finalPickupDate = deliveryDateInfo?.deliveryDate || null

      if (deliveryMethod === "delivery") {
        finalPickupLocation = null
        finalPickupLocationId = null
      } else if (deliveryMethod === "pickup") {
        if (pickupLocation === "warehouse") {
          const warehouseLocation = allPickupLocations.find(
            (loc) =>
              loc.name?.toLowerCase().includes("zentrallager") ||
              loc.name?.toLowerCase().includes("pfedelbach") ||
              loc.name?.toLowerCase().includes("baumerlenbach"),
          )
          if (warehouseLocation) {
            finalPickupLocation = warehouseLocation.name
            finalPickupLocationId = warehouseLocation.id
          } else {
            const nullDistributorLocation = allPickupLocations.find((loc) => !loc.distributor_id)
            if (
              nullDistributorLocation &&
              (nullDistributorLocation.name?.toLowerCase().includes("zentral") ||
                nullDistributorLocation.name?.toLowerCase().includes("pfedelbach"))
            ) {
              finalPickupLocation = nullDistributorLocation.name
              finalPickupLocationId = nullDistributorLocation.id
            } else {
              finalPickupLocation = "Zentrallager Pfedelbach"
              finalPickupLocationId = null
            }
          }
        } else if (pickupLocation === "station") {
          if (selectedLocation?.id === "custom") {
            finalPickupLocation = customPickupPerson
            finalPickupLocationId = null
          } else if (selectedLocation) {
            finalPickupLocation = selectedLocation.name
            finalPickupLocationId = selectedLocation.id
          } else {
            const warehouseLocation = allPickupLocations.find(
              (loc) =>
                loc.name?.toLowerCase().includes("zentrallager") ||
                loc.name?.toLowerCase().includes("pfedelbach") ||
                loc.name?.toLowerCase().includes("baumerlenbach"),
            )
            if (warehouseLocation) {
              finalPickupLocation = warehouseLocation.name
              finalPickupLocationId = warehouseLocation.id
            } else {
              finalPickupLocation = "Zentrallager Pfedelbach"
              finalPickupLocationId = null
            }
          }
        }

        if (!finalPickupDate && deliveryDateInfo?.scheduleId) {
          const schedule = await fetch(`/api/delivery-schedules/${deliveryDateInfo.scheduleId}`)
          if (schedule.ok) {
            const scheduleData = await schedule.json()
            finalPickupDate = scheduleData.delivery_date
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
        deliveryDate: finalPickupDate,
        deliveryScheduleId: deliveryDateInfo?.scheduleId || null,
        pickupStartTime: deliveryDateInfo?.pickupStartTime || null,
        pickupEndTime: deliveryDateInfo?.pickupEndTime || null,
        attributes: filledBulkOrderNames.length > 0 ? { bulk_order_names: filledBulkOrderNames } : undefined,
        isTest: isTestMode,
      }

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
    orderMessage,
    dispatch,
    executeOrderRetry,
    nearestLocations,
    selectedLocation,
    allPickupLocations,
    pickupLocation,
    safeCalculatePrice,
    deliveryDateInfo,
    supabase,
    password,
    confirmPassword,
    passwordError,
    isLoginMode,
    loginEmail,
    checkEmailExists,
    setLoginEmail,
    setIsLoginMode,
    acceptedAGB,
    acceptedPrivacy,
    bulkOrderNames,
    isSubmitting,
    customPickupPerson,
  ])

  const handleSumUpFailed = async (failureData: any) => {
    console.log("[v0] [Checkout] SumUp payment failed:", failureData)

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

    if (sumupOrderData && sumupCheckoutId) {
      console.log("[v0] [Checkout] Redirecting immediately to order-processing")

      // Speichere Order-Daten in sessionStorage für order-processing Seite
      sessionStorage.setItem(
        "sumupOrderData",
        JSON.stringify({
          ...sumupOrderData,
          attributes: {
            ...sumupOrderData.attributes,
            sumup_checkout_id: sumupCheckoutId,
            sumup_transaction_id: transactionData.transaction_id,
          },
        }),
      )

      // Sofortige Weiterleitung
      window.location.href = `/order-processing?checkoutId=${sumupCheckoutId}&source=sumup&optimistic=true`
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
      setEmailError("Ein Konto mit dieser E-Mail existiert bereits. Möchten Sie sich anmelden?")
    }

    setIsCheckingEmail(false)
  }

  const StepIndicator = () => {
    const steps: Array<{ id: CheckoutStep; label: string; number: number }> = [
      { id: "cart", label: "Warenkorb", number: 1 },
      { id: "delivery", label: "Bestellart", number: 2 },
      { id: "customer", label: "Ihre Daten", number: 3 },
      { id: "payment", label: "Zahlung", number: 4 },
    ]

    // Mobile Progress with sticky positioning and swipe indicators
    const currentIndex = steps.findIndex((s) => s.id === currentStep)
    const canGoBack = currentIndex > 0
    const nextStep = steps[currentIndex + 1]
    const canGoForward = currentIndex < steps.length - 1 && (!nextStep || completedSteps.includes(nextStep.id))

    return (
      <>
        {/* Desktop Progress Bar */}
        <div className="hidden lg:block mb-8">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            {steps.map((step, index) => {
              const isCompleted = completedSteps.includes(step.id)
              const isCurrent = currentStep === step.id
              const isClickable = isCompleted || isCurrent

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <button
                    onClick={() => isClickable && goToStep(step.id)}
                    disabled={!isClickable}
                    className={`flex items-center gap-3 transition-all ${
                      isClickable ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                        isCompleted
                          ? "bg-green-600 text-white"
                          : isCurrent
                            ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? <Check className="w-5 h-5" /> : step.number}
                    </div>
                    <span
                      className={`font-medium hidden xl:block ${
                        isCurrent ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                  </button>
                  {index < steps.length - 1 && (
                    <div className="flex-1 h-0.5 mx-4 bg-muted">
                      <div
                        className={`h-full transition-all ${isCompleted ? "bg-green-600 w-full" : "bg-muted w-0"}`}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Mobile Progress Bar with sticky positioning and swipe indicators */}
        <div className="lg:hidden sticky top-0 z-10 bg-gradient-to-br from-orange-50 to-yellow-50 pb-4 pt-2">
          <div className="text-center mb-1">
            <span className="text-xs text-muted-foreground"> Drücken zum Wechseln </span>
          </div>

          <div className="flex items-center justify-center gap-3 mb-3">
            <button
              onClick={() => canGoBack && goToStep(steps[currentIndex - 1].id)}
              className={`p-2 rounded-full transition-all shadow-sm ${
                canGoBack
                  ? "opacity-100 hover:bg-white/80 hover:shadow-md active:scale-95 cursor-pointer"
                  : "opacity-30 cursor-not-allowed"
              }`}
              disabled={!canGoBack}
              aria-label="Vorheriger Schritt"
            >
              <ChevronLeft className="w-6 h-6 text-muted-foreground" />
            </button>

            <span className="text-base font-medium text-muted-foreground">
              Schritt {currentIndex + 1} von {steps.length}
            </span>

            <button
              onClick={() => canGoForward && goToStep(steps[currentIndex + 1].id)}
              className={`p-2 rounded-full transition-all shadow-sm ${
                canGoForward
                  ? "opacity-100 hover:bg-white/80 hover:shadow-md active:scale-95 cursor-pointer"
                  : "opacity-30 cursor-not-allowed"
              }`}
              disabled={!canGoForward}
              aria-label="Nächster Schritt"
            >
              <ChevronRight className="w-6 h-6 text-muted-foreground" />
            </button>
          </div>

          {/* Progress Dots */}
          <div className="flex gap-2 justify-center">
            {steps.map((step) => {
              const isCompleted = completedSteps.includes(step.id)
              const isCurrent = currentStep === step.id

              return (
                <div
                  key={step.id}
                  className={`h-2 flex-1 rounded-full transition-all max-w-20 ${
                    isCompleted ? "bg-green-600" : isCurrent ? "bg-primary" : "bg-muted"
                  }`}
                />
              )
            })}
          </div>
        </div>
      </>
    )
  }

  if (showSumUpPayment && sumupCheckoutId) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Zahlung abschließen</CardTitle>
                <p className="text-center text-muted-foreground">Gesamtbetrag: €{sumupOrderData.total.toFixed(2)}</p>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Ihre Bestellnummer erhalten Sie nach erfolgreicher Zahlung
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

        <StepIndicator />

        {currentStep === "cart" && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 h-5" />
                  Ihr Warenkorb
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasFreshFruits && deliveryDateInfo?.deliveryDate && (
                <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-accent" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-accent">Liefertermin</p>
                      <p className="font-semibold">
                        {new Date(deliveryDateInfo.deliveryDate).toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      {deliveryDateInfo.pickupStartTime && deliveryDateInfo.pickupEndTime && (
                        <p className="text-sm text-muted-foreground mt-1">
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
                  <div key={item.id} className="flex justify-between items-start p-4 border rounded-lg">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
                        <h4 className="font-medium">{item.name}</h4>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="h-8 w-8 p-0 hover:bg-primary hover:text-primary-foreground"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="font-medium w-12 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="h-8 w-8 p-0 hover:bg-primary hover:text-primary-foreground"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(safeCalculatePrice(item.price, item.category))} / {item.unit}
                      </p>
                    </div>
                    <p className="font-medium text-lg ml-4">
                      €{formatPrice(safeCalculatePrice(item.price, item.category) * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <Link href="/shop">
                  <Button variant="outline" className="w-full bg-transparent" size="lg">
                    Weiter einkaufen
                  </Button>
                </Link>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-lg">
                  <span>Zwischensumme (Abholung):</span>
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
                <p className="text-sm text-muted-foreground">Abholrabatt (-10%): Bereits angewendet</p>
                <div className="flex justify-between font-bold text-xl border-t pt-2">
                  <span>Gesamt:</span>
                  <span className="text-primary">
                    €
                    {formatPrice(
                      state.items.reduce(
                        (sum, item) => sum + safeCalculatePrice(item.price, item.category) * item.quantity,
                        0,
                      ),
                    )}
                  </span>
                </div>
              </div>

              <Button onClick={goToNextStep} className="w-full" size="lg" disabled={!isCartStepValid()}>
                Weiter zu Bestellart
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === "delivery" && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle>Lieferung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
                        <div className="font-medium text-lg">Abholung / Lieferung an Abholort</div>
                        <div className="text-sm text-muted-foreground italic">bei Verteiler</div>
                        <div className="text-muted-foreground">Kostenlos</div>
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
                          <div className="font-medium text-lg">Lieferung nach Hause</div>
                          <div className="text-sm text-muted-foreground italic">nach Hause</div>
                          <div className="text-muted-foreground">
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
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="flex items-center">
                    <Package className="h-4 w-4 mr-2 text-amber-700" />
                    <span className="text-amber-700">
                      Gesamtgewicht: {totalWeight.toFixed(1)} kg - Überschreitet Versandlimit von 10 kg
                    </span>
                  </div>
                  <p className="text-sm text-amber-600 mt-1">Es wurde automatisch Abholung ausgewählt.</p>
                </div>
              )}

              {deliveryMethod === "pickup" && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-lg">Abholort wählen</Label>
                    <RadioGroup value={pickupLocation} onValueChange={setPickupLocation}>
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
                              <div className="font-medium">Zentrallager</div>
                              <div className="text-sm text-muted-foreground">Direkt bei uns in Baumerlenbach</div>
                            </div>
                          </div>
                        </Label>
                      </div>
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
                              <div className="font-medium">Abholort</div>
                              <div className="text-sm text-muted-foreground">An einem regionalen Abholort</div>
                            </div>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {pickupLocation === "warehouse" && (
                    <div className="p-3 bg-card border rounded-lg">
                      {(() => {
                        const warehouseLocation = pickupLocations.find(
                          (loc) =>
                            loc.name?.toLowerCase().includes("zentrallager") ||
                            loc.name?.toLowerCase().includes("pfedelbach") ||
                            loc.city?.toLowerCase().includes("pfedelbach"),
                        )

                        const hasValidAddress =
                          warehouseLocation?.address &&
                          warehouseLocation.address.trim() !== "." &&
                          warehouseLocation.address.trim().length > 1

                        if (hasValidAddress) {
                          return (
                            <p className="text-muted-foreground">
                              <strong>Adresse:</strong> {warehouseLocation.address}
                              <br />
                              <strong>Kontakt:</strong> {warehouseLocation.contact_phone || "0157 357 038 64"}
                            </p>
                          )
                        } else {
                          return (
                            <p className="text-muted-foreground">
                              <strong>Adresse:</strong> Weststraße 28, 74653 Pfedelbach
                              <br />
                              <strong>Kontakt:</strong> 0157 357 038 64
                            </p>
                          )
                        }
                      })()}
                    </div>
                  )}

                  {pickupLocation === "station" && (
                    <div className="space-y-2">
                      <Label htmlFor="plz">PLZ für Abholort</Label>
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
                          Suchen
                        </Button>
                      </div>

                      <div className="space-y-3 mt-3">
                        {searchPlz && searchPlz.length >= 5 && nearestLocations.length > 0 && (
                          <>
                            <p className="font-medium mt-4">
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
                                  setCustomPickupPerson("")
                                }}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium">{location.name}</p>
                                    <p className="text-sm text-muted-foreground mt-1">{location.address}</p>
                                    <p className="text-sm text-muted-foreground mt-1">
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
                          </>
                        )}

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
                              <p className="font-medium">Mein Abholort ist nicht dabei</p>
                              <p className="text-sm text-muted-foreground mt-1">
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
                              {selectedLocation?.id === "custom" && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                          </div>

                          {selectedLocation?.id === "custom" && (
                            <div className="mt-3 pt-3 border-t border-green-200">
                              <Label htmlFor="customPickupPerson" className="font-medium">
                                Name der Abholperson *
                              </Label>
                              <Input
                                id="customPickupPerson"
                                value={customPickupPerson}
                                onChange={(e) => setCustomPickupPerson(e.target.value)}
                                placeholder="z.B. Max Mustermann"
                                className="mt-2"
                                onClick={(e) => e.stopPropagation()}
                              />
                              {customPickupPerson && (
                                <p className="text-sm text-green-700 mt-2 flex items-center gap-1">
                                  <div className="w-2 h-2 bg-green-600 rounded-full" />
                                  Abholperson: <strong>{customPickupPerson}</strong>
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {nearestLocations.length === 0 && !isLoadingNearbyPickups && searchPlz.length >= 5 && (
                          <p className="text-sm text-muted-foreground mt-3">Keine Abholorte in Ihrer Nähe gefunden.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4 p-4 bg-card border rounded-lg">
                <h4 className="font-semibold text-lg">Für Groß- und Sammelbestellungen</h4>
                <p className="text-muted-foreground">
                  Tragen Sie hier falls gewünscht die Namen der einzelnen Kunden ein, damit die Ware entsprechend
                  gerichtet werden kann.
                </p>

                <div className="space-y-3">
                  {bulkOrderNames.map((name, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex-1">
                        <Label htmlFor={`bulk-name-${index}`}>Name für Bestellung {index + 1}</Label>
                        <Input
                          id={`bulk-name-${index}`}
                          value={name}
                          onChange={(e) => {
                            const newNames = [...bulkOrderNames]
                            newNames[index] = e.target.value
                            setBulkOrderNames(newNames)
                          }}
                          placeholder="z.B. Max Mustermann"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newNames = bulkOrderNames.filter((_, i) => i !== index)
                          setBulkOrderNames(newNames)
                        }}
                        className="mt-7 h-10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
                  Eine Person hinzufügen
                </Button>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => goToStep("cart")} className="flex-1" size="lg">
                  Zurück
                </Button>
                <Button onClick={goToNextStep} className="flex-1" size="lg" disabled={!isDeliveryStepValid()}>
                  Weiter zu Ihren Daten
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === "customer" && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle>Ihre Daten</CardTitle>
                  {authSession && (
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="w-2 h-2 bg-green-600 rounded-full" />
                        <span className="text-sm">
                          Angemeldet als <strong className="text-foreground">{authSession.user.email}</strong>
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLogout}
                        className="h-6 px-2 text-sm hover:bg-destructive/10 hover:text-destructive"
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
                      className="mt-1 text-sm text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <h4 className="font-medium text-lg">Anmelden</h4>
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
                  <Label htmlFor="firstName">Vorname *</Label>
                  <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="lastName">Nachname *</Label>
                  <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="email">E-Mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setEmailError("")
                  }}
                  onBlur={handleEmailBlur}
                  className={emailError ? "border-red-500" : ""}
                />
                {isCheckingEmail && <p className="text-sm text-muted-foreground mt-1">E-Mail wird überprüft...</p>}
                {emailError && <p className="text-sm text-red-500 mt-1">{emailError}</p>}
              </div>
              <div>
                <Label htmlFor="phone">Telefon (optional)</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>

              <div className="space-y-4 p-4 bg-card border rounded-lg">
                <h4 className="font-medium text-lg">Rechnungsadresse</h4>
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

                <p className="text-muted-foreground">
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
                    <Label htmlFor="emailReminder">Erinnerung für Abholtermin per E-Mail erhalten</Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="emailUpdates"
                      checked={emailUpdates}
                      onCheckedChange={setEmailUpdates}
                      className="w-4 h-4 rounded-full border-2 border-primary bg-transparent data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                    />
                    <Label htmlFor="emailUpdates">Angebote und Aktionen</Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="newsletter"
                      className="w-4 h-4 rounded-full border-2 border-primary bg-transparent data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                    />
                    <Label htmlFor="newsletter">Newsletter abonnieren</Label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => goToStep("delivery")} className="flex-1" size="lg">
                  Zurück
                </Button>
                <Button onClick={goToNextStep} className="flex-1" size="lg" disabled={!isCustomerStepValid()}>
                  Weiter zur Zahlung
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === "payment" && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle>Zahlung & Bestellung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-4">Zahlungsart wählen</h3>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem
                      value="transfer"
                      id="transfer"
                      className="w-4 h-4 rounded-full border-2 border-primary bg-transparent data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                    />
                    <Label htmlFor="transfer" className="flex-1 cursor-pointer">
                      <div>
                        <div className="font-medium">Überweisung</div>
                        <div className="text-sm text-muted-foreground">Sie erhalten die Bankdaten per E-Mail</div>
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
                        <div className="font-medium">Barzahlung bei Abholung</div>
                        <div className="text-sm text-muted-foreground">Nur bei Abholung möglich</div>
                      </div>
                    </Label>
                  </div>
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
                            <div className="font-medium">Online bezahlen</div>
                            <div className="text-sm text-muted-foreground">Kreditkarte, Debitkarte</div>
                          </div>
                        </div>
                      </Label>
                    </div>
                  )}
                </RadioGroup>
              </div>

              <div className="p-4 bg-card border rounded-lg">
                <h3 className="font-semibold text-lg mb-3">Bestellzusammenfassung</h3>
                <div className="space-y-2">
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
                  <div className="flex justify-between font-bold text-xl border-t pt-2">
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
              </div>

              <div>
                <Label htmlFor="notes" className="font-medium text-lg">
                  Nachricht zur Bestellung (optional)
                </Label>
                <Textarea
                  id="notes"
                  value={orderMessage}
                  onChange={(e) => setOrderMessage(e.target.value)}
                  placeholder="z.B. Lieferwünsche, besondere Anmerkungen..."
                  className="min-h-[100px] resize-none mt-2"
                />
              </div>

              <div className="space-y-4 p-4 bg-card border rounded-lg">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="acceptAGB"
                    checked={acceptedAGB}
                    onCheckedChange={(checked) => setAcceptedAGB(checked as boolean)}
                    required
                    className="mt-0.5 w-4 h-4 flex-shrink-0 rounded border-2 border-primary bg-transparent data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                  />
                  <Label htmlFor="acceptAGB" className="leading-normal cursor-pointer flex-1">
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
                  <Label htmlFor="acceptPrivacy" className="leading-normal cursor-pointer flex-1">
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

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => goToStep("customer")} className="flex-1" size="lg">
                  Zurück
                </Button>
                <Button
                  onClick={handleOrderSubmission}
                  className="flex-1 whitespace-normal h-auto py-3"
                  size="lg"
                  disabled={isSubmitting || !isPaymentStepValid()}
                >
                  {isSubmitting ? (
                    "Bestellung wird verarbeitet..."
                  ) : (
                    <>
                      <span className="hidden sm:inline">Zahlungspflichtig bestellen - </span>
                      <span className="sm:hidden">Bestellen - </span>
                      <span className="font-semibold">
                        €
                        {formatPrice(
                          state.items.reduce(
                            (sum, item) => sum + safeCalculatePrice(item.price, item.category) * item.quantity,
                            0,
                          ) + (deliveryMethod === "delivery" ? 4.9 : 0),
                        )}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
