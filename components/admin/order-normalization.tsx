"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Loader2, Sparkles, Save, MapPin } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"

interface Order {
  id: string
  order_number: string
  customer_id: string
  pickup_location: string
  pickup_location_normalized: string | null
  pickup_location_id: string | null
  distribution_person_id: string | null
  pickup_date: string
  notes: string | null
  status: string
  customers: {
    name: string
    email: string
  } | null
}

interface PickupLocation {
  id: string
  name: string
  address: string
}

interface DistributionPerson {
  id: string
  name: string
  phone: string | null
  email: string | null
}

interface AutoMatch {
  originalText: string
  matchedLocationId: string
  matchedLocationName: string
  matchedLocationAddress: string
  confidence: number
  orderIds: string[]
}

const fetcher = (url: string) => {
  console.log("[v0] [normalize-component] Fetching:", url)
  return fetch(url).then((res) => {
    console.log("[v0] [normalize-component] Response status:", res.status)
    return res.json()
  }).then((data) => {
    console.log("[v0] [normalize-component] Data received:", data)
    return data
  })
}

export default function OrderNormalization() {
  const { toast } = useToast()
  const [groupByLocation, setGroupByLocation] = useState(true)
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [autoMatches, setAutoMatches] = useState<AutoMatch[]>([])
  const [isAutoMatching, setIsAutoMatching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // State for each row's selections
  const [rowSelections, setRowSelections] = useState<Record<string, {
    locationId: string
    personId: string
  }>>({})

  const { data: ordersData, mutate: mutateOrders, isLoading: loadingOrders, error: ordersError } = useSWR<{ orders: Order[] }>(
    "/api/admin/orders/normalize",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  const { data: locationsData } = useSWR<{ locations: PickupLocation[] }>(
    "/api/admin/pickup-locations",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  const { data: personsData } = useSWR<{ persons: DistributionPerson[] }>(
    "/api/admin/distribution-persons",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  const { data: locationPersonsData } = useSWR<{ assignments: Array<{ location_id: string; person_id: string }> }>(
    "/api/admin/location-persons",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  const orders = ordersData?.orders || []
  const locations = Array.isArray(locationsData?.locations) ? locationsData.locations : []
  const persons = personsData?.persons || []
  const locationPersons = locationPersonsData?.assignments || []

  // Group orders by pickup_location text if grouping is enabled
  const groupedOrders = groupByLocation
    ? orders.reduce((acc, order) => {
        const key = order.pickup_location || "Unbekannt"
        if (!acc[key]) acc[key] = []
        acc[key].push(order)
        return acc
      }, {} as Record<string, Order[]>)
    : {}

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) {
      return <Badge className="bg-green-500">Hoch ({Math.round(confidence * 100)}%)</Badge>
    } else if (confidence >= 0.5) {
      return <Badge className="bg-yellow-500">Mittel ({Math.round(confidence * 100)}%)</Badge>
    } else {
      return <Badge className="bg-red-500">Niedrig ({Math.round(confidence * 100)}%)</Badge>
    }
  }

  const getAvailablePersonsForLocation = (locationId: string) => {
    const assignedPersonIds = locationPersons
      .filter((lp) => lp.location_id === locationId)
      .map((lp) => lp.person_id)
    
    return persons.filter((p) => assignedPersonIds.includes(p.id))
  }

  const handleAutoMatch = async () => {
    setIsAutoMatching(true)
    try {
      const response = await fetch("/api/admin/orders/auto-match", {
        method: "POST",
      })
      const data = await response.json()
      
      if (data.matches) {
        setAutoMatches(data.matches)
        
        // Pre-fill row selections with auto-matched values
        const newSelections: Record<string, { locationId: string; personId: string }> = {}
        data.matches.forEach((match: AutoMatch) => {
          const key = match.originalText
          newSelections[key] = {
            locationId: match.matchedLocationId,
            personId: "",
          }
          
          // Auto-select person if only one available
          const availablePersons = getAvailablePersonsForLocation(match.matchedLocationId)
          if (availablePersons.length === 1) {
            newSelections[key].personId = availablePersons[0].id
          }
        })
        setRowSelections({ ...rowSelections, ...newSelections })
        
        toast({
          title: "Auto-Matching abgeschlossen",
          description: `${data.matches.length} Zuordnungen gefunden`,
        })
      }
    } catch (error) {
      console.error("[auto-match] Error:", error)
      toast({
        title: "Fehler",
        description: "Auto-Matching fehlgeschlagen",
        variant: "destructive",
      })
    } finally {
      setIsAutoMatching(false)
    }
  }

  const handleSave = async (orderIds: string[], createMapping: boolean) => {
    const key = groupByLocation ? orders.find(o => orderIds.includes(o.id))?.pickup_location || "" : orderIds[0]
    const selection = rowSelections[key]
    
    if (!selection?.locationId) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie einen Abholort aus",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const location = locations.find(l => l.id === selection.locationId)
      const response = await fetch("/api/admin/orders/normalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderIds,
          normalizedLocation: location ? `${location.name}, ${location.address}` : null,
          pickupLocationId: selection.locationId,
          distributionPersonId: selection.personId || null,
          createMapping,
        }),
      })

      if (!response.ok) throw new Error("Failed to save")

      toast({
        title: "Erfolgreich gespeichert",
        description: `${orderIds.length} Bestellung(en) aktualisiert${createMapping ? " und Mapping erstellt" : ""}`,
      })

      // Refresh data and clear selection
      mutateOrders()
      setSelectedOrders(new Set())
    } catch (error) {
      console.error("[save] Error:", error)
      toast({
        title: "Fehler",
        description: "Speichern fehlgeschlagen",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleBulkSave = async (createMapping: boolean) => {
    if (selectedOrders.size === 0) {
      toast({
        title: "Keine Auswahl",
        description: "Bitte wählen Sie mindestens eine Bestellung aus",
        variant: "destructive",
      })
      return
    }

    await handleSave(Array.from(selectedOrders), createMapping)
  }

  const toggleOrderSelection = (orderId: string) => {
    const newSelected = new Set(selectedOrders)
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId)
    } else {
      newSelected.add(orderId)
    }
    setSelectedOrders(newSelected)
  }

  const toggleGroupSelection = (orderIds: string[]) => {
    const newSelected = new Set(selectedOrders)
    const allSelected = orderIds.every(id => newSelected.has(id))
    
    if (allSelected) {
      orderIds.forEach(id => newSelected.delete(id))
    } else {
      orderIds.forEach(id => newSelected.add(id))
    }
    setSelectedOrders(newSelected)
  }

  const updateRowSelection = (key: string, field: "locationId" | "personId", value: string) => {
    setRowSelections({
      ...rowSelections,
      [key]: {
        ...rowSelections[key],
        [field]: value,
      },
    })
    
    // Auto-select person if only one available and location was just selected
    if (field === "locationId") {
      const availablePersons = getAvailablePersonsForLocation(value)
      if (availablePersons.length === 1) {
        setRowSelections(prev => ({
          ...prev,
          [key]: {
            ...prev[key],
            locationId: value,
            personId: availablePersons[0].id,
          },
        }))
      }
    }
  }

  useEffect(() => {
    console.log("[v0] [normalize-component] Orders data:", ordersData)
    console.log("[v0] [normalize-component] Loading:", loadingOrders)
    console.log("[v0] [normalize-component] Error:", ordersError)
  }, [ordersData, loadingOrders, ordersError])

  useEffect(() => {
    console.log("[v0] [normalize-component] Processed orders count:", orders.length)
  }, [orders])

  if (loadingOrders) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bestellungen normalisieren</CardTitle>
          <CardDescription>
            Weisen Sie Abholorte und Verteilpersonen zu Bestellungen zu
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="group-toggle"
                  checked={groupByLocation}
                  onCheckedChange={setGroupByLocation}
                />
                <Label htmlFor="group-toggle">Gleiche Abholorte gruppieren</Label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoMatch}
                disabled={isAutoMatching || orders.length === 0}
              >
                {isAutoMatching ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Auto-Matching
              </Button>
            </div>
            {selectedOrders.size > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkSave(false)}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {selectedOrders.size} Speichern
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleBulkSave(true)}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <MapPin className="h-4 w-4 mr-2" />
                  )}
                  {selectedOrders.size} Speichern & Mapping
                </Button>
              </div>
            )}
          </div>

          {/* Orders List */}
          <div className="space-y-2">
            {orders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Keine Bestellungen zur Normalisierung verfügbar
              </p>
            ) : groupByLocation ? (
              // Grouped view
              Object.entries(groupedOrders).map(([pickupText, groupOrders]) => {
                const key = pickupText
                const autoMatch = autoMatches.find(m => m.originalText === pickupText)
                const selection = rowSelections[key] || { locationId: "", personId: "" }
                const availablePersons = selection.locationId ? getAvailablePersonsForLocation(selection.locationId) : []
                const allOrderIds = groupOrders.map(o => o.id)
                const allSelected = allOrderIds.every(id => selectedOrders.has(id))

                return (
                  <Card key={key} className="p-4">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={() => toggleGroupSelection(allOrderIds)}
                      />
                      <div className="flex-1 grid grid-cols-5 gap-4 items-center">
                        <div>
                          <p className="font-medium">{pickupText}</p>
                          <p className="text-sm text-muted-foreground">
                            {groupOrders.length} Bestellung(en)
                          </p>
                          {autoMatch && getConfidenceBadge(autoMatch.confidence)}
                        </div>
                        <div>
                          <Label className="text-xs">Abholort</Label>
                          <Select
                            value={selection.locationId}
                            onValueChange={(value) => updateRowSelection(key, "locationId", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Wählen..." />
                            </SelectTrigger>
                            <SelectContent>
                              {locations.map((loc) => (
                                <SelectItem key={loc.id} value={loc.id}>
                                  {loc.name} - {loc.address}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Verteilperson</Label>
                          <Select
                            value={selection.personId}
                            onValueChange={(value) => updateRowSelection(key, "personId", value)}
                            disabled={!selection.locationId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Optional..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Keine</SelectItem>
                              {availablePersons.map((person) => (
                                <SelectItem key={person.id} value={person.id}>
                                  {person.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSave(allOrderIds, false)}
                            disabled={!selection.locationId || isSaving}
                          >
                            Speichern
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleSave(allOrderIds, true)}
                            disabled={!selection.locationId || isSaving}
                          >
                            Speichern & Mapping
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })
            ) : (
              // Ungrouped view
              orders.map((order) => {
                const key = order.id
                const selection = rowSelections[key] || { locationId: "", personId: "" }
                const availablePersons = selection.locationId ? getAvailablePersonsForLocation(selection.locationId) : []

                return (
                  <Card key={order.id} className="p-4">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedOrders.has(order.id)}
                        onCheckedChange={() => toggleOrderSelection(order.id)}
                      />
                      <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                        <div>
                          <p className="font-medium">{order.order_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.customers?.name || "Unbekannt"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm">{order.pickup_location}</p>
                          {order.notes && (
                            <p className="text-xs text-muted-foreground truncate">{order.notes}</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs">Abholort</Label>
                          <Select
                            value={selection.locationId}
                            onValueChange={(value) => updateRowSelection(key, "locationId", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Wählen..." />
                            </SelectTrigger>
                            <SelectContent>
                              {locations.map((loc) => (
                                <SelectItem key={loc.id} value={loc.id}>
                                  {loc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Verteilperson</Label>
                          <Select
                            value={selection.personId}
                            onValueChange={(value) => updateRowSelection(key, "personId", value)}
                            disabled={!selection.locationId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Optional..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Keine</SelectItem>
                              {availablePersons.map((person) => (
                                <SelectItem key={person.id} value={person.id}>
                                  {person.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSave([order.id], false)}
                            disabled={!selection.locationId || isSaving}
                          >
                            Speichern
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleSave([order.id], true)}
                            disabled={!selection.locationId || isSaving}
                          >
                            Mapping
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
