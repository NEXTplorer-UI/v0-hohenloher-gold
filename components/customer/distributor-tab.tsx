"use client"

import { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, MapPin, Clock, Phone, Mail, Edit, Package } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DistributorTab() {
  const { data, error, isLoading, mutate } = useSWR("/api/customer/distributor-status", fetcher)
  const [showLocationEdit, setShowLocationEdit] = useState(false)
  const [locationForm, setLocationForm] = useState<any>({})
  const [isSaving, setIsSaving] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Fehler beim Laden der Verteiler-Informationen</p>
      </div>
    )
  }

  // Non-distributor: Show application form
  if (!data?.isDistributor) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Werden Sie Verteiler</h3>
          <p className="text-muted-foreground mb-6">
            Als Verteiler erhalten Sie attraktive Rabatte auf Ihre Bestellungen. Je mehr Kisten Sie bestellen, desto
            höher ist Ihr Rabatt.
          </p>
          <Button asChild>
            <a href="/distributor">Jetzt bewerben</a>
          </Button>
        </Card>
      </div>
    )
  }

  // Active distributor: Show dashboard
  const { profile, pickupLocation, stats, discountTable } = data

  const handleEditLocation = () => {
    setLocationForm(pickupLocation || {})
    setShowLocationEdit(true)
  }

  const handleSaveLocation = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/customer/pickup-location", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(locationForm),
      })

      if (!response.ok) throw new Error("Failed to update")

      toast.success("Abholort erfolgreich aktualisiert")
      setShowLocationEdit(false)
      mutate()
    } catch (error) {
      toast.error("Fehler beim Aktualisieren des Abholorts")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Verteiler-Status</h3>
          <Badge className="bg-green-100 text-green-800">Aktiv</Badge>
        </div>
        <div className="space-y-2">
          <p>
            <strong>Name:</strong> {profile.first_name} {profile.last_name}
          </p>
          <p>
            <strong>E-Mail:</strong> {profile.email}
          </p>
          {profile.distributor_code && (
            <p>
              <strong>Verteiler-Code:</strong> {profile.distributor_code}
            </p>
          )}
        </div>
      </Card>

      {/* Discount Overview */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Rabatt-System</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Bei der aktuellen Lieferung werden einige Kisten derselben Warenklasse nicht berechnet. Beispiel: Wenn Sie
          Cedri bestellen, erhalten Sie den Rabatt auch in Cedri-Kisten.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">Gekaufte Kisten</th>
                <th className="text-left py-2 px-4">Nicht berechnete Kisten (Rabatt)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(discountTable).map(([boxes, discount]) => (
                <tr key={boxes} className="border-b">
                  <td className="py-2 px-4">{boxes} Kisten</td>
                  <td className="py-2 px-4 font-semibold text-gold">{discount} Kisten</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Statistics */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Package className="h-5 w-5" />
          Ihre Rabatt-Statistik
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-amber-50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Gesamt bestellte Kisten</p>
            <p className="text-2xl font-bold text-gold">{stats.totalBoxesOrdered}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Nicht berechnete Kisten</p>
            <p className="text-2xl font-bold text-green-600">{stats.totalDiscountedBoxes}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Aktueller Rabatt</p>
            <p className="text-2xl font-bold text-blue-600">{stats.currentDiscount} Kisten</p>
          </div>
        </div>
      </Card>

      {/* Pickup Location */}
      {pickupLocation && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Abholort-Informationen</h3>
            <Button variant="outline" size="sm" onClick={handleEditLocation}>
              <Edit className="h-4 w-4 mr-2" />
              Bearbeiten
            </Button>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <MapPin className="h-5 w-5 text-gold mt-0.5" />
              <div>
                <p className="font-semibold">{pickupLocation.name}</p>
                <p className="text-sm text-muted-foreground">
                  {pickupLocation.address}, {pickupLocation.postal_code} {pickupLocation.city}
                </p>
              </div>
            </div>
            {(pickupLocation.pickup_hours_start || pickupLocation.pickup_hours_end) && (
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gold" />
                <p className="text-sm">
                  Abholzeiten: {pickupLocation.pickup_hours_start} - {pickupLocation.pickup_hours_end} Uhr
                </p>
              </div>
            )}
            {pickupLocation.contact_phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-gold" />
                <p className="text-sm">{pickupLocation.contact_phone}</p>
              </div>
            )}
            {pickupLocation.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-gold" />
                <p className="text-sm">{pickupLocation.email}</p>
              </div>
            )}
            {pickupLocation.notes && (
              <div className="mt-4 p-3 bg-amber-50 rounded">
                <p className="text-sm">{pickupLocation.notes}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Edit Location Modal */}
      <Dialog open={showLocationEdit} onOpenChange={setShowLocationEdit}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Abholort bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name des Abholorts</Label>
              <Input
                id="name"
                value={locationForm.name || ""}
                onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={locationForm.address || ""}
                  onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="city">Stadt</Label>
                <Input
                  id="city"
                  value={locationForm.city || ""}
                  onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="postal_code">PLZ</Label>
              <Input
                id="postal_code"
                value={locationForm.postal_code || ""}
                onChange={(e) => setLocationForm({ ...locationForm, postal_code: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pickup_hours_start">Abholzeit von</Label>
                <Input
                  id="pickup_hours_start"
                  placeholder="z.B. 09:00"
                  value={locationForm.pickup_hours_start || ""}
                  onChange={(e) => setLocationForm({ ...locationForm, pickup_hours_start: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="pickup_hours_end">Abholzeit bis</Label>
                <Input
                  id="pickup_hours_end"
                  placeholder="z.B. 18:00"
                  value={locationForm.pickup_hours_end || ""}
                  onChange={(e) => setLocationForm({ ...locationForm, pickup_hours_end: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="contact_person">Kontaktperson</Label>
              <Input
                id="contact_person"
                value={locationForm.contact_person || ""}
                onChange={(e) => setLocationForm({ ...locationForm, contact_person: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="contact_phone">Telefon</Label>
              <Input
                id="contact_phone"
                value={locationForm.contact_phone || ""}
                onChange={(e) => setLocationForm({ ...locationForm, contact_phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={locationForm.email || ""}
                onChange={(e) => setLocationForm({ ...locationForm, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="notes">Hinweise</Label>
              <Textarea
                id="notes"
                rows={3}
                value={locationForm.notes || ""}
                onChange={(e) => setLocationForm({ ...locationForm, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowLocationEdit(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSaveLocation} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Speichern
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
