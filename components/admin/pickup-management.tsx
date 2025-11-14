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
import { MapPin, Plus, Edit, Trash2, Clock, Mail, Info, LinkIcon, MessageSquare } from 'lucide-react'
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

  useEffect(() => {
    fetchLocations()
    fetchMappings()
  }, [])

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/admin/pickup-locations")
      if (response.ok) {
        const data = await response.json()
        setLocations(data)
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
    setLoadingMappings(true)
    try {
      const response = await fetch("/api/admin/pickup-location-mappings?includeUnmapped=true&grouped=false")
      if (response.ok) {
        const data = await response.json()
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
    try {
      const response = await fetch("/api/admin/pickup-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchLocations()
        setIsCreateDialogOpen(false)
        resetForm()
        toast({
          title: "Erfolg",
          description: "Abholort wurde erstellt",
        })
      } else {
        const error = await response.json()
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

      if (response.ok) {
        await fetchLocations()
        setIsEditDialogOpen(false)
        setSelectedLocation(null)
        resetForm()
        toast({
          title: "Erfolg",
          description: "Abholort wurde aktualisiert",
        })
      } else {
        throw new Error("Failed to update location")
      }
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

  const openEditDialog = (location: PickupLocation) => {
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
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (location: PickupLocation) => {
    setSelectedLocation(location)
    setIsDeleteDialogOpen(true)
  }

  const createMapping = async (variant: string, canonicalLocationId: string) => {
    try {
      const response = await fetch("/api/admin/pickup-location-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variant,
          canonical_location_id: canonicalLocationId,
          applyToExisting,
        }),
      })

      if (response.ok) {
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
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to create mapping")
      }
    } catch (error: any) {
      console.error("Error creating mapping:", error)
      toast({
        title: "Fehler",
        description: error.message || "Mapping konnte nicht erstellt werden",
        variant: "destructive",
      })
    }
  }

  const createCommentMapping = async (comment: string, canonicalLocationId: string, orderId: string) => {
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
          {/* Unmapped Variants Section */}
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
                        <TableHead className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unmappedVariants.map((variant) => (
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
                              value={selectedMappings[variant.variant] || (variant.suggestion?.locationId || "")}
                              onValueChange={(value) =>
                                setSelectedMappings((prev) => ({ ...prev, [variant.variant]: value }))
                              }
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
                            <Button
                              size="sm"
                              disabled={!selectedMappings[variant.variant] && !variant.suggestion}
                              onClick={() =>
                                createMapping(
                                  variant.variant,
                                  selectedMappings[variant.variant] || variant.suggestion?.locationId
                                )
                              }
                            >
                              Zuordnen
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
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

          {/* Existing Mappings Section */}
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

          {(unmappedVariants.length === 0 && mappings.length === 0 && !loadingMappings && isGrouped) && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Keine Abholort-Varianten gefunden.</p>
              <p className="text-sm mt-2">Varianten werden automatisch erkannt, sobald Bestellungen eingehen.</p>
            </div>
          )}

          {(!isGrouped && individualOrders.length === 0 && mappings.length === 0 && !loadingMappings) && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Keine einzelnen Bestellungen zum Zuordnen gefunden.</p>
              <p className="text-sm mt-2">
                Varianten werden automatisch erkannt, sobald Bestellungen eingehen.
              </p>
            </div>
          )}

          {loadingMappings && <div className="text-center py-8 text-muted-foreground">Lade Mappings...</div>}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Neuer Abholort</DialogTitle>
            <DialogDescription>Erstellen Sie einen neuen Abholstandort für Kunden</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="z.B. Hohenlohe Markt"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="z.B. Marktplatz 1 (optional)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="postal_code">PLZ</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  placeholder="z.B. 74613 (optional)"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="city">Stadt</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="z.B. Öhringen (optional)"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact_person">Kontaktperson</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact_phone">Telefon</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="pickup_hours_start">Abholzeit von</Label>
                <Input
                  id="pickup_hours_start"
                  value={formData.pickup_hours_start}
                  onChange={(e) => setFormData({ ...formData, pickup_hours_start: e.target.value })}
                  placeholder="z.B. 09:00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pickup_hours_end">Abholzeit bis</Label>
                <Input
                  id="pickup_hours_end"
                  value={formData.pickup_hours_end}
                  onChange={(e) => setFormData({ ...formData, pickup_hours_end: e.target.value })}
                  placeholder="z.B. 18:00"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Hinweise</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="z.B. Eingang auf der Rückseite"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreate}>Erstellen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Abholort bearbeiten</DialogTitle>
            <DialogDescription>Bearbeiten Sie die Details des Abholstandorts</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-address">Adresse</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-postal_code">PLZ</Label>
                <Input
                  id="edit-postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-city">Stadt</Label>
                <Input
                  id="edit-city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-contact_person">Kontaktperson</Label>
              <Input
                id="edit-contact_person"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-contact_phone">Telefon</Label>
              <Input
                id="edit-contact_phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">E-Mail</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-pickup_hours_start">Abholzeit von</Label>
                <Input
                  id="edit-pickup_hours_start"
                  value={formData.pickup_hours_start}
                  onChange={(e) => setFormData({ ...formData, pickup_hours_start: e.target.value })}
                  placeholder="z.B. 09:00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-pickup_hours_end">Abholzeit bis</Label>
                <Input
                  id="edit-pickup_hours_end"
                  value={formData.pickup_hours_end}
                  onChange={(e) => setFormData({ ...formData, pickup_hours_end: e.target.value })}
                  placeholder="z.B. 18:00"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Hinweise</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="z.B. Eingang auf der Rückseite"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleUpdate}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abholort löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie den Abholort "{selectedLocation?.name}" wirklich löschen? Diese Aktion kann nicht rückgängig
              gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
