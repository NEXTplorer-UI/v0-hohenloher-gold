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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader2, Sparkles, Save, MapPin, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react'
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

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function OrderNormalization() {
  const { toast } = useToast()
  const [groupByLocation, setGroupByLocation] = useState(true)
  const [includeIgnored, setIncludeIgnored] = useState(false)
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [autoMatches, setAutoMatches] = useState<AutoMatch[]>([])
  const [isAutoMatching, setIsAutoMatching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50)
  
  const [saveAsDefault, setSaveAsDefault] = useState<Record<string, boolean>>({})
  const [createMapping, setCreateMapping] = useState<Record<string, boolean>>({})
  
  const [rowSelections, setRowSelections] = useState<Record<string, {
    locationId: string
    personId: string
  }>>({})

  const { data: ordersData, mutate: mutateOrders, isLoading: loadingOrders, error: ordersError } = useSWR<{ orders: Order[] }>(
    `/api/admin/orders/normalize?includeIgnored=${includeIgnored}`,
    fetcher,
    { 
      revalidateOnFocus: false, 
      dedupingInterval: 60000,
      onSuccess: (data) => {
        console.log("[v0] [normalize-component] Orders loaded:", data?.orders?.length || 0)
      },
      onError: (error) => {
        console.error("[v0] [normalize-component] Error loading orders:", error)
      }
    }
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

  const { data: locationPersonsData } = useSWR<{ assignments: Array<{ pickup_location_id: string; person_id: string }> }>(
    "/api/admin/location-persons",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  const orders = ordersData?.orders || []
  const locations = Array.isArray(locationsData?.locations) ? locationsData.locations : []
  const persons = personsData?.persons || []
  const locationPersons = locationPersonsData?.assignments || []

  const groupedOrders = groupByLocation
    ? orders.reduce((acc, order) => {
        const key = order.pickup_location || "Unbekannt"
        if (!acc[key]) acc[key] = []
        acc[key].push(order)
        return acc
      }, {} as Record<string, Order[]>)
    : {}

  const totalPages = groupByLocation 
    ? Math.ceil(Object.keys(groupedOrders).length / itemsPerPage)
    : Math.ceil(orders.length / itemsPerPage)
  
  const paginatedGroupedOrders = groupByLocation
    ? Object.entries(groupedOrders).slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      )
    : []
  
  const paginatedOrders = !groupByLocation
    ? orders.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      )
    : []

  useEffect(() => {
    setCurrentPage(1)
  }, [groupByLocation, includeIgnored])

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
    console.log("[v0] [getAvailablePersons] Location ID:", locationId)
    console.log("[v0] [getAvailablePersons] Returning all persons:", persons.length)
    // Return all persons - location filtering removed for flexibility
    return persons
  }

  const getPickupLocationFromPerson = (personId: string): string | null => {
    const assignment = locationPersons.find(lp => lp.person_id === personId)
    if (assignment) {
      return assignment.pickup_location_id
    }
    return null
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
        
        const newSelections: Record<string, { locationId: string; personId: string }> = {}
        data.matches.forEach((match: AutoMatch) => {
          const key = match.originalText
          newSelections[key] = {
            locationId: match.matchedLocationId,
            personId: "",
          }
          
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

  const handleSave = async (orderIds: string[], key: string) => {
    const selection = rowSelections[key]
    
    if (!selection?.personId && !selection?.locationId) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie mindestens eine Verteilperson oder einen Abholort aus",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      let finalLocationId = selection.locationId
      
      if (selection.personId && !selection.locationId) {
        const derivedLocationId = getPickupLocationFromPerson(selection.personId)
        if (derivedLocationId) {
          finalLocationId = derivedLocationId
          console.log("[v0] Derived location from person:", derivedLocationId)
        }
      }

      const location = locations.find(l => l.id === finalLocationId)
      const response = await fetch("/api/admin/orders/normalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderIds,
          normalizedLocation: location ? `${location.name}, ${location.address}` : null,
          pickupLocationId: finalLocationId,
          distributionPersonId: selection.personId || null,
          createMapping: createMapping[key] || false,
          saveAsCustomerDefault: saveAsDefault[key] !== false, // Default: true
        }),
      })

      if (!response.ok) throw new Error("Failed to save")

      const createMappingText = createMapping[key] ? " und Schreibvarianten-Mapping erstellt" : ""
      const saveDefaultText = saveAsDefault[key] !== false ? " (als Kundenstandard gespeichert)" : ""

      toast({
        title: "Erfolgreich gespeichert",
        description: `${orderIds.length} Bestellung(en) aktualisiert${createMappingText}${saveDefaultText}`,
      })

      mutateOrders()
      setSelectedOrders(new Set())
      
      setSaveAsDefault(prev => ({ ...prev, [key]: true }))
      setCreateMapping(prev => ({ ...prev, [key]: false }))
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

  const handleBulkSave = async () => {
    if (selectedOrders.size === 0) {
      toast({
        title: "Keine Auswahl",
        description: "Bitte wählen Sie mindestens eine Bestellung aus",
        variant: "destructive",
      })
      return
    }

    const key = Array.from(selectedOrders)[0]
    await handleSave(Array.from(selectedOrders), key)
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
    console.log("[v0] [updateRowSelection] Key:", key, "Field:", field, "Value:", value)
    
    setRowSelections({
      ...rowSelections,
      [key]: {
        ...rowSelections[key],
        [field]: value,
      },
    })
    
    if (field === "personId" && value) {
      const derivedLocationId = getPickupLocationFromPerson(value)
      if (derivedLocationId) {
        console.log("[v0] [updateRowSelection] Auto-filling location from person:", derivedLocationId)
        setRowSelections(prev => ({
          ...prev,
          [key]: {
            ...prev[key],
            personId: value,
            locationId: derivedLocationId,
          },
        }))
      }
    }
    
    if (!saveAsDefault.hasOwnProperty(key)) {
      setSaveAsDefault(prev => ({ ...prev, [key]: true })) // Default: ON
      setCreateMapping(prev => ({ ...prev, [key]: false })) // Default: OFF
    }
  }

  if (loadingOrders) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-muted-foreground">Lade Bestellungen...</span>
      </div>
    )
  }

  if (ordersError) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-destructive">
            <p className="font-medium">Fehler beim Laden der Bestellungen</p>
            <p className="text-sm text-muted-foreground mt-2">{ordersError.message}</p>
            <Button onClick={() => mutateOrders()} className="mt-4" variant="outline">
              Erneut versuchen
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bestellungen normalisieren</CardTitle>
          <CardDescription>
            Weisen Sie Abholorte und Verteilpersonen zu Bestellungen zu
            {orders.length > 0 && ` (${orders.length} Bestellungen gefunden)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              <div className="flex items-center space-x-2">
                <Switch
                  id="ignore-toggle"
                  checked={includeIgnored}
                  onCheckedChange={setIncludeIgnored}
                />
                <Label htmlFor="ignore-toggle">Ignorierte Bestellungen anzeigen</Label>
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
                  variant="default"
                  size="sm"
                  onClick={() => handleBulkSave()}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {selectedOrders.size} Speichern
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {orders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Keine Bestellungen zur Normalisierung verfügbar
              </p>
            ) : groupByLocation ? (
              <>
                {paginatedGroupedOrders.map(([pickupText, groupOrders]) => {
                  const key = pickupText
                  const autoMatch = autoMatches.find(m => m.originalText === pickupText)
                  const selection = rowSelections[key] || { locationId: "", personId: "" }
                  const availablePersons = persons
                  const allOrderIds = groupOrders.map(o => o.id)
                  const allSelected = allOrderIds.every(id => selectedOrders.has(id))

                  return (
                    <Card key={key} className="p-4">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={() => toggleGroupSelection(allOrderIds)}
                        />
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-5 gap-4 items-center">
                            <div>
                              <p className="font-medium">{pickupText}</p>
                              <p className="text-sm text-muted-foreground">
                                {groupOrders.length} Bestellung(en)
                              </p>
                              {autoMatch && getConfidenceBadge(autoMatch.confidence)}
                            </div>
                            <div>
                              <Label className="text-xs">Verteilperson</Label>
                              <Select
                                value={selection.personId}
                                onValueChange={(value) => updateRowSelection(key, "personId", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Wählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {availablePersons.map((person) => (
                                    <SelectItem key={person.id} value={person.id}>
                                      {person.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Abholort (optional)</Label>
                              <Select
                                value={selection.locationId}
                                onValueChange={(value) => updateRowSelection(key, "locationId", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Auto..." />
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
                            <div className="col-span-2 space-y-2">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`save-default-${key}`}
                                  checked={saveAsDefault[key] !== false}
                                  onCheckedChange={(checked) => setSaveAsDefault(prev => ({ ...prev, [key]: !!checked }))}
                                />
                                <Label htmlFor={`save-default-${key}`} className="text-sm cursor-pointer">
                                  Als Standard für Kunden speichern
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`create-mapping-${key}`}
                                  checked={createMapping[key] || false}
                                  onCheckedChange={(checked) => setCreateMapping(prev => ({ ...prev, [key]: !!checked }))}
                                />
                                <Label htmlFor={`create-mapping-${key}`} className="text-sm cursor-pointer">
                                  Schreibvariante als Mapping speichern
                                </Label>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleSave(allOrderIds, key)}
                              disabled={(!selection.locationId && !selection.personId) || isSaving}
                            >
                              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                              Speichern
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </>
            ) : (
              <>
                {paginatedOrders.map((order) => {
                  const key = order.id
                  const selection = rowSelections[key] || { locationId: "", personId: "" }
                  const availablePersons = persons

                  return (
                    <Card key={order.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={selectedOrders.has(order.id)}
                          onCheckedChange={() => toggleOrderSelection(order.id)}
                        />
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-6 gap-4 items-center">
                            <div>
                              <p className="font-medium">{order.order_number}</p>
                              <p className="text-sm text-muted-foreground">
                                {order.customers?.name || "Unbekannt"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm">{order.pickup_location}</p>
                            </div>
                            <div>
                              {order.notes ? (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 gap-2">
                                      <MessageSquare className="h-4 w-4" />
                                      Kommentar
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-md">
                                    <DialogHeader>
                                      <DialogTitle>Bestellkommentar</DialogTitle>
                                      <DialogDescription>
                                        Bestellung {order.order_number}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4">
                                      <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              ) : (
                                <span className="text-xs text-muted-foreground">Kein Kommentar</span>
                              )}
                            </div>
                            <div>
                              <Label className="text-xs">Verteilperson</Label>
                              <Select
                                value={selection.personId}
                                onValueChange={(value) => updateRowSelection(key, "personId", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Wählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {availablePersons.map((person) => (
                                    <SelectItem key={person.id} value={person.id}>
                                      {person.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Abholort (optional)</Label>
                              <Select
                                value={selection.locationId}
                                onValueChange={(value) => updateRowSelection(key, "locationId", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Auto..." />
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
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`save-default-${key}`}
                                  checked={saveAsDefault[key] !== false}
                                  onCheckedChange={(checked) => setSaveAsDefault(prev => ({ ...prev, [key]: !!checked }))}
                                />
                                <Label htmlFor={`save-default-${key}`} className="text-xs cursor-pointer">
                                  Als Standard
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`create-mapping-${key}`}
                                  checked={createMapping[key] || false}
                                  onCheckedChange={(checked) => setCreateMapping(prev => ({ ...prev, [key]: !!checked }))}
                                />
                                <Label htmlFor={`create-mapping-${key}`} className="text-xs cursor-pointer">
                                  Mapping
                                </Label>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleSave([order.id], key)}
                              disabled={(!selection.locationId && !selection.personId) || isSaving}
                            >
                              Speichern
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Seite {currentPage} von {totalPages} ({orders.length} Bestellungen insgesamt)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Zurück
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Weiter
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
