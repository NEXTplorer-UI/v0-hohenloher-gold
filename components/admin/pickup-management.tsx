"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { MapPin, Plus, Edit, Trash2, Clock, Mail, Info, LinkIcon, MessageSquare, User } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import useSWR from "swr"

interface PickupLocation {
  id: string
  name: string
  address: string
  postal_code: string
  city: string
  contact_person: string | null
  contact_phone: string | null
  email: string | null
  pickup_hours_start: string | null
  pickup_hours_end: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  route_id?: string | null
  route_name?: string | null
}

interface PickupLocationMapping {
  id: string
  variant: string
  canonical_location_id: string
  canonical_location?: {
    id: string
    name: string
    address: string
    city: string
  }
}

interface UnmappedVariant {
  variant: string
  count: number
  notes?: string[]
  suggestion?: {
    locationId: string
    locationName: string
    confidence: number
  }
}

interface IndividualOrderEntry {
  orderId: string
  pickupLocation: string
  comment: string | null
  orderNumber: string
}

interface DistributionPerson {
  id: string
  name: string
  phone: string | null
  email: string | null
  is_active: boolean
}

interface LocationPerson {
  id: string
  pickup_location_id: string
  person_id: string
  is_primary: boolean
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`)
  }
  const data = await res.json()
  return data
}

export default function PickupLocationManagement() {
  const [locations, setLocations] = useState<PickupLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<PickupLocation | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    postal_code: "",
    city: "",
    contact_person: "",
    contact_phone: "",
    email: "",
    pickup_hours_start: "",
    pickup_hours_end: "",
    notes: "",
  })
  const [mappings, setMappings] = useState<PickupLocationMapping[]>([])
  const [unmappedVariants, setUnmappedVariants] = useState<UnmappedVariant[]>([])
  const [loadingMappings, setLoadingMappings] = useState(false)
  const [selectedMappings, setSelectedMappings] = useState<Record<string, string>>({})
  const [applyToExisting, setApplyToExisting] = useState(true)
  const [isBatchNormalizing, setIsBatchNormalizing] = useState(false)
  const [isGrouped, setIsGrouped] = useState(true) // Added grouping toggle state
  const [individualOrders, setIndividualOrders] = useState<IndividualOrderEntry[]>([])
  const [selectedPickupMappings, setSelectedPickupMappings] = useState<Record<string, string>>({})
  const [selectedCommentMappings, setSelectedCommentMappings] = useState<Record<string, string>>({})
  const { toast } = useToast()

  const [selectedPersonsForLocation, setSelectedPersonsForLocation] = useState<Record<string, boolean>>({})
  const [primaryPerson, setPrimaryPerson] = useState<string | null>(null)
  const [loadingPersons, setLoadingPersons] = useState(false)

  const [selectedDistributionPersons, setSelectedDistributionPersons] = useState<Record<string, string>>({})
  const [distributionPersonsForLocation, setDistributionPersonsForLocation] = useState<Record<string, DistributionPerson[]>>({})

  const { data: personsData, error: personsError } = useSWR<{ persons: DistributionPerson[] }>(
    "/api/admin/distribution-persons",
    fetcher,
    {
      revalidateOnFocus: false,
      onError: (error) => {
        console.error("[v0] Error loading distribution persons:", error)
      }
    }
  )
  const distributionPersons = personsData?.persons || []


  useEffect(() => {
    fetchLocations()
    fetchMappings()
  }, [])

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/admin/pickup-locations")
      if (response.ok) {
        const data = await response.json()
        setLocations(data.locations || data)
      } else {
        toast({
          title: "Fehler",
          description: "Abholorte konnten nicht geladen werden",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching locations:", error)
      toast({
        title: "Fehler",
        description: "Verbindungsfehler beim Laden der Abholorte",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchMappings = async () => {
    setLoadingMappings(true)
    try {
      const response = await fetch("/api/admin/pickup-location-mappings?includeUnmapped=true")
      if (response.ok) {
        const data = await response.json()
        setMappings(data.mappings || [])
        setUnmappedVariants(data.unmapped || [])
      } else {
        toast({
          title: "Fehler",
          description: "Mappings konnten nicht geladen werden",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching mappings:", error)
      toast({
        title: "Fehler",
        description: "Verbindungsfehler beim Laden der Mappings",
        variant: "destructive",
      })
    } finally {
      setLoadingMappings(false)
    }
  }

  const fetchIndividualOrders = async () => {
    console.log("[v0] Fetching individual orders (ungrouped)...") // Added debug logging
    setLoadingMappings(true)
    try {
      const response = await fetch("/api/admin/pickup-location-mappings?includeUnmapped=true&grouped=false")
      console.log("[v0] Individual orders response status:", response.status) // Added debug logging
      
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Individual orders data:", data) // Added debug logging
        setIndividualOrders(data.individual || [])
      } else {
        toast({
          title: "Fehler",
          description: "Einzelne Bestellungen konnten nicht geladen werden",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching individual orders:", error)
      toast({
          title: "Fehler",
          description: "Verbindungsfehler beim Laden der Bestellungen",
          variant: "destructive",
        })
    } finally {
      setLoadingMappings(false)
    }
  }

  useEffect(() => {
    if (!isGrouped) {
      fetchIndividualOrders()
    }
  }, [isGrouped])

  const toggleLocation = async (location: PickupLocation) => {
    try {
      const response = await fetch(`/api/admin/pickup-locations/${location.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...location,
          is_active: !location.is_active,
        }),
      })

      if (response.ok) {
        await fetchLocations()
        toast({
          title: "Erfolg",
          description: `Abholort ${!location.is_active ? "aktiviert" : "deaktiviert"}`,
        })
      } else {
        throw new Error("Failed to update location")
      }
    } catch (error) {
      console.error("Error toggling location:", error)
      toast({
          title: "Fehler",
          description: "Status konnte nicht geändert werden",
          variant: "destructive",
        })
    }
  }

  const handleCreate = async () => {
    console.log("[v0] Creating pickup location with data:", formData)
    
    try {
      const response = await fetch("/api/admin/pickup-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      console.log("[v0] Create pickup location response status:", response.status)

      if (response.ok) {
        const newLocation = await response.json()
        console.log("[v0] New location created with ID:", newLocation.id)
        
        await fetchLocations()
        
        setIsCreateDialogOpen(false)
        resetForm()
        toast({
          title: "Erfolg",
          description: "Abholort wurde erstellt",
        })
      } else {
        const error = await response.json()
        console.error("[v0] Error creating pickup location:", error)
        throw new Error(error.error || "Failed to create location")
      }
    } catch (error) {
      console.error("Error creating location:", error)
      toast({
          title: "Fehler",
          description: "Abholort konnte nicht erstellt werden",
          variant: "destructive",
        })
    }
  }

  const handleUpdate = async () => {
    if (!selectedLocation) return

    try {
      const response = await fetch(`/api/admin/pickup-locations/${selectedLocation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...selectedLocation,
          ...formData,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update location")
      }

      const updatedLocation = await response.json()
      console.log("[v0] Location updated:", updatedLocation)
      
      await saveDistributionPersons(selectedLocation.id)
      
      await fetchLocations()
      
      setIsEditDialogOpen(false)
      setSelectedLocation(null)
      resetForm()
      setSelectedPersonsForLocation({})
      setPrimaryPerson(null)
      toast({
        title: "Erfolg",
        description: "Abholort wurde aktualisiert",
      })
    } catch (error) {
      console.error("Error updating location:", error)
      toast({
        title: "Fehler",
        description: "Abholort konnte nicht aktualisiert werden",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!selectedLocation) return

    try {
      const response = await fetch(`/api/admin/pickup-locations/${selectedLocation.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchLocations()
        setIsDeleteDialogOpen(false)
        setSelectedLocation(null)
        toast({
          title: "Erfolg",
          description: "Abholort wurde gelöscht",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Fehler",
          description: error.error || "Abholort konnte nicht gelöscht werden",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting location:", error)
      toast({
          title: "Fehler",
          description: "Verbindungsfehler beim Löschen",
          variant: "destructive",
        })
    }
  }

  const openEditDialog = async (location: PickupLocation) => {
    setSelectedLocation(location)
    setFormData({
      name: location.name,
      address: location.address,
      postal_code: location.postal_code,
      city: location.city,
      contact_person: location.contact_person || "",
      contact_phone: location.contact_phone || "",
      email: location.email || "",
      pickup_hours_start: location.pickup_hours_start || "",
      pickup_hours_end: location.pickup_hours_end || "",
      notes: location.notes || "",
    })
    
    await loadDistributionPersonsForLocation(location.id)
    
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (location: PickupLocation) => {
    setSelectedLocation(location)
    setIsDeleteDialogOpen(true)
  }

  const loadDistributionPersonsForLocation = async (locationId: string) => {
    setLoadingPersons(true)
    try {
      const response = await fetch(`/api/admin/location-persons?locationId=${locationId}`)
      if (response.ok) {
        const data = await response.json()
        const assignments: Record<string, boolean> = {}
        let primary: string | null = null
        
        data.assignments.forEach((assignment: LocationPerson) => {
          assignments[assignment.person_id] = true
          if (assignment.is_primary) {
            primary = assignment.person_id
          }
        })
        
        setSelectedPersonsForLocation(assignments)
        setPrimaryPerson(primary)
      }
    } catch (error) {
      console.error("[v0] Error loading distribution persons:", error)
    } finally {
      setLoadingPersons(false)
    }
  }

  const saveDistributionPersons = async (locationId: string) => {
    try {
      const selectedIds = Object.keys(selectedPersonsForLocation).filter(
        (id) => selectedPersonsForLocation[id]
      )

      console.log("[v0] Saving distribution persons for location:", locationId, "persons:", selectedIds)

      const response = await fetch("/api/admin/location-persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          personIds: selectedIds,
          primaryPersonId: primaryPerson,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save distribution persons")
      }

      console.log("[v0] Distribution persons saved successfully")
    } catch (error) {
      console.error("[v0] Error saving distribution persons:", error)
      console.error("Verteilpersonen konnten nicht gespeichert werden, aber Abholort wurde aktualisiert")
    }
  }

  const loadDistributionPersonsForSelectedLocation = async (locationId: string) => {
    try {
      const response = await fetch(`/api/admin/location-persons?locationId=${locationId}`)
      if (response.ok) {
        const data = await response.json()
        const personIds = data.assignments.map((a: LocationPerson) => a.person_id)
        const personsForLocation = distributionPersons.filter(p => personIds.includes(p.id) && p.is_active)
        setDistributionPersonsForLocation(prev => ({
          ...prev,
          [locationId]: personsForLocation
        }))
      }
    } catch (error) {
      console.error("[v0] Error loading distribution persons for location:", error)
    }
  }

  const handleLocationSelect = (variantKey: string, locationId: string) => {
    setSelectedMappings((prev) => ({ ...prev, [variantKey]: locationId }))
    if (locationId) {
      loadDistributionPersonsForSelectedLocation(locationId)
    }
  }

  const createMapping = async (variant: string, canonicalLocationId: string, distributionPersonId?: string) => {
    console.log("[v0] Creating mapping for variant:", variant, "to location:", canonicalLocationId, "person:", distributionPersonId)
    try {
      const response = await fetch("/api/admin/pickup-location-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variant,
          canonical_location_id: canonicalLocationId,
          applyToExisting,
          distribution_person_id: distributionPersonId || null,
        }),
      })

      console.log("[v0] Create mapping response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[v0] Error creating mapping:", errorData)
        throw new Error(errorData.error || "Failed to create mapping")
      }

      const result = await response.json()
      console.log("[v0] Mapping created successfully:", result)
      
      await fetchMappings()
      toast({
        title: "Erfolg",
        description: `Mapping für "${variant}" erstellt`,
      })
      setSelectedMappings((prev) => {
        const updated = { ...prev }
        delete updated[variant]
        return updated
      })
      setSelectedDistributionPersons((prev) => {
        const updated = { ...prev }
        delete updated[variant]
        return updated
      })
    } catch (error: any) {
      console.error("[v0] Error creating mapping:", error)
      toast({
        title: "Fehler",
        description: String(error?.message || "Mapping konnte nicht erstellt werden"),
        variant: "destructive",
      })
    }
  }

  const createCommentMapping = async (comment: string, canonicalLocationId: string, orderId: string) => {
    console.log("[v0] Creating comment mapping for order:", orderId, "comment:", comment, "to location:", canonicalLocationId) // Added debug logging
    try {
      const response = await fetch("/api/admin/pickup-location-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variant: comment,
          canonical_location_id: canonicalLocationId,
          applyToExisting: true,
          source: "comment",
          orderId,
        }),
      })

      console.log("[v0] Create comment mapping response status:", response.status) // Added debug logging

      if (response.ok) {
        await fetchIndividualOrders()
        toast({
          title: "Erfolg",
          description: `Kommentar-Mapping erstellt`,
        })
        setSelectedCommentMappings((prev) => {
          const updated = { ...prev }
          delete updated[orderId]
          return updated
        })
      } else {
        const error = await response.json()
        console.error("[v0] Error creating comment mapping:", error) // Added debug logging
        throw new Error(error.error || "Failed to create mapping")
      }
    } catch (error: any) {
      console.error("Error creating comment mapping:", error)
      toast({
          title: "Fehler",
          description: error.message || "Kommentar-Mapping konnte nicht erstellt werden",
          variant: "destructive",
        })
    }
  }

  const createPickupMapping = async (pickupLocation: string, canonicalLocationId: string, orderId: string) => {
    console.log("[v0] Creating pickup mapping for order:", orderId, "pickup:", pickupLocation, "to location:", canonicalLocationId) // Added debug logging
    try {
      const response = await fetch("/api/admin/pickup-location-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variant: pickupLocation,
          canonical_location_id: canonicalLocationId,
          applyToExisting: true,
          source: "pickup_location",
          orderId,
        }),
      })

      console.log("[v0] Create pickup mapping response status:", response.status) // Added debug logging

      if (response.ok) {
        await fetchIndividualOrders()
        toast({
          title: "Erfolg",
          description: `Abholort-Mapping erstellt`,
        })
        setSelectedPickupMappings((prev) => {
          const updated = { ...prev }
          delete updated[orderId]
          return updated
        })
      } else {
        const error = await response.json()
        console.error("[v0] Error creating pickup mapping:", error) // Added debug logging
        throw new Error(error.error || "Failed to create mapping")
      }
    } catch (error: any) {
      console.error("Error creating pickup mapping:", error)
      toast({
          title: "Fehler",
          description: error.message || "Abholort-Mapping konnte nicht erstellt werden",
          variant: "destructive",
        })
    }
  }

  const deleteMapping = async (mappingId: string) => {
    try {
      const response = await fetch(`/api/admin/pickup-location-mappings/${mappingId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchMappings()
        toast({
          title: "Erfolg",
          description: "Mapping gelöscht",
        })
      } else {
        throw new Error("Failed to delete mapping")
      }
    } catch (error) {
      console.error("Error deleting mapping:", error)
      toast({
          title: "Fehler",
          description: "Mapping konnte nicht gelöscht werden",
          variant: "destructive",
        })
    }
  }

  const handleBatchNormalize = async () => {
    setIsBatchNormalizing(true)
    try {
      const response = await fetch("/api/admin/pickup-location-mappings/batch-normalize", {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Erfolg",
          description: `${data.updated} Bestellungen wurden normalisiert`,
        })
      } else {
        throw new Error("Batch normalization failed")
      }
    } catch (error) {
      console.error("Error batch normalizing:", error)
      toast({
          title: "Fehler",
          description: "Batch-Normalisierung fehlgeschlagen",
          variant: "destructive",
        })
    } finally {
      setIsBatchNormalizing(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      postal_code: "",
      city: "",
      contact_person: "",
      contact_phone: "",
      email: "",
      pickup_hours_start: "",
      pickup_hours_end: "",
      notes: "",
    })
  }

  if (loading) {
    return <div>Lade Abholorte...</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Abholorte verwalten</CardTitle>
          <CardDescription>Verwaltung der Abholstandorte für Kunden</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Neuer Abholort
            </Button>
          </div>

          <div className="space-y-4">
            {locations.map((location) => (
              <Card key={location.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{location.name}</span>
                      <Badge variant={location.is_active ? "default" : "secondary"}>
                        {location.is_active ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {location.address}, {location.postal_code} {location.city}
                    </div>
                    {location.contact_person && (
                      <div className="text-sm">
                        Kontakt: {location.contact_person}
                        {location.contact_phone && ` (${location.contact_phone})`}
                      </div>
                    )}
                    {location.email && (
                      <div className="text-sm flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {location.email}
                      </div>
                    )}
                    {(location.pickup_hours_start || location.pickup_hours_end) && (
                      <div className="text-sm flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Abholzeiten: {location.pickup_hours_start || "?"} - {location.pickup_hours_end || "?"} Uhr
                      </div>
                    )}
                    {location.notes && (
                      <div className="text-sm flex items-start gap-1 text-muted-foreground">
                        <Info className="h-3 w-3 mt-0.5" />
                        <span>{location.notes}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={location.is_active ? "outline" : "default"}
                      onClick={() => toggleLocation(location)}
                    >
                      {location.is_active ? "Deaktivieren" : "Aktivieren"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(location)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openDeleteDialog(location)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Abholort-Varianten zuordnen
          </CardTitle>
          <CardDescription>
            Ordnen Sie verschiedene Schreibweisen den offiziellen Abholorten zu. Das System lernt und wendet diese
            Zuordnungen automatisch bei zukünftigen Bestellungen an.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(unmappedVariants.length > 0 || individualOrders.length > 0) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Nicht zugeordnete Varianten</h3>
                  <p className="text-sm text-muted-foreground">
                    {isGrouped
                      ? `${unmappedVariants.length} Variante(n) gefunden in Bestellungen`
                      : `${individualOrders.length} einzelne Bestellung(en) zum Zuordnen`}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="groupVariants"
                      checked={isGrouped}
                      onCheckedChange={(checked) => setIsGrouped(checked as boolean)}
                    />
                    <Label htmlFor="groupVariants" className="text-sm cursor-pointer">
                      Gleiche Varianten gruppieren
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="applyToExisting"
                      checked={applyToExisting}
                      onCheckedChange={(checked) => setApplyToExisting(checked as boolean)}
                    />
                    <Label htmlFor="applyToExisting" className="text-sm cursor-pointer">
                      Auf bestehende Bestellungen anwenden
                    </Label>
                  </div>
                </div>
              </div>

              {isGrouped && (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variante (Original)</TableHead>
                        <TableHead className="text-right">Anzahl Bestellungen</TableHead>
                        <TableHead>Zuordnen zu</TableHead>
                        <TableHead>Verteilperson</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unmappedVariants.map((variant) => {
                        const selectedLocation = selectedMappings[variant.variant] || variant.suggestion?.locationId || ""
                        const personsForLoc = selectedLocation ? (distributionPersonsForLocation[selectedLocation] || []) : []
                        
                        return (
                          <TableRow key={variant.variant} className="group">
                            <TableCell className="align-top">
                              <div className="space-y-2">
                                <div className="font-mono font-medium">{variant.variant}</div>
                                {variant.notes && variant.notes.length > 0 && (
                                  <Collapsible>
                                    <CollapsibleTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 gap-1 text-muted-foreground hover:text-foreground"
                                      >
                                        <MessageSquare className="h-3 w-3" />
                                        {variant.notes.length} Kommentar(e) anzeigen
                                      </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="mt-2 space-y-2">
                                      {variant.suggestion && (
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                                          <p className="text-sm font-medium text-blue-900">
                                            Automatischer Vorschlag: {variant.suggestion.locationName}
                                          </p>
                                          <p className="text-xs text-blue-700 mt-1">
                                            In Kommentaren erkannt (Konfidenz: {variant.suggestion.confidence})
                                          </p>
                                        </div>
                                      )}
                                      <div className="space-y-2 pl-3 border-l-2 border-muted">
                                        {variant.notes.slice(0, 5).map((note, idx) => (
                                          <div key={idx} className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                                            {note}
                                          </div>
                                        ))}
                                        {variant.notes.length > 5 && (
                                          <p className="text-xs text-muted-foreground italic pl-2">
                                            ... und {variant.notes.length - 5} weitere Kommentar(e)
                                          </p>
                                        )}
                                      </div>
                                    </CollapsibleContent>
                                  </Collapsible>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right align-top">
                              <Badge variant="secondary" className="font-mono">
                                {variant.count}
                              </Badge>
                            </TableCell>
                            <TableCell className="align-top">
                              <Select
                                value={selectedLocation}
                                onValueChange={(value) => handleLocationSelect(variant.variant, value)}
                              >
                                <SelectTrigger className="w-[280px]">
                                  <SelectValue placeholder="Abholort wählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {locations
                                    .filter((loc) => loc.is_active)
                                    .map((location) => (
                                      <SelectItem key={location.id} value={location.id}>
                                        {location.name}
                                        {variant.suggestion?.locationId === location.id && " ⭐"}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              {variant.suggestion && (
                                <Badge variant="outline" className="mt-2 bg-blue-50 text-blue-700 border-blue-200">
                                  Vorschlag verfügbar
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="align-top">
                              {personsForLoc.length > 0 ? (
                                <Select
                                  value={selectedDistributionPersons[variant.variant] || ""}
                                  onValueChange={(value) =>
                                    setSelectedDistributionPersons((prev) => ({ ...prev, [variant.variant]: value }))
                                  }
                                >
                                  <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Optional zuordnen..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Keine Verteilperson</SelectItem>
                                    {personsForLoc.map((person) => (
                                      <SelectItem key={person.id} value={person.id}>
                                        <div className="flex items-center gap-2">
                                          <User className="h-3 w-3" />
                                          {person.name}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-sm text-muted-foreground italic">
                                  {selectedLocation ? "Keine Verteilpersonen für diesen Ort" : "Erst Ort wählen"}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="align-top">
                              <Button
                                size="sm"
                                disabled={!selectedLocation}
                                onClick={() =>
                                  createMapping(
                                    variant.variant,
                                    selectedLocation,
                                    selectedDistributionPersons[variant.variant] === "none" 
                                      ? undefined 
                                      : selectedDistributionPersons[variant.variant]
                                  )
                                }
                              >
                                Zuordnen
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {!isGrouped && (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Abholort-Feld</TableHead>
                        <TableHead>Kommentar</TableHead>
                        <TableHead>Zuordnen zu</TableHead>
                        <TableHead className="w-[140px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {individualOrders.map((order) => (
                        <TableRow key={order.orderId}>
                          <TableCell className="align-top">
                            <div className="space-y-2">
                              <div className="font-mono text-sm font-medium">{order.pickupLocation}</div>
                              <Select
                                value={selectedPickupMappings[order.orderId] || ""}
                                onValueChange={(value) =>
                                  setSelectedPickupMappings((prev) => ({ ...prev, [order.orderId]: value }))
                                }
                              >
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue placeholder="Abholort wählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {locations
                                    .filter((loc) => loc.is_active)
                                    .map((location) => (
                                      <SelectItem key={location.id} value={location.id}>
                                        {location.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                          <TableCell className="align-top max-w-md">
                            <div className="space-y-2">
                              {order.comment ? (
                                <>
                                  <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded max-h-20 overflow-y-auto">
                                    {order.comment}
                                  </div>
                                  <Select
                                    value={selectedCommentMappings[order.orderId] || ""}
                                    onValueChange={(value) =>
                                      setSelectedCommentMappings((prev) => ({ ...prev, [order.orderId]: value }))
                                    }
                                  >
                                    <SelectTrigger className="w-[200px]">
                                      <SelectValue placeholder="Aus Kommentar mappen..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {locations
                                        .filter((loc) => loc.is_active)
                                        .map((location) => (
                                          <SelectItem key={location.id} value={location.id}>
                                            {location.name}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </>
                              ) : (
                                <span className="text-sm text-muted-foreground italic">Kein Kommentar</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="text-sm text-muted-foreground">
                              Wählen Sie links das Dropdown für die gewünschte Quelle
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex flex-col gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!selectedPickupMappings[order.orderId]}
                                onClick={() =>
                                  createPickupMapping(
                                    order.pickupLocation,
                                    selectedPickupMappings[order.orderId],
                                    order.orderId
                                  )
                                }
                                className="w-full"
                              >
                                <Badge variant="secondary" className="mr-2 text-xs">
                                  Abholort
                                </Badge>
                                Zuordnen
                              </Button>
                              {order.comment && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={!selectedCommentMappings[order.orderId]}
                                  onClick={() =>
                                    createCommentMapping(
                                      order.comment!,
                                      selectedCommentMappings[order.orderId],
                                      order.orderId
                                    )
                                  }
                                  className="w-full"
                                >
                                  <Badge variant="secondary" className="mr-2 text-xs">
                                    Kommentar
                                  </Badge>
                                  Zuordnen
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {mappings.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Zugeordnete Varianten</h3>
                  <p className="text-sm text-muted-foreground">{mappings.length} aktive(s) Mapping(s)</p>
                </div>
                <Button onClick={handleBatchNormalize} disabled={isBatchNormalizing} variant="outline">
                  {isBatchNormalizing ? "Normalisiere..." : "Alle Bestellungen aktualisieren"}
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variante</TableHead>
                    <TableHead>Zugeordnet zu</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((mapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell className="font-mono">{mapping.variant}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{mapping.canonical_location?.name}</span>
                          {mapping.canonical_location?.city && (
                            <span className="text-sm text-muted-foreground">({mapping.canonical_location.city})</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => deleteMapping(mapping.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Neuen Abholort erstellen</DialogTitle>
            <DialogDescription>Fügen Sie einen neuen Abholstandort hinzu</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault()
            handleCreate()
          }} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="z.B. Rathaus Schwäbisch Hall"
                  required
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Straße und Hausnummer"
                />
              </div>
              <div>
                <Label htmlFor="postal_code">PLZ</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  placeholder="74523"
                />
              </div>
              <div>
                <Label htmlFor="city">Ort</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Schwäbisch Hall"
                />
              </div>
              <div>
                <Label htmlFor="contact_person">Kontaktperson</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="Max Mustermann"
                />
              </div>
              <div>
                <Label htmlFor="contact_phone">Telefon</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="+49 123 456789"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="kontakt@beispiel.de"
                />
              </div>
              <div>
                <Label htmlFor="pickup_hours_start">Abholzeit von</Label>
                <Input
                  id="pickup_hours_start"
                  type="time"
                  value={formData.pickup_hours_start}
                  onChange={(e) => setFormData({ ...formData, pickup_hours_start: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="pickup_hours_end">Abholzeit bis</Label>
                <Input
                  id="pickup_hours_end"
                  type="time"
                  value={formData.pickup_hours_end}
                  onChange={(e) => setFormData({ ...formData, pickup_hours_end: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="notes">Notizen</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Zusätzliche Informationen..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsCreateDialogOpen(false)
                resetForm()
              }}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={!formData.name}>
                Erstellen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Abholort bearbeiten</DialogTitle>
            <DialogDescription>Bearbeiten Sie die Informationen des Abholorts</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault()
            handleUpdate()
          }} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="edit_name">Name *</Label>
                <Input
                  id="edit_name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit_address">Adresse</Label>
                <Input
                  id="edit_address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_postal_code">PLZ</Label>
                <Input
                  id="edit_postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_city">Ort</Label>
                <Input
                  id="edit_city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_contact_person">Kontaktperson</Label>
                <Input
                  id="edit_contact_person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_contact_phone">Telefon</Label>
                <Input
                  id="edit_contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit_email">E-Mail</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_pickup_hours_start">Abholzeit von</Label>
                <Input
                  id="edit_pickup_hours_start"
                  type="time"
                  value={formData.pickup_hours_start}
                  onChange={(e) => setFormData({ ...formData, pickup_hours_start: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_pickup_hours_end">Abholzeit bis</Label>
                <Input
                  id="edit_pickup_hours_end"
                  type="time"
                  value={formData.pickup_hours_end}
                  onChange={(e) => setFormData({ ...formData, pickup_hours_end: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit_notes">Notizen</Label>
                <Textarea
                  id="edit_notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div>
                <h3 className="text-lg font-medium mb-2">Verteilpersonen an diesem Abholort</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Wählen Sie die Verteilpersonen aus, die an diesem Abholort aktiv sind. Markieren Sie eine Person als Hauptansprechpartner.
                </p>
              </div>
              
              {loadingPersons ? (
                <div className="text-center py-4">Lade Verteilpersonen...</div>
              ) : distributionPersons.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  Keine Verteilpersonen verfügbar. Erstellen Sie erst Verteilpersonen im "Verteilpersonen"-Tab.
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-4">
                  {distributionPersons
                    .filter(person => person.is_active)
                    .map((person) => (
                      <div key={person.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id={`person-${person.id}`}
                            checked={!!selectedPersonsForLocation[person.id]}
                            onCheckedChange={(checked) => {
                              setSelectedPersonsForLocation(prev => ({
                                ...prev,
                                [person.id]: checked as boolean
                              }))
                              if (!checked && primaryPerson === person.id) {
                                setPrimaryPerson(null)
                              }
                            }}
                          />
                          <div>
                            <Label htmlFor={`person-${person.id}`} className="cursor-pointer font-medium">
                              {person.name}
                            </Label>
                            {person.phone && (
                              <p className="text-xs text-muted-foreground">{person.phone}</p>
                            )}
                          </div>
                        </div>
                        {selectedPersonsForLocation[person.id] && (
                          <div className="flex items-center space-x-2">
                            <Label htmlFor={`primary-${person.id}`} className="text-sm text-muted-foreground">
                              Hauptkontakt:
                            </Label>
                            <input
                              type="radio"
                              id={`primary-${person.id}`}
                              name="primary-person"
                              checked={primaryPerson === person.id}
                              onChange={() => setPrimaryPerson(person.id)}
                              className="cursor-pointer"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsEditDialogOpen(false)
                setSelectedLocation(null)
                resetForm()
                setSelectedPersonsForLocation({})
                setPrimaryPerson(null)
              }}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={!formData.name}>
                Speichern
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abholort löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie den Abholort "{selectedLocation?.name}" löschen möchten? Diese Aktion kann nicht
              rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
