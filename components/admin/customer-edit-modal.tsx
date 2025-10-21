"use client"
import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ExtendedCustomer {
  id: string
  first_name: string
  last_name: string
  email: string
  street?: string
  house_number?: string
  postal_code?: string
  city?: string
  phone?: string
  tags: string[]
  // New fields
  account_status?: "has_account" | "no_account"
  customer_status?: "active" | "inactive" | "blocked"
  registration_date?: string
  last_activity?: string
  newsletter_subscription?: boolean
  reminder_notifications?: boolean
  special_requests?: string
  referral_source?: string
  distribution_system_benefits?: {
    participated: boolean
    total_benefits: number
    last_benefit_date?: string
  }
  order_count?: number
  average_order_value?: number
  favorite_categories?: string[]
  total_orders?: number
  total_spent?: number
  last_order_date?: string
}

interface CustomerEditModalProps {
  customer: ExtendedCustomer | null
  isOpen: boolean
  onClose: () => void
  onSave: (customer: ExtendedCustomer) => Promise<void>
  availableTags: string[]
  onAddTag: (tag: string) => void
}

export default function CustomerEditModal({
  customer,
  isOpen,
  onClose,
  onSave,
  availableTags,
  onAddTag,
}: CustomerEditModalProps) {
  const [editingCustomer, setEditingCustomer] = useState<ExtendedCustomer | null>(customer)
  const [newTag, setNewTag] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    console.log("[v0] CustomerEditModal - customer prop changed:", customer)
    setEditingCustomer(customer)
  }, [customer])

  const handleSave = async () => {
    if (!editingCustomer) return

    console.log("[v0] CustomerEditModal - saving customer:", editingCustomer)
    setSaving(true)
    try {
      await onSave(editingCustomer)
      onClose()
    } catch (error) {
      console.error("[v0] Error saving customer:", error)
    } finally {
      setSaving(false)
    }
  }

  const addCustomTag = () => {
    if (newTag.trim() && !availableTags.includes(newTag.trim())) {
      onAddTag(newTag.trim())
      setNewTag("")
    }
  }

  const addTagToCustomer = (tag: string) => {
    if (editingCustomer && !editingCustomer.tags.includes(tag)) {
      setEditingCustomer({
        ...editingCustomer,
        tags: [...(editingCustomer.tags || []), tag],
      })
    }
  }

  const removeTagFromCustomer = (tagToRemove: string) => {
    if (editingCustomer) {
      setEditingCustomer({
        ...editingCustomer,
        tags: (editingCustomer.tags || []).filter((tag) => tag !== tagToRemove),
      })
    }
  }

  if (!editingCustomer) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kunde bearbeiten</DialogTitle>
          <DialogDescription>
            Bearbeiten Sie die Kundendaten und klicken Sie auf "Speichern", um die Änderungen zu übernehmen.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">Vorname</Label>
            <Input
              id="first_name"
              value={editingCustomer.first_name || ""}
              onChange={(e) => setEditingCustomer({ ...editingCustomer, first_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Nachname</Label>
            <Input
              id="last_name"
              value={editingCustomer.last_name || ""}
              onChange={(e) => setEditingCustomer({ ...editingCustomer, last_name: e.target.value })}
            />
          </div>
          <div className="space-y-2 col-span-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              value={editingCustomer.email || ""}
              onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="street">Straße</Label>
            <Input
              id="street"
              value={editingCustomer.street || ""}
              onChange={(e) => setEditingCustomer({ ...editingCustomer, street: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="house_number">Hausnummer</Label>
            <Input
              id="house_number"
              value={editingCustomer.house_number || ""}
              onChange={(e) => setEditingCustomer({ ...editingCustomer, house_number: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postal_code">PLZ</Label>
            <Input
              id="postal_code"
              value={editingCustomer.postal_code || ""}
              onChange={(e) => setEditingCustomer({ ...editingCustomer, postal_code: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Stadt</Label>
            <Input
              id="city"
              value={editingCustomer.city || ""}
              onChange={(e) => setEditingCustomer({ ...editingCustomer, city: e.target.value })}
            />
          </div>
          <div className="space-y-2 col-span-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              value={editingCustomer.phone || ""}
              onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
            />
          </div>

          {/* Tags Management Section */}
          <div className="space-y-2 col-span-2">
            <Label>Tags verwalten</Label>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Aktuelle Tags:</Label>
              <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-md bg-gray-50">
                {editingCustomer.tags && editingCustomer.tags.length > 0 ? (
                  editingCustomer.tags.map((tag: string, index: number) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-red-500"
                        onClick={() => removeTagFromCustomer(tag)}
                      />
                    </Badge>
                  ))
                ) : (
                  <span className="text-gray-400 text-sm">Keine Tags zugewiesen</span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tag hinzufügen:</Label>
              <Select onValueChange={addTagToCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="Verfügbare Tags auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {availableTags
                    .filter((tag) => !editingCustomer.tags?.includes(tag))
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
            <div className="space-y-2">
              <Label className="text-sm font-medium">Alle verfügbaren Tags:</Label>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-2 border rounded-md bg-gray-50">
                {availableTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className={`text-xs cursor-pointer hover:bg-blue-100 ${
                      editingCustomer.tags?.includes(tag) ? "bg-blue-200" : ""
                    }`}
                    onClick={() => addTagToCustomer(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* New customer status fields */}
          <div className="space-y-2">
            <Label htmlFor="customer_status">Kundenstatus</Label>
            <Select
              value={editingCustomer?.customer_status || "active"}
              onValueChange={(value) =>
                setEditingCustomer({
                  ...editingCustomer!,
                  customer_status: value as "active" | "inactive" | "blocked",
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="inactive">Inaktiv</SelectItem>
                <SelectItem value="blocked">Gesperrt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_status">Kontostatus</Label>
            <Select
              value={editingCustomer?.account_status || "no_account"}
              onValueChange={(value) =>
                setEditingCustomer({
                  ...editingCustomer!,
                  account_status: value as "has_account" | "no_account",
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="has_account">Hat Konto</SelectItem>
                <SelectItem value="no_account">Kein Konto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Communication preferences */}
          <div className="space-y-2">
            <Label>Newsletter-Abonnement</Label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="newsletter_subscription"
                checked={editingCustomer?.newsletter_subscription || false}
                onChange={(e) =>
                  setEditingCustomer({
                    ...editingCustomer!,
                    newsletter_subscription: e.target.checked,
                  })
                }
                className="rounded border-gray-300"
              />
              <Label htmlFor="newsletter_subscription" className="text-sm">
                Newsletter abonniert
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Erinnerungsfunktion</Label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="reminder_notifications"
                checked={editingCustomer?.reminder_notifications || false}
                onChange={(e) =>
                  setEditingCustomer({
                    ...editingCustomer!,
                    reminder_notifications: e.target.checked,
                  })
                }
                className="rounded border-gray-300"
              />
              <Label htmlFor="reminder_notifications" className="text-sm">
                Erinnerungen aktiviert
              </Label>
            </div>
          </div>

          {/* Referral source */}
          <div className="space-y-2">
            <Label htmlFor="referral_source">Empfehlungsquelle</Label>
            <Input
              id="referral_source"
              value={editingCustomer?.referral_source || ""}
              onChange={(e) =>
                setEditingCustomer({
                  ...editingCustomer!,
                  referral_source: e.target.value,
                })
              }
              placeholder="Wie hat der Kunde von uns erfahren?"
            />
          </div>

          {/* Special requests */}
          <div className="space-y-2 col-span-2">
            <Label htmlFor="special_requests">Besondere Wünsche</Label>
            <textarea
              id="special_requests"
              value={editingCustomer?.special_requests || ""}
              onChange={(e) =>
                setEditingCustomer({
                  ...editingCustomer!,
                  special_requests: e.target.value,
                })
              }
              placeholder="Notizen zu Kundenpräferenzen..."
              className="w-full p-2 border rounded-md resize-none h-20"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Speichere..." : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
