"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Calendar, Download, Clock, Minus, CheckCircle, ArrowUpDown } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { useState, useMemo, useEffect } from "react"
import { NextArrivalBanner } from "@/components/next-arrival-banner"
import { usePricing } from "@/components/pricing-context"
import useSWR from "swr"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input" // Import Input component
import { formatTime } from "@/lib/format-time"

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    <span className="ml-2">Lädt...</span>
  </div>
)

const NEXT_PICKUP_DATE = "15. Januar 2025"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const downloadCalendarEvent = () => {
  const eventDate = new Date(NEXT_PICKUP_DATE.split(".").reverse().join("-"))
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
      const eventDate = new Date(delivery.date.split(".").reverse().join("-"))
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
    // If there's an availability message from the API, use it
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
      if (product.availability_message.includes("Bestellschluss vorbei")) {
        return {
          status: "deadline-passed",
          label: "Bestellschluss vorbei",
          color: "bg-orange-500",
        }
      }
      if (
        product.availability_message.includes("Keine Liefertermine") ||
        product.availability_message.includes("nicht verfügbar")
      ) {
        return { status: "out-of-stock", label: "Saison beendet", color: "bg-red-500" }
      }
      // If there's stock, show it
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

const AddToCartButton = ({ product }: { product: any }) => {
  const { addToCart, checkWeightLimit } = useCart()
  const [quantity, setQuantity] = useState(1)
  const { pricingMode, calculatePrice } = usePricing()

  const handleAddToCart = () => {
    console.log("[v0] Adding to cart:", {
      name: product.name,
      weight_kg: product.weight_kg,
      quantity: quantity,
      totalWeight: (product.weight_kg || 1.0) * quantity,
    })
    addToCart(product, quantity)
    setQuantity(1)
  }

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          disabled={quantity <= 1}
          className="h-10 w-10"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value) || 1))}
          className="h-10 w-16 text-center"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={() => setQuantity(quantity + 1)}
          disabled={product.limitPerPerson && quantity >= product.limitPerPerson}
          className="h-10 w-10"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <Button onClick={handleAddToCart} className="flex-1 h-10">
        <Plus className="h-4 w-4 mr-2" />
        {quantity > 1 ? `${quantity}x ` : ""}In den Warenkorb
      </Button>
    </div>
  )
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
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("alle")
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [selectedSizes, setSelectedSizes] = useState<Map<string, number>>(new Map())
  const [sortBy, setSortBy] = useState<SortOption>("name-asc")
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false)
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
  }, [cart?.items, mutate])

  const {
    data: deliverySchedules,
    error: schedulesError,
    isLoading: schedulesLoading,
  } = useSWR("/api/delivery-schedules", fetcher)

  const allProducts = useMemo(() => {
    if (loading || error || !dbProducts) return []
    return dbProducts
  }, [dbProducts, loading, error])

  const filteredProducts = useMemo(() => {
    let filtered =
      selectedCategory === "alle" ? allProducts : allProducts.filter((product) => product.category === selectedCategory)

    // Apply availability filter
    if (showOnlyAvailable) {
      filtered = filtered.filter((product) => {
        const availability = getProductStatus(product)
        return product.in_stock && availability.status !== "out-of-stock" && availability.status !== "deadline-passed"
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
      const isUnavailable =
        !currentVariant.in_stock || availability.status === "out-of-stock" || availability.status === "deadline-passed"

      if (isUnavailable) {
        // Find first available variant
        const firstAvailableIndex = variants.findIndex((v) => {
          const vAvailability = getProductStatus(v)
          return v.in_stock && vAvailability.status !== "out-of-stock" && vAvailability.status !== "deadline-passed"
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

      <section id="seasonal-overview" className="py-12 border-b text-primary bg-sidebar-accent-foreground">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="p-6 bg-accent/10 border border-accent/20 rounded-lg">
              <div className="flex items-start space-x-3 mb-4">
                <Calendar className="w-6 h-6 text-primary mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-primary mb-2 text-xl">Südfrüchte Saison 2025</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Frische Südfrüchte sind Saisonware und nur zu bestimmten Terminen verfügbar.
                    <strong> Bestellschluss ist jeweils 14 Tage vor dem Liefertermin. </strong>
                    Bestellungen nach Bestellschluss werden automatisch dem nächsten verfügbaren Termin zugeordnet.
                  </p>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-primary mb-3 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Bestätigte Termine
                      </h4>
                      <div className="space-y-2">
                        {deliverySchedules
                          ?.filter((d: any) => d.status === "confirmed")
                          .map((delivery: any, index) => (
                            <div key={index} className="p-3 bg-primary/10 rounded border">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-medium">{delivery.date}</span>
                                {delivery.notes && (
                                  <span className="text-primary text-sm mx-60 px-0">{delivery.notes}</span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium">Bestellschluss:</span> {delivery.orderDeadline}
                              </div>
                              {delivery.pickupStartTime && delivery.pickupEndTime && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  <span className="font-medium">Abholung:</span> {formatTime(delivery.pickupStartTime)}{" "}
                                  - {formatTime(delivery.pickupEndTime)} Uhr
                                  <br />
                                  <span className="text-xs italic">oder nach Terminvereinbarung</span>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gold mb-3 flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        Geplante Termine
                      </h4>
                      <div className="space-y-2">
                        {deliverySchedules
                          ?.filter((d: any) => d.status === "planned")
                          .map((delivery: any, index) => (
                            <div key={index} className="p-3 bg-gold/10 rounded border">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-medium">{delivery.date}</span>
                                {delivery.notes && <span className="text-gold text-sm">{delivery.notes}</span>}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium">Bestellschluss:</span> {delivery.orderDeadline}
                              </div>
                              {delivery.pickupStartTime && delivery.pickupEndTime && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  <span className="font-medium">Abholung:</span> {formatTime(delivery.pickupStartTime)}{" "}
                                  - {formatTime(delivery.pickupEndTime)} Uhr
                                  <br />
                                  <span className="text-xs italic">oder nach Terminvereinbarung</span>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-accent/20">
                    <Button variant="secondary" size="sm" onClick={downloadCalendarEvent} className="flex items-center">
                      <Download className="w-4 h-4 mr-2" />
                      Nächsten Termin speichern
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadSeasonCalendar(deliverySchedules || [])}
                      className="flex items-center bg-transparent"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Ganze Saison exportieren
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-background border-2 border-primary/20 rounded-xl shadow-2xl p-4">
          <div className="text-center mb-3">
            <h3 className="text-sm font-semibold text-primary mb-1">Preise für:</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPricingMode("pickup")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                pricingMode === "pickup"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              🚗 Abholung
            </button>
            <button
              onClick={() => setPricingMode("shipping")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                pricingMode === "shipping"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              📦 Versand
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-4">Unser Shop</h1>
          <p className="text-lg text-muted-foreground">
            Entdecken Sie unsere Auswahl an frischen Südfrüchten, Trockenfrüchten und Produkten.
          </p>
        </div>

        <div className="mb-8 space-y-4">
          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? "bg-gold text-gold-foreground hover:bg-gold-hover"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                }`}
              >
                {category === "alle" ? "Alle Produkte" : category}
              </button>
            ))}
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

        <section className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
        <DialogContent
          className="w-[90vw] h-[85vh] md:w-[70vw] md:h-[70vh] lg:w-[55vw] lg:h-[60vh] max-w-none overflow-y-auto"
          style={{
            width: "90vw",
            height: "85vh",
            maxWidth: "none",
          }}
        >
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-primary">{selectedProduct.name}</DialogTitle>
                <DialogDescription>
                  Detaillierte Produktinformationen und Bestellmöglichkeiten für {selectedProduct.name}
                </DialogDescription>
              </DialogHeader>

              <div className="grid md:grid-cols-2 gap-6 mt-4">
                {/* Product image */}
                <div className="aspect-square rounded-lg overflow-hidden bg-secondary">
                  <img
                    src={selectedProduct.image_url || selectedProduct.images?.[0] || "/placeholder.svg"}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Product details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{selectedProduct.category}</Badge>
                    {selectedProduct.organic && <Badge variant="outline">Bio</Badge>}
                  </div>

                  <p className="text-muted-foreground">{selectedProduct.description}</p>

                  {selectedProduct.fullDescription && (
                    <div
                      className="text-sm text-muted-foreground prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedProduct.fullDescription }}
                    />
                  )}

                  {/* Product info grid */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <span className="text-sm text-muted-foreground">Preis:</span>
                      <p className="text-2xl font-bold text-primary">€{calculatePrice(selectedProduct.price)}</p>
                      <p className="text-xs text-muted-foreground">pro {selectedProduct.unit}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Herkunft:</span>
                      <p className="font-medium">{selectedProduct.origin}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Gewicht:</span>
                      <p className="font-medium">{selectedProduct.weight_kg} kg</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Einheit:</span>
                      <p className="font-medium">{selectedProduct.unit}</p>
                    </div>
                  </div>

                  {/* Add to cart */}
                  <div className="pt-4">
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
  calculatePrice: (price: string) => string
}) {
  const { addToCart, cart } = useCart()

  const cartQuantity = !cart?.items
    ? 0
    : cart.items.filter((item) => item.id === product.id).reduce((sum, item) => sum + item.quantity, 0)

  const availability = getProductStatus(product, cartQuantity)

  const handleQuickAddToCart = () => {
    addToCart(product, 1)
  }

  const canAddToCart =
    product.in_stock && availability.status !== "out-of-stock" && availability.status !== "deadline-passed"

  const imageUrl = product.image_url || product.images?.[0] || "/images/banana-chips-placeholder.jpg"

  // Log products without images to help debug
  if (!product.image_url && (!product.images || product.images.length === 0)) {
    console.log("[v0] Product without image:", {
      name: product.name,
      image_url: product.image_url,
      images: product.images,
      fallbackUsed: imageUrl,
    })
  }

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow bg-accent/10 border border-accent/20">
      <CardHeader className="pb-2">
        {/* Product image */}
        <div
          className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden cursor-pointer"
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

        {/* Product title */}
        <CardTitle className="text-lg mb-2 line-clamp-2">{product.name}</CardTitle>

        <div className="flex items-center space-x-1 h-5">
          <div className={`w-2 h-2 rounded-full ${availability.color}`}></div>
          <span className="text-xs text-muted-foreground">{availability.label}</span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-2 flex flex-col">
        {/* Size variants */}
        <div className="min-h-[2.5rem]">
          {variants && variants.length > 1 && onVariantChange && (
            <>
              <div className="text-xs font-medium text-muted-foreground mb-1">Größe:</div>
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
                        px-2 py-1 rounded text-xs font-medium transition-all
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

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>

        <Button
          variant="link"
          size="sm"
          onClick={() => onSelect(product)}
          className="p-0 h-auto text-xs text-primary hover:text-primary/80 justify-start"
        >
          Mehr lesen →
        </Button>

        {/* Flex-1 spacer to push footer to bottom */}
        <div className="flex-1" />
      </CardContent>

      <CardFooter className="pt-2 flex items-center justify-between gap-2">
        {/* Price */}
        <div>
          <div className="text-xl font-bold text-primary">€{calculatePrice(product.price)}</div>
          <div className="text-xs text-muted-foreground">
            {(() => {
              const unitText = `pro ${product.unit}`
              const parenIndex = unitText.indexOf("(")
              if (parenIndex === -1) {
                return unitText
              }
              const beforeParen = unitText.substring(0, parenIndex).trim()
              const afterParen = unitText.substring(parenIndex).trim()
              return (
                <>
                  <div>{beforeParen}</div>
                  <div>{afterParen}</div>
                </>
              )
            })()}
          </div>
        </div>

        {/* Button */}
        <Button
          onClick={handleQuickAddToCart}
          size="sm"
          disabled={!canAddToCart}
          variant={canAddToCart ? "default" : "secondary"}
          className="shrink-0"
        >
          <Plus className="w-4 h-4 mr-1" />
          {canAddToCart ? "Warenkorb" : "Nicht verfügbar"}
        </Button>
      </CardFooter>
    </Card>
  )
}
