"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Calendar, Plus, Edit, Trash2, Check, X, AlertCircle } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

interface DeliverySchedule {
  id: string
  delivery_date: string
  fruit_types: string[]
  status: "planned" | "confirmed" | "completed" | "cancelled"
  order_deadline: string
  notes: string | null
  created_at: string
  updated_at: string
}

export default function DeliveryScheduleManagement() {
  const [schedules, setSchedules] = useState<DeliverySchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const [formData, setFormData] = useState({
    delivery_date: "",
    fruit_types: "",
    status: "planned" as const,
    order_deadline: "",
    notes: "",
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const loadSchedules = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("delivery_schedules")
        .select("*")
        .order("delivery_date", { ascending: true })

      if (error) throw error

      setSchedules(data || [])
    } catch (error) {
      console.error("Error loading delivery schedules:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchedules()
  }, [])

  const handleAdd = () => {
    setIsAdding(true)
    setFormData({
      delivery_date: "",
      fruit_types: "",
      status: "planned",
      order_deadline: "",
      notes: "",
    })
  }

  const handleEdit = (schedule: DeliverySchedule) => {
    setEditingId(schedule.id)
    setFormData({
      delivery_date: schedule.delivery_date,
      fruit_types: schedule.fruit_types.join(", "),
      status: schedule.status,
      order_deadline: schedule.order_deadline,
      notes: schedule.notes || "",
    })
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setFormData({
      delivery_date: "",
      fruit_types: "",
      status: "planned",
      order_deadline: "",
      notes: "",
    })
  }

  const handleSave = async () => {
    try {
      const fruitTypesArray = formData.fruit_types
        .split(",")
        .map((f) => f.trim())
        .filter((f) => f.length > 0)

      const scheduleData = {
        delivery_date: formData.delivery_date,
        fruit_types: fruitTypesArray,
        status: formData.status,
        order_deadline: formData.order_deadline,
        notes: formData.notes || null,
        updated_at: new Date().toISOString(),
      }

      if (isAdding) {
        const { error } = await supabase.from("delivery_schedules").insert([scheduleData])

        if (error) throw error
      } else if (editingId) {
        const { error } = await supabase.from("delivery_schedules").update(scheduleData).eq("id", editingId)

        if (error) throw error
      }

      await loadSchedules()
      handleCancel()
    } catch (error) {
      console.error("Error saving delivery schedule:", error)
      alert("Fehler beim Speichern des Liefertermins")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Möchten Sie diesen Liefertermin wirklich löschen?")) return

    try {
      const { error } = await supabase.from("delivery_schedules").delete().eq("id", id)

      if (error) throw error

      await loadSchedules()
    } catch (error) {
      console.error("Error deleting delivery schedule:", error)
      alert("Fehler beim Löschen des Liefertermins")
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      planned: { variant: "secondary", label: "Geplant" },
      confirmed: { variant: "default", label: "Bestätigt" },
      completed: { variant: "outline", label: "Abgeschlossen" },
      cancelled: { variant: "destructive", label: "Abgesagt" },
    }

    const config = variants[status] || variants.planned

    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  }

  const isDeadlinePassed = (deadline: string) => {
    return new Date(deadline) < new Date()
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Lade Liefertermine...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Liefertermine für Südfrüchte
            </CardTitle>
            <CardDescription>Verwalten Sie die Liefertermine für frische Südfrüchte</CardDescription>
          </div>
          <Button onClick={handleAdd} disabled={isAdding} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Neuer Termin
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && (
          <div className="p-4 border rounded-lg bg-accent/5 space-y-4">
            <h3 className="font-semibold">Neuen Liefertermin hinzufügen</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="delivery_date">Lieferdatum *</Label>
                <Input
                  id="delivery_date"
                  type="date"
                  value={formData.delivery_date}
                  onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="order_deadline">Bestellschluss *</Label>
                <Input
                  id="order_deadline"
                  type="date"
                  value={formData.order_deadline}
                  onChange={(e) => setFormData({ ...formData, order_deadline: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="fruit_types">Verfügbare Früchte (kommagetrennt) *</Label>
              <Input
                id="fruit_types"
                placeholder="z.B. Orangen, Zitronen, Clementinen"
                value={formData.fruit_types}
                onChange={(e) => setFormData({ ...formData, fruit_types: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full p-2 border rounded"
              >
                <option value="planned">Geplant</option>
                <option value="confirmed">Bestätigt</option>
                <option value="completed">Abgeschlossen</option>
                <option value="cancelled">Abgesagt</option>
              </select>
            </div>
            <div>
              <Label htmlFor="notes">Notizen</Label>
              <Input
                id="notes"
                placeholder="Optionale Notizen zum Liefertermin"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm">
                <Check className="h-4 w-4 mr-2" />
                Speichern
              </Button>
              <Button onClick={handleCancel} variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                Abbrechen
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {schedules.length === 0 && !isAdding && (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Keine Liefertermine vorhanden</p>
              <p className="text-sm">Fügen Sie einen neuen Termin hinzu</p>
            </div>
          )}

          {schedules.map((schedule) => (
            <div key={schedule.id} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
              {editingId === schedule.id ? (
                <div className="space-y-4">
                  <h3 className="font-semibold">Liefertermin bearbeiten</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`edit_delivery_date_${schedule.id}`}>Lieferdatum *</Label>
                      <Input
                        id={`edit_delivery_date_${schedule.id}`}
                        type="date"
                        value={formData.delivery_date}
                        onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`edit_order_deadline_${schedule.id}`}>Bestellschluss *</Label>
                      <Input
                        id={`edit_order_deadline_${schedule.id}`}
                        type="date"
                        value={formData.order_deadline}
                        onChange={(e) => setFormData({ ...formData, order_deadline: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor={`edit_fruit_types_${schedule.id}`}>Verfügbare Früchte (kommagetrennt) *</Label>
                    <Input
                      id={`edit_fruit_types_${schedule.id}`}
                      placeholder="z.B. Orangen, Zitronen, Clementinen"
                      value={formData.fruit_types}
                      onChange={(e) => setFormData({ ...formData, fruit_types: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`edit_status_${schedule.id}`}>Status</Label>
                    <select
                      id={`edit_status_${schedule.id}`}
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full p-2 border rounded"
                    >
                      <option value="planned">Geplant</option>
                      <option value="confirmed">Bestätigt</option>
                      <option value="completed">Abgeschlossen</option>
                      <option value="cancelled">Abgesagt</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor={`edit_notes_${schedule.id}`}>Notizen</Label>
                    <Input
                      id={`edit_notes_${schedule.id}`}
                      placeholder="Optionale Notizen zum Liefertermin"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave} size="sm">
                      <Check className="h-4 w-4 mr-2" />
                      Speichern
                    </Button>
                    <Button onClick={handleCancel} variant="outline" size="sm">
                      <X className="h-4 w-4 mr-2" />
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{formatDate(schedule.delivery_date)}</h3>
                      {getStatusBadge(schedule.status)}
                      {isDeadlinePassed(schedule.order_deadline) && schedule.status !== "completed" && (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-600">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Bestellschluss vorbei
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>
                        <strong>Bestellschluss:</strong> {formatDate(schedule.order_deadline)}
                      </p>
                      <p>
                        <strong>Verfügbare Früchte:</strong> {schedule.fruit_types.join(", ")}
                      </p>
                      {schedule.notes && (
                        <p>
                          <strong>Notizen:</strong> {schedule.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleEdit(schedule)} variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => handleDelete(schedule.id)} variant="outline" size="sm">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
