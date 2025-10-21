"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { MapPin, Plus, Edit, Trash2 } from "lucide-react"

interface PickupLocation {
  id: string
  name: string
  address: string
  postal_code: string
  city: string
  contact_person: string | null
  contact_phone: string | null
  is_active: boolean
  created_at: string
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
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchLocations()
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
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (location: PickupLocation) => {
    setSelectedLocation(location)
    setIsDeleteDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      postal_code: "",
      city: "",
      contact_person: "",
      contact_phone: "",
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
                  <div className="space-y-2">
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

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
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
              <Label htmlFor="address">Adresse *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="z.B. Marktplatz 1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="postal_code">PLZ *</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  placeholder="z.B. 74613"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="city">Stadt *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="z.B. Öhringen"
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
        <DialogContent className="max-w-2xl">
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
              <Label htmlFor="edit-address">Adresse *</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-postal_code">PLZ *</Label>
                <Input
                  id="edit-postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-city">Stadt *</Label>
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
