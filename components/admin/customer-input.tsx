"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, X, ChevronDown, ChevronUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

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
    tags: [] as string[],
    pickupLocation: "",
    notes: "",
  })

  const [selectedPurchaseCategory, setSelectedPurchaseCategory] = useState("")
  const [selectedPickupLocation, setSelectedPickupLocation] = useState("")

  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const [isOpen, setIsOpen] = useState(false)

  const [availableTags, setAvailableTags] = useState<string[]>([
    "Südfrüchte-Käufer",
    "Trockenfrüchte-Käufer",
    "Spezialitäten-Käufer",
    "Regional-Käufer",
    "Gemischt",
    "Abholung-Stuttgart",
    "Abholung-Heilbronn",
    "Abholung-Schwäbisch Hall",
    "Verteiler-Stuttgart",
    "Verteiler-Heilbronn",
    "Verteiler-Schwäbisch Hall",
  ])
  const [newTag, setNewTag] = useState("")

  const purchaseCategories = [
    "Südfrüchte-Käufer",
    "Trockenfrüchte-Käufer",
    "Spezialitäten-Käufer",
    "Regional-Käufer",
    "Gemischt",
  ]

  const pickupLocations = [
    "Abholung-Stuttgart",
    "Abholung-Heilbronn",
    "Abholung-Schwäbisch Hall",
    "Verteiler-Stuttgart",
    "Verteiler-Heilbronn",
    "Verteiler-Schwäbisch Hall",
  ]

  const addTag = (tag: string) => {
    if (tag && !customerData.tags.includes(tag)) {
      setCustomerData({ ...customerData, tags: [...customerData.tags, tag] })
    }
  }

  const removeTag = (tagToRemove: string) => {
    setCustomerData({
      ...customerData,
      tags: customerData.tags.filter((tag) => tag !== tagToRemove),
    })
  }

  const addCustomTag = () => {
    if (newTag.trim() && !availableTags.includes(newTag.trim())) {
      setAvailableTags([...availableTags, newTag.trim()])
      setNewTag("")
    }
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

      const result = await response.json()

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
          tags: [],
          pickupLocation: "",
          notes: "",
        })
        setSelectedPurchaseCategory("")
        setSelectedPickupLocation("")

        setTimeout(() => setSuccessMessage(""), 3000)
      } else {
        console.error("[v0] Error adding customer:", result)
        alert(`Fehler beim Hinzufügen des Kunden: ${result.error}`)
      }
    } catch (error) {
      console.error("[v0] Network error:", error)
      alert("Netzwerkfehler beim Hinzufügen des Kunden")
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
                  <Label>Tags verwalten</Label>
                  <div className="space-y-2">
                    <Select
                      value={selectedPurchaseCategory}
                      onValueChange={(value) => {
                        setSelectedPurchaseCategory(value)
                        addTag(value)
                        setSelectedPurchaseCategory("")
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kaufkategorie wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {purchaseCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={selectedPickupLocation}
                      onValueChange={(value) => {
                        setSelectedPickupLocation(value)
                        addTag(value)
                        setSelectedPickupLocation("")
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Abholort wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {pickupLocations.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select onValueChange={addTag}>
                      <SelectTrigger>
                        <SelectValue placeholder="Verfügbare Tags auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTags
                          .filter((tag) => !customerData.tags.includes(tag))
                          .map((tag) => (
                            <SelectItem key={tag} value={tag}>
                              {tag}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Neuen Tag erstellen:</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Neuen Tag eingeben..."
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addCustomTag()
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={addCustomTag}
                        disabled={!newTag.trim() || availableTags.includes(newTag.trim())}
                      >
                        Hinzufügen
                      </Button>
                    </div>
                  </div>

                  {customerData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {customerData.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Alle verfügbaren Tags:</Label>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-2 border rounded-md bg-gray-50">
                      {availableTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className={`text-xs cursor-pointer hover:bg-blue-100 ${
                            customerData.tags.includes(tag) ? "bg-blue-200" : ""
                          }`}
                          onClick={() => addTag(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
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
