"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import {
  Plus,
  Calendar,
  Download,
  Clock,
  CheckCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Truck,
  Package,
} from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { useState, useMemo, useEffect, useRef } from "react"
import { NextArrivalBanner } from "@/components/next-arrival-banner"
import { CustomArrangementNotice } from "@/components/custom-arrangement-notice"
import { usePricing } from "@/components/pricing-context"
import useSWR from "swr"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { formatTime } from "@/lib/format-time"
import { calculateBasePrice } from "@/lib/utils/price"
import { AddToCartButton } from "@/components/add-to-cart-button" // Declare AddToCartButton
import { useSearchParams } from "next/navigation"

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    <span className="ml-2">Lädt...</span>
  </div>
)

const NEXT_PICKUP_DATE = "15. Januar 2025"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const downloadCalendarEvent = () => {
  const eventDate = new Date(NEXT_PICKUP_DATE.split(".").reverse().join("-") + "T00:00:00")
  const startDate = eventDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
  const endDate =
    new Date(eventDate.getTime() + 2 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"

  const event = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Hohenloher Gold//Südfrüchte Abholung//DE
BEGIN:VEVENT
UID:suedfruechtе-abholung-${eventDate.toISOString()}@hohenloher-gold.de
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:Südfrüchte Abholung - Hohenloher Gold
DESCRIPTION:Abholung der bestellten Südfrüchte an Ihrer Abholstation. Bitte bringen Sie Ihre Bestellbestätigung mit.
LOCATION:Ihre Abholstation
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Erinnerung: Südfrüchte Abholung heute
TRIGGER:-P1D
END:VALARM
END:VEVENT
END:VCALENDAR`

  const blob = new Blob([event], { type: "text/calendar;charset=utf-8" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = `suedfruechtе-abholung-${eventDate.toISOString()}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const downloadSeasonCalendar = (schedules: any[]) => {
  const events = schedules
    .map((delivery) => {
      const eventDate = new Date(delivery.date.split(".").reverse().join("-") + "T00:00:00")
      const startDate = eventDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
      const endDate =
        new Date(eventDate.getTime() + 2 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"

      return `BEGIN:VEVENT
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:Südfrüchte Abholung - ${delivery.type}
DESCRIPTION:Abholung frischer Südfrüchte bei Hohenloher Gold. Typ: ${delivery.type}
LOCATION:Gartenbühlstraße 33, 74613 Öhringen
END:VEVENT`
    })
    .join("\n")

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Hohenloher Gold//Südfrüchte Saison//DE
${events}
END:VCALENDAR`

  const blob = new Blob([icsContent], { type: "text/calendar" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "suedfruechtе-saison-2025.ics"
  a.click()
  URL.revokeObjectURL(url)
}

const getProductStatus = (product: any, cartQuantity = 0) => {
  if (!product) return { status: "out-of-stock", label: "Ausverkauft", color: "bg-red-500" }

  const isSouthernFruit = product.category === "Südfrüchte"

  if (isSouthernFruit && product.is_seasonal) {
    if (product.availability_message) {
      if (product.availability_message.includes("Sofort verfügbar")) {
        const availableStock = (product.current_stock || 0) - cartQuantity
        return {
          status: "available",
          label: availableStock > 0 && availableStock <= 5 ? `${availableStock} verfügbar` : "Sofort verfügbar",
          color: "bg-green-500",
        }
      }
      if (product.availability_message.includes("Lieferung am")) {
        return {
          status: "pre-order",
          label: product.availability_message,
          color: "bg-yellow-500",
        }
      }
      if (product.availability_message.includes("Nächste Lieferung")) {
        return {
          status: "next-delivery",
          label: product.availability_message,
          color: "bg-blue-500",
        }
      }
      if (
        product.availability_message.includes("Keine Liefertermine") ||
        product.availability_message.includes("nicht verfügbar")
      ) {
        return { status: "out-of-stock", label: "Keine Termine verfügbar", color: "bg-red-500" }
      }
      if (product.availability_message.includes("Auf Lager") && product.current_stock > 0) {
        const availableStock = (product.current_stock || 0) - cartQuantity
        return {
          status: "available",
          label: availableStock <= 5 ? `${availableStock} auf Lager` : "Auf Lager",
          color: "bg-green-500",
        }
      }
    }

    // Fallback for seasonal products without specific message
    if (product.in_stock) {
      return { status: "seasonal", label: "Saisonware - bestellbar", color: "bg-yellow-500" }
    } else {
      return { status: "out-of-stock", label: "Saison beendet", color: "bg-red-500" }
    }
  }

  if (!product.in_stock) {
    return { status: "out-of-stock", label: "Nicht verfügbar", color: "bg-red-500" }
  }

  if (product.current_stock !== undefined) {
    const availableStock = (product.current_stock || 0) - cartQuantity

    if (availableStock <= 0) {
      return { status: "out-of-stock", label: "Ausverkauft", color: "bg-red-500" }
    }
    if (availableStock > 0 && availableStock <= 5) {
      return {
        status: "low-stock",
        label: `Nur noch ${availableStock} verfügbar`,
        color: "bg-orange-500",
      }
    }
    if (availableStock > 0) {
      return { status: "available", label: "Lieferbar", color: "bg-green-500" }
    }
  }

  return { status: "available", label: "Lieferbar", color: "bg-green-500" }
}

function groupProductsByBaseName(products: any[]) {
  const groups = new Map<string, any[]>()

  products.forEach((product) => {
    const baseName = product.name.replace(/\s*(250g|500g|1kg|1\s*L|2kg|5kg|10kg)$/i, "").trim()

    if (!groups.has(baseName)) {
      groups.set(baseName, [])
    }
    groups.get(baseName)!.push(product)
  })

  return groups
}

function extractSize(productName: string): string | null {
  const match = productName.match(/\s*(250g|500g|1kg|1\s*L|2kg|5kg|10kg)$/i)
  return match ? match[1].trim() : null
}

type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc" | "newest"

export default function ShopPage() {
  const searchParams = useSearchParams()
  const categoryFromUrl = searchParams.get("category")

  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryFromUrl || "alle")
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [selectedSizes, setSelectedSizes] = useState<Map<string, number>>(new Map())
  const [sortBy, setSortBy] = useState<SortOption>("name-asc")
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false)
  const [showLeftIndicator, setShowLeftIndicator] = useState(false)
  const [showRightIndicator, setShowRightIndicator] = useState(false)
  const [schedulePageIndex, setSchedulePageIndex] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scheduleScrollRef = useRef<HTMLDivElement>(null)
  const { calculatePrice, pricingMode, setPricingMode } = usePricing()
  const { cart } = useCart()

  const {
    data: dbProducts,
    error,
    isLoading: loading,
    mutate,
  } = useSWR("/api/products", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })

  const {
    data: dbCategories,
    error: categoriesError,
    isLoading: categoriesLoading,
  } = useSWR("/api/categories", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })

  useEffect(() => {
    if (cart?.items?.length > 0) {
      console.log("[v0] Cart changed, refreshing product stock data")
      mutate()
    }
  }, [cart?.items?.length]) // Only depend on the length, not the mutate function

  const {
    data: deliverySchedules,
    error: schedulesError,
    isLoading: schedulesLoading,
  } = useSWR("/api/delivery-schedules", fetcher)

  const allProducts = useMemo(() => {
    if (loading || error || !dbProducts) {
      console.log("[v0] allProducts: loading, error, or no data", { loading, error, hasData: !!dbProducts })
      return []
    }
    console.log("[v0] allProducts: returning", dbProducts.length, "products")
    return dbProducts
  }, [dbProducts, loading, error])

  const filteredProducts = useMemo(() => {
    let filtered =
      selectedCategory === "alle" ? allProducts : allProducts.filter((product) => product.category === selectedCategory)

    if (showOnlyAvailable) {
      filtered = filtered.filter((product) => {
        const availability = getProductStatus(product)
        return product.in_stock && availability.status !== "out-of-stock"
      })
    }

    return filtered
  }, [selectedCategory, showOnlyAvailable, allProducts])

  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts]

    switch (sortBy) {
      case "name-asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case "name-desc":
        sorted.sort((a, b) => b.name.localeCompare(a.name))
        break
      case "price-asc":
        sorted.sort((a, b) => Number.parseFloat(a.price) - Number.parseFloat(b.price))
        break
      case "price-desc":
        sorted.sort((a, b) => Number.parseFloat(b.price) - Number.parseFloat(a.price))
        break
      case "newest":
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
    }

    return sorted
  }, [filteredProducts, sortBy])

  const productGroups = useMemo(() => {
    return groupProductsByBaseName(sortedProducts)
  }, [sortedProducts])

  useEffect(() => {
    const newSelectedSizes = new Map(selectedSizes)
    let hasChanges = false

    productGroups.forEach((variants, baseName) => {
      if (variants.length <= 1) return // Skip single-variant products

      const currentIndex = selectedSizes.get(baseName) ?? 0
      const currentVariant = variants[currentIndex]

      // Check if current variant is out of stock or unavailable
      const availability = getProductStatus(currentVariant)
      const isUnavailable = !currentVariant.in_stock || availability.status === "out-of-stock"

      if (isUnavailable) {
        // Find first available variant
        const firstAvailableIndex = variants.findIndex((v) => {
          const vAvailability = getProductStatus(v)
          return v.in_stock && vAvailability.status !== "out-of-stock"
        })

        if (firstAvailableIndex !== -1 && firstAvailableIndex !== currentIndex) {
          console.log(`[v0] Auto-selecting available variant for ${baseName}: ${variants[firstAvailableIndex].name}`)
          newSelectedSizes.set(baseName, firstAvailableIndex)
          hasChanges = true
        }
      }
    })

    if (hasChanges) {
      setSelectedSizes(newSelectedSizes)
    }
  }, [productGroups, cart?.items]) // Re-run when products or cart changes

  const getSelectedVariant = (baseName: string, variants: any[]) => {
    const selectedIndex = selectedSizes.get(baseName) || 0
    return variants[selectedIndex] || variants[0]
  }

  const categories = useMemo(() => {
    if (categoriesLoading || !dbCategories) {
      // Fallback to extracting from products while loading
      if (!dbProducts || dbProducts.length === 0) return ["alle"]
      const uniqueCategories = [...new Set(dbProducts.map((p: any) => p.category).filter(Boolean))]
      return ["alle", ...uniqueCategories.sort()]
    }

    const categoriesArray = dbCategories.categories || dbCategories
    const categoryNames = categoriesArray.map((cat: any) => cat.name)
    return ["alle", ...categoryNames]
  }, [dbCategories, categoriesLoading, dbProducts])

  console.log("[v0] Final categories for filter:", categories)
  console.log("[v0] Selected category:", selectedCategory)
  console.log("[v0] Filtered products count:", filteredProducts.length)

  useEffect(() => {
    const handleScroll = () => {
      const container = scrollContainerRef.current
      if (!container) return

      const { scrollLeft, scrollWidth, clientWidth } = container
      setShowLeftIndicator(scrollLeft > 10)
      setShowRightIndicator(scrollLeft < scrollWidth - clientWidth - 10)
    }

    const container = scrollContainerRef.current
    if (container) {
      handleScroll()
      container.addEventListener("scroll", handleScroll)
      window.addEventListener("resize", handleScroll)

      return () => {
        container.removeEventListener("scroll", handleScroll)
        window.removeEventListener("resize", handleScroll)
      }
    }
  }, [categories])

  useEffect(() => {
    if (categoryFromUrl && categoryFromUrl !== selectedCategory) {
      console.log("[v0] Setting category from URL:", categoryFromUrl)
      setSelectedCategory(categoryFromUrl)
    }
  }, [categoryFromUrl])

  const SCHEDULES_PER_PAGE = 4
  const totalSchedulePages = Math.ceil((deliverySchedules?.length || 0) / SCHEDULES_PER_PAGE)
  const paginatedSchedules = useMemo(() => {
    if (!deliverySchedules) return []
    const start = schedulePageIndex * SCHEDULES_PER_PAGE
    const end = start + SCHEDULES_PER_PAGE
    return deliverySchedules.slice(start, end)
  }, [deliverySchedules, schedulePageIndex, SCHEDULES_PER_PAGE])

  useEffect(() => {
    const handleScheduleScroll = () => {
      const container = scheduleScrollRef.current
      if (!container) return

      const { scrollLeft, scrollWidth, clientWidth } = container
      setShowLeftIndicator(scrollLeft > 10)
      setShowRightIndicator(scrollLeft < scrollWidth - clientWidth - 10)
    }

    const container = scheduleScrollRef.current
    if (container) {
      handleScheduleScroll()
      container.addEventListener("scroll", handleScheduleScroll)
      window.addEventListener("resize", handleScheduleScroll)

      return () => {
        container.removeEventListener("scroll", handleScheduleScroll)
        window.removeEventListener("resize", handleScheduleScroll)
      }
    }
  }, [deliverySchedules])

  if (loading || schedulesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NextArrivalBanner />
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (error || schedulesError) {
    return (
      <div className="min-h-screen bg-background">
        <NextArrivalBanner />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-destructive mb-4">Fehler beim Laden der Produkte</h2>
            <p className="text-sm text-muted-foreground">{error || schedulesError}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NextArrivalBanner />

      {/* Custom arrangement notice banner */}
      <div className="container mx-auto px-4 py-4">
        <CustomArrangementNotice />
      </div>

      <section id="seasonal-overview" className="py-6 border-b text-primary bg-sidebar-accent-foreground">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-primary text-lg leading-tight">Abholtermine Saison 2025</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Termine Zentrallager • Unterverteiler haben eigene Termine
                    </p>
                  </div>
                </div>

                {/* Desktop: Download buttons in header */}
                <div className="hidden md:flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={downloadCalendarEvent}
                    className="flex items-center text-sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Nächsten Termin speichern
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadSeasonCalendar(deliverySchedules || [])}
                    className="flex items-center bg-transparent text-sm"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Ganze Saison exportieren
                  </Button>
                </div>
              </div>

              {/* Mobile: Horizontal scrollable timeline with swipe indicator */}
              <div className="md:hidden relative">
                {showLeftIndicator && (
                  <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-accent/10 to-transparent z-10 pointer-events-none flex items-center">
                    <ChevronLeft className="w-4 h-4 text-primary ml-2" />
                  </div>
                )}

                {showRightIndicator && (
                  <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-accent/10 to-transparent z-10 pointer-events-none flex items-center justify-end">
                    <ChevronRight className="w-4 h-4 text-primary mr-2" />
                  </div>
                )}

                <div ref={scheduleScrollRef} className="overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
                  <div className="flex gap-3 min-w-min">
                    {deliverySchedules?.map((schedule: any, index: number) => (
                      <div key={index} className="flex-shrink-0 w-56">
                        <div className="text-base font-semibold text-primary mb-2 text-center">{schedule.date}</div>

                        <div
                          className={`p-3 rounded-lg border-2 h-[160px] ${
                            schedule.status === "confirmed"
                              ? "bg-emerald-50/50 border-emerald-500"
                              : "bg-yellow-50/50 border-yellow-500"
                          }`}
                        >
                          <div
                            className={`text-sm font-semibold mb-2 flex items-center ${
                              schedule.status === "confirmed" ? "text-emerald-700" : "text-yellow-700"
                            }`}
                          >
                            {schedule.status === "confirmed" ? (
                              <CheckCircle className="w-4 h-4 mr-1.5" />
                            ) : (
                              <Clock className="w-4 h-4 mr-1.5" />
                            )}
                            {schedule.status === "confirmed" ? "Bestätigt" : "Geplant"}
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {/* Left column: Order deadline */}
                            <div>
                              <div className="font-medium text-foreground leading-tight mb-1">Bestellschluss:</div>
                              <div className="text-foreground leading-tight">{schedule.orderDeadline}</div>
                            </div>

                            {/* Right column: Pickup time */}
                            {schedule.pickupStartTime && schedule.pickupEndTime && (
                              <div>
                                <div className="font-medium text-foreground leading-tight mb-1">Abholung:</div>
                                <div className="text-foreground leading-tight">
                                  {formatTime(schedule.pickupStartTime)}-{formatTime(schedule.pickupEndTime)}
                                </div>
                              </div>
                            )}
                          </div>

                          {schedule.notes && (
                            <div className="mt-2 p-2 bg-white/50 rounded text-xs text-foreground leading-tight">
                              {schedule.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center items-center gap-2 mt-3 text-xs text-muted-foreground">
                  <ChevronLeft className="w-3 h-3" />
                  <span>Wischen für mehr Termine</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>

              {/* Desktop: Paginated grid with navigation arrows */}
              <div className="hidden md:block">
                <div className="relative">
                  {schedulePageIndex > 0 && (
                    <button
                      onClick={() => setSchedulePageIndex((prev) => Math.max(0, prev - 1))}
                      className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 bg-primary text-primary-foreground rounded-full p-2 shadow-lg hover:scale-110 transition-transform"
                      aria-label="Vorherige Termine"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  )}

                  {schedulePageIndex < totalSchedulePages - 1 && (
                    <button
                      onClick={() => setSchedulePageIndex((prev) => Math.min(totalSchedulePages - 1, prev + 1))}
                      className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 bg-primary text-primary-foreground rounded-full p-2 shadow-lg hover:scale-110 transition-transform"
                      aria-label="Nächste Termine"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}

                  <div className="grid grid-cols-4 gap-3">
                    {paginatedSchedules.map((schedule: any, index: number) => (
                      <div key={index}>
                        <div className="text-base font-semibold text-primary mb-2 text-center">{schedule.date}</div>

                        <div
                          className={`p-3 rounded-lg border-2 h-[160px] ${
                            schedule.status === "confirmed"
                              ? "bg-emerald-50/50 border-emerald-500"
                              : "bg-yellow-50/50 border-yellow-500"
                          }`}
                        >
                          <div
                            className={`text-sm font-semibold mb-2 flex items-center ${
                              schedule.status === "confirmed" ? "text-emerald-700" : "text-yellow-700"
                            }`}
                          >
                            {schedule.status === "confirmed" ? (
                              <CheckCircle className="w-4 h-4 mr-1.5" />
                            ) : (
                              <Clock className="w-4 h-4 mr-1.5" />
                            )}
                            {schedule.status === "confirmed" ? "Bestätigt" : "Geplant"}
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {/* Left column: Order deadline */}
                            <div>
                              <div className="font-medium text-foreground leading-tight mb-1">Bestellschluss:</div>
                              <div className="text-foreground leading-tight">{schedule.orderDeadline}</div>
                            </div>

                            {/* Right column: Pickup time */}
                            {schedule.pickupStartTime && schedule.pickupEndTime && (
                              <div>
                                <div className="font-medium text-foreground leading-tight mb-1">Abholung:</div>
                                <div className="text-foreground leading-tight">
                                  {formatTime(schedule.pickupStartTime)}-{formatTime(schedule.pickupEndTime)}
                                </div>
                              </div>
                            )}
                          </div>

                          {schedule.notes && (
                            <div className="mt-2 p-2 bg-white/50 rounded text-xs text-foreground leading-tight">
                              {schedule.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {totalSchedulePages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-4">
                      {Array.from({ length: totalSchedulePages }).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSchedulePageIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            idx === schedulePageIndex ? "bg-primary w-6" : "bg-primary/30 hover:bg-primary/50"
                          }`}
                          aria-label={`Seite ${idx + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="md:hidden bg-background border border-primary/20 rounded-lg p-3 mt-4 container mx-auto px-4">
        <div className="text-xs font-semibold text-center text-muted-foreground mb-2">Preise für:</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setPricingMode("pickup")}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
              pricingMode === "pickup"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Abholung</span>
          </button>
          <button
            onClick={() => setPricingMode("shipping")}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
              pricingMode === "shipping"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Versand</span>
          </button>
        </div>
      </div>

      <button
        onClick={() => setPricingMode(pricingMode === "pickup" ? "shipping" : "pickup")}
        className="md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
        aria-label="Preismodus wechseln"
      >
        {pricingMode === "pickup" ? <Truck className="w-6 h-6" /> : <Package className="w-6 h-6" />}
      </button>

      <div className="hidden md:block fixed bottom-6 right-6 z-50">
        <div className="bg-background border-2 border-primary/20 rounded-xl shadow-2xl p-4">
          <div className="text-center mb-3">
            <h3 className="text-sm font-semibold text-primary mb-1">Preise für:</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPricingMode("pickup")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 flex flex-col items-center ${
                pricingMode === "pickup"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <span>🚗 Abholung</span>
              <span className="text-[10px] italic mt-0.5 text-background">bei Verteiler</span>
            </button>
            <button
              onClick={() => setPricingMode("shipping")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 flex flex-col items-center ${
                pricingMode === "shipping"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <span>📦 Versand</span>
              <span className="text-[10px] italic mt-0.5 text-primary-foreground">nach Hause</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-4">Unser Shop</h1>
        </div>

        <div id="shop-filter" className="scroll-mt-20 mb-4 space-y-3">
          {/* Category filter */}
          <div className="md:flex md:flex-wrap md:gap-2">
            {/* Mobile: Horizontal scrollable with indicators */}
            <div className="md:hidden relative">
              {showLeftIndicator && (
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none flex items-center">
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </div>
              )}

              {showRightIndicator && (
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none flex items-center justify-end">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              )}

              <div ref={scrollContainerRef} className="overflow-x-auto scrollbar-hide -mx-4 px-4">
                <div className="flex gap-1.5 min-w-min pb-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        selectedCategory === category
                          ? "bg-gold text-gold-foreground hover:bg-gold-hover"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                      }`}
                    >
                      {category === "alle" ? "Alle Produkte" : category}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Desktop: Flex wrap */}
            <div className="hidden md:flex md:flex-wrap md:gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? "bg-gold text-gold-foreground hover:bg-gold-hover"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                  }`}
                >
                  {category === "alle" ? "Alle Produkte" : category}
                </button>
              ))}
            </div>
          </div>

          {/* Sort and availability controls */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="available-only"
                checked={showOnlyAvailable}
                onCheckedChange={(checked) => setShowOnlyAvailable(checked === true)}
              />
              <label
                htmlFor="available-only"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Nur verfügbare Produkte anzeigen
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Sortieren nach..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                  <SelectItem value="price-asc">Preis (niedrig-hoch)</SelectItem>
                  <SelectItem value="price-desc">Preis (hoch-niedrig)</SelectItem>
                  <SelectItem value="newest">Neueste zuerst</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground">
              {filteredProducts.length} {filteredProducts.length === 1 ? "Produkt" : "Produkte"}
            </div>
          </div>
        </div>

        <section className="py-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 md:gap-6">
            {Array.from(productGroups.entries()).map(([baseName, variants]) => {
              const selectedVariant = getSelectedVariant(baseName, variants)
              const hasMultipleVariants = variants.length > 1

              return (
                <ProductCard
                  key={`${baseName}-${cart?.items?.length || 0}`}
                  product={selectedVariant}
                  variants={hasMultipleVariants ? variants : undefined}
                  selectedVariantIndex={selectedSizes.get(baseName) || 0}
                  onVariantChange={(index) =>
                    setSelectedSizes((prev) => {
                      const newSizes = new Map(prev)
                      newSizes.set(baseName, index)
                      return newSizes
                    })
                  }
                  onSelect={setSelectedProduct}
                  calculatePrice={calculatePrice}
                />
              )
            })}
          </div>
        </section>
      </div>

      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="w-[95vw] max-w-[95vw] md:w-[80vw] md:max-w-[900px] h-auto max-h-[90vh] overflow-y-auto p-4 md:p-6">
          {selectedProduct && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* Left: Image */}
                <div className="flex items-start justify-center md:justify-start">
                  <div className="w-full max-w-[400px] md:max-w-none aspect-square rounded-lg overflow-hidden bg-secondary">
                    <img
                      src={selectedProduct.image_url || selectedProduct.images?.[0] || "/placeholder.svg"}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Right: Content */}
                <div className="flex flex-col min-h-0">
                  {/* Title */}
                  <div className="mb-3 md:mb-4">
                    <h2 className="text-2xl md:text-3xl font-bold text-primary mb-2 break-words">
                      {selectedProduct.name}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{selectedProduct.category}</Badge>
                      {selectedProduct.organic && <Badge variant="outline">Bio</Badge>}
                    </div>
                  </div>

                  {/* Delivery info for seasonal products */}
                  {selectedProduct.category === "Südfrüchte" && deliverySchedules && deliverySchedules.length > 0 && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-3 md:mb-4">
                      <div className="flex items-center gap-2 text-sm md:text-base">
                        <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span className="font-medium text-blue-900 break-words">
                          Bestellschluss: {(() => {
                            const nextConfirmed = deliverySchedules.find((d: any) => d.status === "confirmed")
                            return nextConfirmed?.orderDeadline || "Siehe Terminübersicht"
                          })()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Product description */}
                  <div className="text-sm md:text-base text-muted-foreground leading-relaxed mb-3 md:mb-4">
                    {selectedProduct.description}
                    {selectedProduct.fullDescription && (
                      <div
                        className="mt-2 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: selectedProduct.fullDescription }}
                      />
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t mb-3 md:mb-4" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-3 md:mb-4">
                    {/* Left: Price info */}
                    <div className="space-y-1">
                      <div>
                        <p className="text-sm text-muted-foreground">Preis:</p>
                        <p className="text-2xl md:text-3xl font-bold text-primary">
                          €
                          {calculatePrice(selectedProduct.price, selectedProduct.category).toFixed(2).replace(".", ",")}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">pro {selectedProduct.unit}</p>
                      {(() => {
                        const basePrice = calculateBasePrice(
                          selectedProduct.price,
                          selectedProduct.weight_kg,
                          selectedProduct.unit,
                        )
                        return basePrice ? <p className="text-sm text-muted-foreground">{basePrice}</p> : null
                      })()}
                    </div>

                    {/* Right: Metadata */}
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Herkunft:</p>
                        <p className="text-sm md:text-base font-medium break-words">{selectedProduct.origin}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Gewicht:</p>
                        <p className="text-sm md:text-base font-medium">{selectedProduct.weight_kg} kg</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-h-4" />

                  <div className="mt-auto w-full">
                    <AddToCartButton product={selectedProduct} />
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ProductCard({
  product,
  variants,
  selectedVariantIndex,
  onVariantChange,
  onSelect,
  calculatePrice,
}: {
  product: any
  variants?: any[]
  selectedVariantIndex?: number
  onVariantChange?: (index: number) => void
  onSelect: (product: any) => void
  calculatePrice: (price: string | number, category?: string) => number
}) {
  const { addToCart, cart } = useCart()

  const cartQuantity = !cart?.items
    ? 0
    : cart.items.filter((item) => item.id === product.id).reduce((sum, item) => sum + item.quantity, 0)

  const availability = getProductStatus(product, cartQuantity)

  const handleQuickAddToCart = () => {
    addToCart(product, 1)
  }

  const canAddToCart = product.in_stock && availability.status !== "out-of-stock"

  const imageUrl = product.image_url || product.images?.[0] || "/images/banana-chips-placeholder.jpg"

  // Log products without images to help debug
  if (!product.image_url && (!product.images || product.images.length === 0)) {
    console.log("[v0] Product without image:", {
      name: product.name,
      src: imageUrl,
      error: null,
    })
  }

  const availableFrom = product.attributes?.available_from
    ? String(product.attributes.available_from).replace(/^["']|["']$/g, "")
    : null

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow bg-accent/10 border border-accent/20 p-1.5 md:p-3">
      <CardHeader className="pb-0.5 p-1.5 md:p-3">
        {/* Product image */}
        <div
          className="aspect-square bg-muted rounded-lg mb-1 md:mb-2 overflow-hidden cursor-pointer"
          onClick={() => onSelect(product)}
        >
          <img
            src={imageUrl || "/placeholder.svg"}
            alt={product.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform"
            loading="lazy"
            onError={(e) => {
              console.log("[v0] Image failed to load:", {
                name: product.name,
                src: imageUrl,
                error: e,
              })
            }}
          />
        </div>

        <CardTitle className="text-base md:text-xl mb-1 line-clamp-2">{product.name}</CardTitle>

        {/* Status badge */}
        <div className="space-y-0.5">
          <div className="flex items-center space-x-1 h-4 md:h-5">
            <div className={`w-2 h-2 rounded-full ${availability.color}`}></div>
            <span className="text-xs md:text-sm text-muted-foreground line-clamp-1">{availability.label}</span>
          </div>
          {availableFrom && <div className="text-xs md:text-sm text-blue-600">Verfügbar ab {availableFrom}</div>}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-1 flex flex-col p-1.5 pt-0 md:p-3 md:pt-0 md:pb-0">
        {/* Size variants */}
        <div className="min-h-[2rem] md:min-h-[2.5rem]">
          {variants && variants.length > 1 && onVariantChange && (
            <>
              <div className="text-xs md:text-sm font-medium text-muted-foreground mb-1">Größe:</div>
              <div className="flex flex-wrap gap-1">
                {variants.map((variant, index) => {
                  const size = extractSize(variant.name) || variant.unit
                  const isSelected = index === selectedVariantIndex
                  const isAvailable = variant.in_stock

                  return (
                    <button
                      key={variant.id}
                      onClick={() => onVariantChange(index)}
                      disabled={!isAvailable}
                      className={`
                        px-1.5 py-0.5 md:px-2 md:py-1 rounded text-xs md:text-sm font-medium transition-all
                        ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : isAvailable
                              ? "bg-muted hover:bg-muted/80"
                              : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed line-through"
                        }
                      `}
                    >
                      {size}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <p className="text-base text-muted-foreground line-clamp-1">{product.description}</p>

        <Button
          variant="link"
          size="sm"
          onClick={() => onSelect(product)}
          className="p-0 h-auto text-xs md:text-sm text-primary hover:text-primary/80 justify-start"
        >
          Mehr lesen →
        </Button>
      </CardContent>

      <CardFooter className="pt-0.5 p-1.5 md:p-3 md:pt-1 flex items-center justify-between gap-2">
        {/* Price */}
        <div>
          <div className="text-lg md:text-2xl font-bold text-primary">
            €{calculatePrice(product.price, product.category).toFixed(2).replace(".", ",")}
          </div>
          <div className="text-xs md:text-sm text-muted-foreground">pro {product.unit}</div>
        </div>

        <Button
          onClick={handleQuickAddToCart}
          size="sm"
          disabled={!canAddToCart}
          variant={canAddToCart ? "default" : "secondary"}
          className="shrink-0 h-7 md:h-8 px-2 md:px-3"
        >
          <Plus className="w-4 h-4 md:mr-1" />
          <span className="hidden md:inline">{canAddToCart ? "Warenkorb" : "Nicht verfügbar"}</span>
        </Button>
      </CardFooter>
    </Card>
  )
}
