"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PlusIcon, Pencil, Trash2, Users } from 'lucide-react'
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"

interface DistributionPerson {
  id: string
  name: string
  phone: string | null
  email: string | null
  street: string | null
  postal_code: string | null
  city: string | null
  country: string | null
  is_active: boolean
  notes: string | null
  location_count?: number
  created_at: string
}

interface Customer {
  id: string
  first_name: string
  last_name: string
  email: string
  default_distribution_person_id: string | null
}

interface LocationPerson {
  id: string
  pickup_location_id: string
  person_id: string
  is_primary: boolean
  pickup_location_name?: string
}

interface PickupLocation {
  id: string
  name: string
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text()
    console.error("[v0] Fetcher error:", res.status, text)
    throw new Error(`HTTP error! status: ${res.status}`)
  }
  return res.json()
}

export default function DistributionPersonManagement() {
  const { toast } = useToast()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingPerson, setEditingPerson] = useState<DistributionPerson | null>(null)
  const [isAssignCustomerDialogOpen, setIsAssignCustomerDialogOpen] = useState(false)
  const [selectedPersonForAssignment, setSelectedPersonForAssignment] = useState<DistributionPerson | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("")
  
  const [customerSearchQuery, setCustomerSearchQuery] = useState("")
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([])
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    street: "",
    postal_code: "",
    city: "",
    country: "Deutschland",
    notes: "",
  })
  
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [primaryLocationId, setPrimaryLocationId] = useState<string | null>(null)

  const { data: locationsData } = useSWR<{ locations: PickupLocation[] }>(
    "/api/admin/pickup-locations",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  )
  const pickupLocations = Array.isArray(locationsData?.locations) ? locationsData.locations : []

  const { data: assignedLocationsData, mutate: mutateAssignedLocations } = useSWR<{ assignments: LocationPerson[] }>(
    editingPerson ? `/api/admin/location-persons?person_id=${editingPerson.id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // Cache for 30 seconds
    }
  )

  const { data: personsData, error, mutate, isLoading } = useSWR<{ persons: DistributionPerson[] }>(
    "/api/admin/distribution-persons",
    fetcher,
    {
      revalidateOnFocus: false, // Prevent refetch on focus
      dedupingInterval: 30000, // Cache for 30 seconds
    }
  )

  const persons = personsData?.persons || []

  useEffect(() => {
    if (editingPerson && assignedLocationsData?.assignments) {
      const locationIds = assignedLocationsData.assignments.map(a => a.pickup_location_id)
      const primary = assignedLocationsData.assignments.find(a => a.is_primary)
      
      setSelectedLocations(prev => {
        const newIds = locationIds.sort().join(',')
        const prevIds = prev.sort().join(',')
        return newIds !== prevIds ? locationIds : prev
      })
      
      setPrimaryLocationId(prev => {
        const newPrimary = primary?.pickup_location_id || null
        return newPrimary !== prev ? newPrimary : prev
      })
    }
  }, [editingPerson?.id, assignedLocationsData]) // Only watch editingPerson.id, not full object

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log("[v0] Creating distribution person:", formData, "with locations:", selectedLocations)

    try {
      const res = await fetch("/api/admin/distribution-persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          location_ids: selectedLocations,
          primary_location_id: primaryLocationId,
        }),
      })

      if (!res.ok) throw new Error("Failed to create person")

      toast({
        title: "Verteilperson erstellt",
        description: `${formData.name} wurde erfolgreich erstellt.`,
      })

      setIsCreateDialogOpen(false)
      setFormData({ name: "", phone: "", email: "", street: "", postal_code: "", city: "", country: "Deutschland", notes: "" })
      setSelectedLocations([])
      setPrimaryLocationId(null)
      mutate()
    } catch (error) {
      console.error("[v0] Error creating person:", error)
      toast({
        title: "Fehler",
        description: "Verteilperson konnte nicht erstellt werden.",
        variant: "destructive",
      })
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPerson) return

    console.log("[v0] Updating distribution person:", editingPerson.id, formData, "with locations:", selectedLocations)

    try {
      const res = await fetch(`/api/admin/distribution-persons/${editingPerson.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          location_ids: selectedLocations,
          primary_location_id: primaryLocationId,
        }),
      })

      if (!res.ok) throw new Error("Failed to update person")

      toast({
        title: "Verteilperson aktualisiert",
        description: `${formData.name} wurde erfolgreich aktualisiert.`,
      })

      setIsEditDialogOpen(false)
      setEditingPerson(null)
      mutate()
    } catch (error) {
      console.error("[v0] Error updating person:", error)
      toast({
        title: "Fehler",
        description: "Verteilperson konnte nicht aktualisiert werden.",
        variant: "destructive",
      })
    }
  }

  const handleToggleActive = async (person: DistributionPerson) => {
    console.log("[v0] Toggling active status for person:", person.id)

    try {
      const res = await fetch(`/api/admin/distribution-persons/${person.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !person.is_active }),
      })

      if (!res.ok) throw new Error("Failed to toggle active status")

      const newStatus = !person.is_active
      toast({
        title: newStatus ? "Verteilperson aktiviert" : "Verteilperson deaktiviert",
        description: `${person.name} wurde ${newStatus ? "aktiviert" : "deaktiviert"}.`,
      })

      mutate()
    } catch (error) {
      console.error("[v0] Error toggling active status:", error)
      toast({
        title: "Fehler",
        description: "Status konnte nicht geändert werden.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (person: DistributionPerson) => {
    if (!confirm(`Möchten Sie ${person.name} wirklich löschen?`)) return

    console.log("[v0] Deleting distribution person:", person.id)

    try {
      const res = await fetch(`/api/admin/distribution-persons/${person.id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete person")

      toast({
        title: "Verteilperson gelöscht",
        description: `${person.name} wurde erfolgreich gelöscht.`,
      })

      mutate()
    } catch (error) {
      console.error("[v0] Error deleting person:", error)
      toast({
        title: "Fehler",
        description: "Verteilperson konnte nicht gelöscht werden.",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (person: DistributionPerson) => {
    setEditingPerson(person)
    setFormData({
      name: person.name,
      phone: person.phone || "",
      email: person.email || "",
      street: person.street || "",
      postal_code: person.postal_code || "",
      city: person.city || "",
      country: person.country || "Deutschland",
      notes: person.notes || "",
    })
    setSelectedLocations([])
    setPrimaryLocationId(null)
    setIsEditDialogOpen(true)
  }

  const toggleLocation = (locationId: string) => {
    setSelectedLocations(prev => 
      prev.includes(locationId) 
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    )
    // If unselecting the primary location, clear primary
    if (primaryLocationId === locationId) {
      setPrimaryLocationId(null)
    }
  }

  const setPrimary = (locationId: string) => {
    // Must be selected first
    if (!selectedLocations.includes(locationId)) {
      setSelectedLocations([...selectedLocations, locationId])
    }
    setPrimaryLocationId(locationId)
  }

  const openAssignCustomerDialog = (person: DistributionPerson) => {
    setSelectedPersonForAssignment(person)
    setSelectedCustomerId("")
    setCustomerSearchQuery("")
    setCustomerSearchResults([])
    setIsAssignCustomerDialogOpen(true)
  }

  const handleAssignCustomer = async () => {
    if (!selectedPersonForAssignment || !selectedCustomerId) return

    try {
      const res = await fetch(`/api/admin/customers/${selectedCustomerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          default_distribution_person_id: selectedPersonForAssignment.id,
        }),
      })

      if (!res.ok) throw new Error("Failed to assign customer")

      toast({
        title: "Kunde zugeordnet",
        description: "Der Kunde wurde erfolgreich der Verteilperson zugeordnet.",
      })

      setIsAssignCustomerDialogOpen(false)
      setSelectedPersonForAssignment(null)
      setSelectedCustomerId("")
      setCustomerSearchQuery("")
      setCustomerSearchResults([])
    } catch (error) {
      console.error("[v0] Error assigning customer:", error)
      toast({
        title: "Fehler",
        description: "Kunde konnte nicht zugeordnet werden.",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (!customerSearchQuery || customerSearchQuery.length < 2) {
      setCustomerSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearchingCustomers(true)
      try {
        console.log("[v0] Searching for customers:", customerSearchQuery)
        const response = await fetch(`/api/admin/customers/search?q=${encodeURIComponent(customerSearchQuery)}`)
        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Customer search results:", data.customers?.length || 0)
          // Filter out customers already assigned to a person if needed
          const unassignedCustomers = (data.customers || []).filter(
            (c: Customer) => !c.default_distribution_person_id
          )
          setCustomerSearchResults(unassignedCustomers)
        }
      } catch (error) {
        console.error("[v0] Error searching customers:", error)
      } finally {
        setIsSearchingCustomers(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [customerSearchQuery])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Verteilpersonen</CardTitle>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Neue Verteilperson
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Lädt...</div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            Fehler beim Laden der Verteilpersonen
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Abholorte</TableHead>
                <TableHead>Kunden</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {persons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Keine Verteilpersonen vorhanden
                  </TableCell>
                </TableRow>
              ) : (
                persons.map((person) => {
                  return (
                    <TableRow key={person.id}>
                      <TableCell className="font-medium">{person.name}</TableCell>
                      <TableCell>{person.phone || "-"}</TableCell>
                      <TableCell>{person.email || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{(person.location_count || 0)} Orte</Badge>
                      </TableCell>
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                              <Users className="h-4 w-4" />
                              <CustomersCount personId={person.id} />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <AssignedCustomersList 
                              personId={person.id}
                              personName={person.name}
                              onAssignClick={() => openAssignCustomerDialog(person)}
                            />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={person.is_active}
                          onCheckedChange={() => handleToggleActive(person)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(person)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(person)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        )}

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Neue Verteilperson erstellen</DialogTitle>
                <DialogDescription>
                  Erstellen Sie eine neue Verteilperson und ordnen Sie ihr Abholorte zu.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="border-t pt-4">
                  <Label className="text-base mb-3 block">Adresse (optional)</Label>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="street" className="text-sm">Straße & Hausnummer</Label>
                      <Input
                        id="street"
                        value={formData.street}
                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                        placeholder="Hauptstraße 123"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="postal_code" className="text-sm">PLZ</Label>
                        <Input
                          id="postal_code"
                          value={formData.postal_code}
                          onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                          placeholder="74523"
                        />
                      </div>
                      <div>
                        <Label htmlFor="city" className="text-sm">Stadt</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          placeholder="Schwäbisch Hall"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="country" className="text-sm">Land</Label>
                      <Input
                        id="country"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Notizen</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <div className="border-t pt-4">
                  <Label className="text-base mb-3 block">Zugeordnete Abholorte</Label>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-3">
                    {pickupLocations.length === 0 ? (
                      <div className="text-sm text-muted-foreground">Keine Abholorte verfügbar</div>
                    ) : (
                      pickupLocations.map((location) => (
                        <div key={location.id} className="flex items-center justify-between py-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`create-location-${location.id}`}
                              checked={selectedLocations.includes(location.id)}
                              onCheckedChange={() => toggleLocation(location.id)}
                            />
                            <label
                              htmlFor={`create-location-${location.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {location.name}
                            </label>
                          </div>
                          {selectedLocations.includes(location.id) && (
                            <Button
                              type="button"
                              variant={primaryLocationId === location.id ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPrimary(location.id)}
                            >
                              {primaryLocationId === location.id ? "Hauptkontakt" : "Als Hauptkontakt"}
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Wählen Sie die Abholorte aus wo diese Person Bestellungen entgegennimmt.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false)
                    setSelectedLocations([])
                    setPrimaryLocationId(null)
                  }}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={!formData.name.trim()}>
                  Erstellen
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleUpdate}>
              <DialogHeader>
                <DialogTitle>Verteilperson bearbeiten</DialogTitle>
                <DialogDescription>
                  Ändern Sie die Informationen und Abholort-Zuordnungen der Verteilperson.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="edit-name">Name *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">Telefon</Label>
                  <Input
                    id="edit-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="border-t pt-4">
                  <Label className="text-base mb-3 block">Adresse (optional)</Label>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="edit-street" className="text-sm">Straße & Hausnummer</Label>
                      <Input
                        id="edit-street"
                        value={formData.street}
                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                        placeholder="Hauptstraße 123"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="edit-postal_code" className="text-sm">PLZ</Label>
                        <Input
                          id="edit-postal_code"
                          value={formData.postal_code}
                          onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                          placeholder="74523"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-city" className="text-sm">Stadt</Label>
                        <Input
                          id="edit-city"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          placeholder="Schwäbisch Hall"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="edit-country" className="text-sm">Land</Label>
                      <Input
                        id="edit-country"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-notes">Notizen</Label>
                  <Input
                    id="edit-notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <div className="border-t pt-4">
                  <Label className="text-base mb-3 block">Zugeordnete Abholorte</Label>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-3">
                    {pickupLocations.length === 0 ? (
                      <div className="text-sm text-muted-foreground">Keine Abholorte verfügbar</div>
                    ) : (
                      pickupLocations.map((location) => (
                        <div key={location.id} className="flex items-center justify-between py-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-location-${location.id}`}
                              checked={selectedLocations.includes(location.id)}
                              onCheckedChange={() => toggleLocation(location.id)}
                            />
                            <label
                              htmlFor={`edit-location-${location.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {location.name}
                            </label>
                          </div>
                          {selectedLocations.includes(location.id) && (
                            <Button
                              type="button"
                              variant={primaryLocationId === location.id ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPrimary(location.id)}
                            >
                              {primaryLocationId === location.id ? "Hauptkontakt" : "Als Hauptkontakt"}
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Wählen Sie die Abholorte aus wo diese Person Bestellungen entgegennimmt.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false)
                    setEditingPerson(null)
                    setSelectedLocations([])
                    setPrimaryLocationId(null)
                  }}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={!formData.name.trim()}>
                  Speichern
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isAssignCustomerDialogOpen} onOpenChange={setIsAssignCustomerDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kunde zuordnen</DialogTitle>
              <DialogDescription>
                Wählen Sie einen Kunden aus, der {selectedPersonForAssignment?.name} zugeordnet werden soll.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="customer-select">Kunde suchen</Label>
                <Combobox
                  value={selectedCustomerId}
                  onValueChange={setSelectedCustomerId}
                  onSearchChange={setCustomerSearchQuery}
                  searchValue={customerSearchQuery}
                  placeholder="Kunde suchen (min. 2 Zeichen)..."
                  emptyText={
                    customerSearchQuery.length < 2
                      ? "Geben Sie mindestens 2 Zeichen ein"
                      : isSearchingCustomers
                      ? "Suche läuft..."
                      : "Keine Kunden gefunden"
                  }
                  options={customerSearchResults.map((customer) => ({
                    value: customer.id,
                    label: `${customer.first_name} ${customer.last_name} (${customer.email})`,
                  }))}
                />
                {/* */}
                <p className="text-xs text-muted-foreground mt-2">
                  Nur Kunden ohne Verteilperson werden angezeigt
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAssignCustomerDialogOpen(false)
                  setSelectedPersonForAssignment(null)
                  setSelectedCustomerId("")
                  setCustomerSearchQuery("")
                  setCustomerSearchResults([])
                }}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleAssignCustomer}
                disabled={!selectedCustomerId}
              >
                Zuordnen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

function CustomersCount({ personId }: { personId: string }) {
  const { data } = useSWR<{ customers: Customer[] }>(
    `/api/admin/customers?person_id=${personId}&limit=100`,
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )
  
  return <span>{data?.customers?.length || 0}</span>
}

// Helper component to show assigned customers list
function AssignedCustomersList({ 
  personId, 
  personName,
  onAssignClick 
}: { 
  personId: string
  personName: string
  onAssignClick: () => void
}) {
  const { data, isLoading } = useSWR<{ customers: Customer[] }>(
    `/api/admin/customers?person_id=${personId}&limit=100`,
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )
  
  const customers = data?.customers || []
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Zugeordnete Kunden</h4>
        <Button size="sm" onClick={onAssignClick}>
          <PlusIcon className="h-4 w-4 mr-1" />
          Zuordnen
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Lädt...</p>
      ) : customers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Keine Kunden zugeordnet
        </p>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className="flex flex-col gap-1 p-2 rounded-md bg-muted/50"
            >
              <div className="font-medium text-sm">
                {customer.first_name} {customer.last_name}
              </div>
              <div className="text-xs text-muted-foreground">
                {customer.email}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
