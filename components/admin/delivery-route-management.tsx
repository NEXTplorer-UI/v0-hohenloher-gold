"use client"

import type React from "react"

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
import { Plus, Edit, Trash2, GripVertical, X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"

interface DeliveryRoute {
  id: string
  name: string
  region: string | null
  color: string | null
  is_active: boolean
  display_order: number | null
  notes: string | null
  route_locations?: RouteLocation[]
}

interface RouteLocation {
  id: string
  stop_order: number
  estimated_duration_minutes: number | null
  pickup_location: {
    id: string
    name: string
    address: string
    city: string
  }
}

interface PickupLocation {
  id: string
  name: string
  address: string
  city: string
  is_active: boolean
}

interface RoutePerson {
  id: string
  person_id: string
  pickup_location_id: string
  stop_order: number
  distribution_persons: {
    id: string
    name: string
    email: string | null
    phone: string | null
  }
}

function DeliveryRouteManagement() {
  const [routes, setRoutes] = useState<DeliveryRoute[]>([])
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<DeliveryRoute | null>(null)
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    region: "",
    color: "#FF5733",
    notes: "",
  })
  const [locationPersons, setLocationPersons] = useState<Record<string, any[]>>({})
  const [routePersons, setRoutePersons] = useState<Record<string, RoutePerson[]>>({})
  const { toast } = useToast()

  useEffect(() => {
    fetchRoutes()
    fetchPickupLocations()
  }, [])

  useEffect(() => {
    routes.forEach((route) => {
      loadRoutePersons(route.id)
    })
  }, [routes])

  const fetchRoutes = async () => {
    try {
      const response = await fetch("/api/admin/delivery-routes")
      if (response.ok) {
        const data = await response.json()
        setRoutes(data.routes || [])
      }
    } catch (error) {
      console.error("Error fetching routes:", error)
      toast({
        title: "Fehler",
        description: "Touren konnten nicht geladen werden",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPickupLocations = async () => {
    try {
      const response = await fetch("/api/admin/pickup-locations")
      if (response.ok) {
        const data = await response.json()
        const locations = data.locations || data
        setPickupLocations(Array.isArray(locations) ? locations.filter((loc: PickupLocation) => loc.is_active) : [])
      }
    } catch (error) {
      console.error("Error fetching pickup locations:", error)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch("/api/admin/delivery-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          display_order: routes.length,
        }),
      })

      if (response.ok) {
        await fetchRoutes()
        setIsCreateDialogOpen(false)
        resetForm()
        toast({
          title: "Erfolg",
          description: "Tour wurde erstellt",
        })
      } else {
        throw new Error("Failed to create route")
      }
    } catch (error) {
      console.error("Error creating route:", error)
      toast({
        title: "Fehler",
        description: "Tour konnte nicht erstellt werden",
        variant: "destructive",
      })
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRoute) return

    try {
      const response = await fetch(`/api/admin/delivery-routes/${selectedRoute.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...selectedRoute,
          ...formData,
        }),
      })

      if (response.ok) {
        await fetchRoutes()
        setIsEditDialogOpen(false)
        setSelectedRoute(null)
        resetForm()
        toast({
          title: "Erfolg",
          description: "Tour wurde aktualisiert",
        })
      } else {
        throw new Error("Failed to update route")
      }
    } catch (error) {
      console.error("Error updating route:", error)
      toast({
        title: "Fehler",
        description: "Tour konnte nicht aktualisiert werden",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!selectedRoute) return

    try {
      const response = await fetch(`/api/admin/delivery-routes/${selectedRoute.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchRoutes()
        setIsDeleteDialogOpen(false)
        setSelectedRoute(null)
        toast({
          title: "Erfolg",
          description: "Tour wurde gelöscht",
        })
      } else {
        throw new Error("Failed to delete route")
      }
    } catch (error) {
      console.error("Error deleting route:", error)
      toast({
        title: "Fehler",
        description: "Tour konnte nicht gelöscht werden",
        variant: "destructive",
      })
    }
  }

  const addLocationToRoute = async (routeId: string, locationId: string) => {
    try {
      const response = await fetch("/api/admin/route-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId, locationId }),
      })

      if (response.ok) {
        await fetchRoutes()

        const personsResponse = await fetch(`/api/admin/location-persons?locationId=${locationId}`)
        if (personsResponse.ok) {
          const personsData = await personsResponse.json()

          setLocationPersons((prev) => ({
            ...prev,
            [locationId]: personsData.assignments || [],
          }))
        }

        toast({
          title: "Erfolg",
          description: "Abholort zur Tour hinzugefügt",
        })
      }
    } catch (error) {
      console.error("[v0] Error adding location:", error)
      toast({
        title: "Fehler",
        description: "Fehler beim Hinzufügen des Abholortes",
        variant: "destructive",
      })
    }
  }

  const handleRemoveLocation = async (routeLocationId: string) => {
    try {
      const response = await fetch(`/api/admin/route-locations?id=${routeLocationId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchRoutes()
        toast({
          title: "Erfolg",
          description: "Abholort von Tour entfernt",
        })
      } else {
        throw new Error("Failed to remove location")
      }
    } catch (error) {
      console.error("Error removing location:", error)
      toast({
        title: "Fehler",
        description: "Abholort konnte nicht entfernt werden",
        variant: "destructive",
      })
    }
  }

  const handleDragEnd = async (result: DropResult, routeId: string) => {
    if (!result.destination) return

    const route = routes.find((r) => r.id === routeId)
    if (!route || !route.route_locations) return

    const items = Array.from(route.route_locations)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    const updates = items.map((item, index) => ({
      id: item.id,
      stop_order: index,
    }))

    setRoutes((prev) =>
      prev.map((r) =>
        r.id === routeId
          ? {
              ...r,
              route_locations: items.map((item, index) => ({
                ...item,
                stop_order: index,
              })),
            }
          : r,
      ),
    )

    try {
      const response = await fetch("/api/admin/route-locations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      })

      if (!response.ok) {
        throw new Error("Failed to update order")
      }
    } catch (error) {
      console.error("Error updating stop order:", error)
      await fetchRoutes()
      toast({
        title: "Fehler",
        description: "Reihenfolge konnte nicht gespeichert werden",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (route: DeliveryRoute) => {
    setSelectedRoute(route)
    setFormData({
      name: route.name,
      region: route.region || "",
      color: route.color || "#FF5733",
      notes: route.notes || "",
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (route: DeliveryRoute) => {
    setSelectedRoute(route)
    setIsDeleteDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      region: "",
      color: "#FF5733",
      notes: "",
    })
  }

  const toggleRoute = async (route: DeliveryRoute) => {
    try {
      const response = await fetch(`/api/admin/delivery-routes/${route.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...route,
          is_active: !route.is_active,
        }),
      })

      if (response.ok) {
        await fetchRoutes()
        toast({
          title: "Erfolg",
          description: `Tour ${!route.is_active ? "aktiviert" : "deaktiviert"}`,
        })
      }
    } catch (error) {
      console.error("Error toggling route:", error)
      toast({
        title: "Fehler",
        description: "Status konnte nicht geändert werden",
        variant: "destructive",
      })
    }
  }

  const getAvailableLocations = (routeId: string) => {
    const route = routes.find((r) => r.id === routeId)
    const assignedLocationIds = route?.route_locations?.map((rl) => rl.pickup_location.id) || []
    return pickupLocations.filter((loc) => !assignedLocationIds.includes(loc.id))
  }

  const loadRoutePersons = async (routeId: string) => {
    try {
      const response = await fetch(`/api/admin/route-persons?routeId=${routeId}`)
      if (response.ok) {
        const data = await response.json()
        setRoutePersons((prev) => ({
          ...prev,
          [routeId]: data.persons || [],
        }))
      }
    } catch (error) {
      console.error("[v0] Error loading route persons:", error)
    }
  }

  const removePersonFromTour = async (locationPersonId: string, routeId: string, locationId: string) => {
    try {
      const response = await fetch("/api/admin/location-persons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: locationPersonId,
          is_active: false,
        }),
      })

      if (response.ok) {
        // Reload persons for this location
        const personsResponse = await fetch(`/api/admin/location-persons?locationId=${locationId}`)
        if (personsResponse.ok) {
          const personsData = await personsResponse.json()
          setLocationPersons((prev) => ({
            ...prev,
            [locationId]: personsData.assignments || [],
          }))
        }

        toast({
          title: "Erfolg",
          description: "Verteilperson aus Tour entfernt",
        })
      }
    } catch (error) {
      console.error("[v0] Error removing person from tour:", error)
      toast({
        title: "Fehler",
        description: "Fehler beim Entfernen der Verteilperson",
        variant: "destructive",
      })
    }
  }

  const addPersonToTour = async (locationPersonId: string, locationId: string) => {
    try {
      const response = await fetch("/api/admin/location-persons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: locationPersonId,
          is_active: true,
        }),
      })

      if (response.ok) {
        // Reload persons for this location
        const personsResponse = await fetch(`/api/admin/location-persons?locationId=${locationId}`)
        if (personsResponse.ok) {
          const personsData = await personsResponse.json()
          setLocationPersons((prev) => ({
            ...prev,
            [locationId]: personsData.assignments || [],
          }))
        }

        toast({
          title: "Erfolg",
          description: "Verteilperson zur Tour hinzugefügt",
        })
      }
    } catch (error) {
      console.error("[v0] Error adding person to tour:", error)
      toast({
        title: "Fehler",
        description: "Fehler beim Hinzufügen der Verteilperson",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div>Lade Touren...</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Touren-Verwaltung</CardTitle>
          <CardDescription>Verwalten Sie Liefertouren und ordnen Sie Abholorte zu</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Neue Tour
            </Button>
          </div>

          <div className="space-y-4">
            {routes.map((route) => (
              <Card key={route.id} className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {route.color && (
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: route.color || "#cccccc" }}
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{route.name}</span>
                          {route.region && (
                            <Badge variant="outline" className="text-xs">
                              {route.region}
                            </Badge>
                          )}
                          <Badge variant={route.is_active ? "default" : "secondary"}>
                            {route.is_active ? "Aktiv" : "Inaktiv"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {route.route_locations?.length || 0} Abholort(e)
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExpandedRoute(expandedRoute === route.id ? null : route.id)}
                      >
                        {expandedRoute === route.id ? "Ausblenden" : "Details"}
                      </Button>
                      <Button
                        size="sm"
                        variant={route.is_active ? "outline" : "default"}
                        onClick={() => toggleRoute(route)}
                      >
                        {route.is_active ? "Deaktivieren" : "Aktivieren"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(route)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openDeleteDialog(route)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {expandedRoute === route.id && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Abholorte auf dieser Tour</h4>
                        <Select onValueChange={(value) => addLocationToRoute(route.id, value)}>
                          <SelectTrigger className="w-[280px]">
                            <SelectValue placeholder="Abholort hinzufügen..." />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableLocations(route.id).map((location) => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name} ({location.city})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {route.route_locations && route.route_locations.length > 0 ? (
                        <DragDropContext onDragEnd={(result) => handleDragEnd(result, route.id)}>
                          <Droppable droppableId={`route-${route.id}`}>
                            {(provided) => (
                              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                {route.route_locations
                                  .sort((a, b) => a.stop_order - b.stop_order)
                                  .map((routeLocation, index) => {
                                    const allPersons = locationPersons[routeLocation.pickup_location.id] || []
                                    const activePersons = allPersons.filter((lp: any) => lp.is_active)
                                    const inactivePersons = allPersons.filter((lp: any) => !lp.is_active)

                                    return (
                                      <Draggable key={routeLocation.id} draggableId={routeLocation.id} index={index}>
                                        {(provided) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className="flex items-start gap-3 rounded-lg border bg-card p-4"
                                          >
                                            <GripVertical className="mt-1 h-5 w-5 text-muted-foreground" />
                                            <div className="flex-1">
                                              <div className="flex items-center justify-between">
                                                <div>
                                                  <span className="font-medium">{index + 1}.</span>{" "}
                                                  {routeLocation.pickup_location.name}
                                                  <span className="ml-2 text-sm text-muted-foreground">
                                                    {routeLocation.pickup_location.city}
                                                  </span>
                                                </div>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleRemoveLocation(routeLocation.id)}
                                                >
                                                  <X className="h-4 w-4" />
                                                </Button>
                                              </div>

                                              {activePersons.length > 0 && (
                                                <div className="mt-2 space-y-1">
                                                  <div className="text-sm font-medium text-muted-foreground">
                                                    Verteilpersonen:
                                                  </div>
                                                  {activePersons.map((lp: any) => (
                                                    <div
                                                      key={lp.id}
                                                      className="flex items-center justify-between rounded bg-muted/50 p-2"
                                                    >
                                                      <span className="text-sm">
                                                        {lp.distribution_persons?.name || "Unbekannt"}
                                                      </span>
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                          removePersonFromTour(
                                                            lp.id,
                                                            route.id,
                                                            routeLocation.pickup_location.id,
                                                          )
                                                        }
                                                      >
                                                        <X className="h-4 w-4" />
                                                      </Button>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}

                                              {inactivePersons.length > 0 && (
                                                <div className="mt-2">
                                                  <Select
                                                    onValueChange={(value) =>
                                                      addPersonToTour(value, routeLocation.pickup_location.id)
                                                    }
                                                  >
                                                    <SelectTrigger className="w-full">
                                                      <SelectValue placeholder="Verteilperson hinzufügen..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      {inactivePersons.map((lp: any) => (
                                                        <SelectItem key={lp.id} value={lp.id}>
                                                          {lp.distribution_persons?.name || "Unbekannt"}
                                                        </SelectItem>
                                                      ))}
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </Draggable>
                                    )
                                  })}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </DragDropContext>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Noch keine Abholorte auf dieser Tour. Fügen Sie einen hinzu, um zu beginnen.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Tour erstellen</DialogTitle>
            <DialogDescription>Erstellen Sie eine neue Liefer-Tour</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="z.B. Tour Nord"
                  required
                />
              </div>
              <div>
                <Label htmlFor="region">Region</Label>
                <Input
                  id="region"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  placeholder="z.B. Hohenlohe Nord"
                />
              </div>
              <div>
                <Label htmlFor="color">Farbe</Label>
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-10"
                />
              </div>
              <div>
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
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false)
                  resetForm()
                }}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={!formData.name}>
                Erstellen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tour bearbeiten</DialogTitle>
            <DialogDescription>Bearbeiten Sie die Informationen der Tour</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 py-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_name">Name *</Label>
                <Input
                  id="edit_name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_region">Region</Label>
                <Input
                  id="edit_region"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_color">Farbe</Label>
                <Input
                  id="edit_color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-10"
                />
              </div>
              <div>
                <Label htmlFor="edit_notes">Notizen</Label>
                <Textarea
                  id="edit_notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false)
                  setSelectedRoute(null)
                  resetForm()
                }}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={!formData.name}>
                Speichern
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tour löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie die Tour "{selectedRoute?.name}" löschen möchten? Diese Aktion kann nicht
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

export default DeliveryRouteManagement
