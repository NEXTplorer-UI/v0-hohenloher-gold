"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, X, ChevronDown, ChevronUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { safeJson } from "@/lib/utils/safe-json"

export default function CustomerInput() {
  const [customerData, setCustomerData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    street: "",
    house_number: "",
    city: "",
    postal_code: "",
    favorite_categories: [] as string[],
    special_requests: "",
    customer_segment: "new" as "new" | "regular" | "premium" | "distributor",
  })

  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([])
  const [pickupLocations, setPickupLocations] = useState<
    Array<{ id: string; name: string; city: string; address: string }>
  >([])
  const [isLoadingData, setIsLoadingData] = useState(true)

  const [selectedCategory, setSelectedCategory] = useState("")

  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoriesRes, locationsRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/pickup-locations"),
        ])

        if (categoriesRes.ok) {
          const { categories: cats } = await categoriesRes.json()
          setCategories(cats)
        }

        if (locationsRes.ok) {
          const locs = await locationsRes.json()
          setPickupLocations(locs)
        }
      } catch (error) {
        console.error("[v0] Error loading data:", error)
      } finally {
        setIsLoadingData(false)
      }
    }

    loadData()
  }, [])

  const addCategory = (categoryName: string) => {
    if (categoryName && !customerData.favorite_categories.includes(categoryName)) {
      setCustomerData({
        ...customerData,
        favorite_categories: [...customerData.favorite_categories, categoryName],
      })
    }
  }

  const removeCategory = (categoryToRemove: string) => {
    setCustomerData({
      ...customerData,
      favorite_categories: customerData.favorite_categories.filter((cat) => cat !== categoryToRemove),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setSuccessMessage("")

    const fullName = `${customerData.first_name} ${customerData.last_name}`.trim()
    const submitData = {
      ...customerData,
      name: fullName,
    }

    console.log("[v0] Adding customer:", submitData)

    try {
      const response = await fetch("/api/add-customer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      const result = await safeJson(response)

      if (response.ok) {
        console.log("[v0] Customer added successfully:", result)
        setSuccessMessage(`Kunde "${fullName}" wurde erfolgreich hinzugefügt!`)

        setCustomerData({
          first_name: "",
          last_name: "",
          email: "",
          phone: "",
          street: "",
          house_number: "",
          city: "",
          postal_code: "",
          favorite_categories: [],
          special_requests: "",
          customer_segment: "new",
        })
        setSelectedCategory("")

        setTimeout(() => setSuccessMessage(""), 3000)
      } else {
        console.error("[v0] Error adding customer:", result)
        const errorMsg = result.error || result.message || "Unbekannter Fehler"
        alert(`Fehler beim Hinzufügen des Kunden: ${errorMsg}`)
      }
    } catch (error) {
      console.error("[v0] Network error:", error)
      const errorMsg = error instanceof Error ? error.message : "Netzwerkfehler"
      alert(`Fehler beim Hinzufügen des Kunden: ${errorMsg}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Neuen Kunden hinzufügen
              </div>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardTitle>
            <CardDescription>Erfassen Sie die Daten eines neuen Kunden</CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {successMessage && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                  {successMessage}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Vorname *</Label>
                  <Input
                    id="first_name"
                    value={customerData.first_name}
                    onChange={(e) => setCustomerData({ ...customerData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Nachname *</Label>
                  <Input
                    id="last_name"
                    value={customerData.last_name}
                    onChange={(e) => setCustomerData({ ...customerData, last_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerData.email}
                    onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={customerData.phone}
                    onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="street">Straße</Label>
                  <Input
                    id="street"
                    value={customerData.street}
                    onChange={(e) => setCustomerData({ ...customerData, street: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="house_number">Hausnummer</Label>
                  <Input
                    id="house_number"
                    value={customerData.house_number}
                    onChange={(e) => setCustomerData({ ...customerData, house_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Stadt</Label>
                  <Input
                    id="city"
                    value={customerData.city}
                    onChange={(e) => setCustomerData({ ...customerData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal_code">PLZ</Label>
                  <Input
                    id="postal_code"
                    value={customerData.postal_code}
                    onChange={(e) => setCustomerData({ ...customerData, postal_code: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="customer_segment">Kundensegment</Label>
                  <Select
                    value={customerData.customer_segment}
                    onValueChange={(value: any) => setCustomerData({ ...customerData, customer_segment: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Segment wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Neukunde</SelectItem>
                      <SelectItem value="regular">Stammkunde</SelectItem>
                      <SelectItem value="premium">Premium-Kunde</SelectItem>
                      <SelectItem value="distributor">Verteiler</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Kaufkategorien (aus Datenbank)</Label>
                  {isLoadingData ? (
                    <p className="text-sm text-muted-foreground">Lade Kategorien...</p>
                  ) : (
                    <Select
                      value={selectedCategory}
                      onValueChange={(value) => {
                        setSelectedCategory(value)
                        addCategory(value)
                        setSelectedCategory("")
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kategorie wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {customerData.favorite_categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {customerData.favorite_categories.map((cat) => (
                        <Badge key={cat} variant="secondary" className="flex items-center gap-1">
                          {cat}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => removeCategory(cat)} />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="special_requests">Besondere Wünsche / Notizen</Label>
                  <Input
                    id="special_requests"
                    value={customerData.special_requests}
                    onChange={(e) => setCustomerData({ ...customerData, special_requests: e.target.value })}
                    placeholder="Besondere Anforderungen oder Notizen..."
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Wird hinzugefügt..." : "Kunde hinzufügen"}
              </Button>
            </form>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
