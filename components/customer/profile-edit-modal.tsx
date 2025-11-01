"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Customer {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  street?: string
  house_number?: string
  postal_code?: string
  city?: string
  country?: string
}

interface ProfileEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer
  onSuccess: () => void
}

export function ProfileEditModal({ open, onOpenChange, customer, onSuccess }: ProfileEditModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    first_name: customer.first_name || "",
    last_name: customer.last_name || "",
    phone: customer.phone || "",
    street: customer.street || "",
    house_number: customer.house_number || "",
    postal_code: customer.postal_code || "",
    city: customer.city || "",
    country: customer.country || "Deutschland",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Aktualisieren des Profils")
      }

      toast.success("Profil erfolgreich aktualisiert")
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error updating profile:", error)
      toast.error(error.message || "Fehler beim Aktualisieren des Profils")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Profil bearbeiten</DialogTitle>
          <DialogDescription>Aktualisieren Sie Ihre persönlichen Daten</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">
                Vorname <span className="text-red-500">*</span>
              </Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">
                Nachname <span className="text-red-500">*</span>
              </Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" value={customer.email} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">E-Mail-Adresse kann nicht geändert werden</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="street">Straße</Label>
              <Input
                id="street"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="house_number">Hausnr.</Label>
              <Input
                id="house_number"
                value={formData.house_number}
                onChange={(e) => setFormData({ ...formData, house_number: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postal_code">PLZ</Label>
              <Input
                id="postal_code"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="city">Stadt</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Land</Label>
            <Input
              id="country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
