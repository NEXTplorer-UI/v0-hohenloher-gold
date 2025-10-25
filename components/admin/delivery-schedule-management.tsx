"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar, Plus, Edit, Trash2, Check, X, AlertCircle, Clock, RefreshCw } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { useDeliverySchedulesSWR } from "@/hooks/use-delivery-schedules-swr"

interface DeliverySchedule {
  id: string
  delivery_date: string
  status: "planned" | "confirmed" | "completed" | "cancelled"
  order_deadline: string
  notes: string | null
  pickup_start_time: string | null
  pickup_end_time: string | null
  created_at: string
  updated_at: string
  products?: Product[]
}

interface Product {
  id: number
  name: string
  category_id: number
  categories?: { name: string }
}

export default function DeliveryScheduleManagement() {
  const { schedules, isLoading: loading, refresh: loadSchedules } = useDeliverySchedulesSWR()

  const [products, setProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const [formData, setFormData] = useState({
    delivery_date: "",
    selectedProductIds: [] as number[],
    status: "planned" as const,
    order_deadline: "",
    pickup_start_time: "",
    pickup_end_time: "",
    notes: "",
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("id, name").order("name")

      if (error) throw error

      setCategories(data || [])
    } catch (error) {
      console.error("Error loading categories:", error)
    }
  }

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, category_id, categories(name)")
        .eq("is_active", true)
        .order("name")

      if (error) throw error

      setProducts(data || [])
    } catch (error) {
      console.error("Error loading products:", error)
    }
  }

  useEffect(() => {
    loadCategories()
    loadProducts()
  }, [])

  const filteredProducts =
    selectedCategory === "all" ? products : products.filter((p) => p.category_id === Number.parseInt(selectedCategory))

  const handleAdd = () => {
    setIsAdding(true)
    setFormData({
      delivery_date: "",
      selectedProductIds: [],
      status: "planned",
      order_deadline: "",
      pickup_start_time: "",
      pickup_end_time: "",
      notes: "",
    })
  }

  const handleEdit = (schedule: DeliverySchedule) => {
    setEditingId(schedule.id)
    setFormData({
      delivery_date: schedule.delivery_date,
      selectedProductIds: schedule.products?.map((p) => p.id) || [],
      status: schedule.status,
      order_deadline: schedule.order_deadline,
      pickup_start_time: schedule.pickup_start_time || "",
      pickup_end_time: schedule.pickup_end_time || "",
      notes: schedule.notes || "",
    })
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setFormData({
      delivery_date: "",
      selectedProductIds: [],
      status: "planned",
      order_deadline: "",
      pickup_start_time: "",
      pickup_end_time: "",
      notes: "",
    })
  }

  const toggleProduct = (productId: number) => {
    setFormData((prev) => ({
      ...prev,
      selectedProductIds: prev.selectedProductIds.includes(productId)
        ? prev.selectedProductIds.filter((id) => id !== productId)
        : [...prev.selectedProductIds, productId],
    }))
  }

  const handleSave = async () => {
    try {
      if (formData.pickup_start_time && formData.pickup_end_time) {
        if (formData.pickup_start_time >= formData.pickup_end_time) {
          alert("Die Endzeit muss nach der Startzeit liegen")
          return
        }
      }

      const scheduleData = {
        delivery_date: formData.delivery_date,
        status: formData.status,
        order_deadline: formData.order_deadline,
        pickup_start_time: formData.pickup_start_time || null,
        pickup_end_time: formData.pickup_end_time || null,
        notes: formData.notes || null,
        updated_at: new Date().toISOString(),
      }

      let scheduleId: string

      if (isAdding) {
        const { data, error } = await supabase.from("delivery_schedules").insert([scheduleData]).select().single()
        if (error) throw error
        scheduleId = data.id
      } else if (editingId) {
        const { error } = await supabase.from("delivery_schedules").update(scheduleData).eq("id", editingId)
        if (error) throw error
        scheduleId = editingId
        await supabase.from("delivery_schedule_products").delete().eq("delivery_schedule_id", scheduleId)
      } else {
        return
      }

      if (formData.selectedProductIds.length > 0) {
        const productAssociations = formData.selectedProductIds.map((productId) => ({
          delivery_schedule_id: scheduleId,
          product_id: productId,
        }))

        const { error: junctionError } = await supabase.from("delivery_schedule_products").insert(productAssociations)
        if (junctionError) throw junctionError
      }

      await loadSchedules()
      handleCancel()
    } catch (error) {
      console.error("Error saving delivery schedule:", error)
      alert("Fehler beim Speichern des Liefertermins: " + (error as Error).message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Möchten Sie diesen Liefertermin wirklich löschen?")) return

    try {
      await supabase.from("delivery_schedule_products").delete().eq("delivery_schedule_id", id)
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

  const formatTimeRange = (startTime: string | null, endTime: string | null) => {
    if (!startTime || !endTime) return null
    return `${startTime} - ${endTime} Uhr`
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
          <div className="flex gap-2">
            <Button onClick={loadSchedules} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Aktualisieren
            </Button>
            <Button onClick={handleAdd} disabled={isAdding} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Neuer Termin
            </Button>
          </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pickup_start_time" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Abholung von
                </Label>
                <Input
                  id="pickup_start_time"
                  type="time"
                  value={formData.pickup_start_time}
                  onChange={(e) => setFormData({ ...formData, pickup_start_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="pickup_end_time">Abholung bis</Label>
                <Input
                  id="pickup_end_time"
                  type="time"
                  value={formData.pickup_end_time}
                  onChange={(e) => setFormData({ ...formData, pickup_end_time: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Verfügbare Produkte auswählen *</Label>
              <div className="mt-2 mb-3">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-2 border rounded text-sm"
                >
                  <option value="all">Alle Kategorien</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-2 max-h-60 overflow-y-auto border rounded-lg p-3 space-y-2">
                {filteredProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keine Produkte in dieser Kategorie</p>
                ) : (
                  filteredProducts.map((product) => (
                    <div key={product.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`product-${product.id}`}
                        checked={formData.selectedProductIds.includes(product.id)}
                        onCheckedChange={() => toggleProduct(product.id)}
                      />
                      <label
                        htmlFor={`product-${product.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {product.name}
                        {product.categories && (
                          <span className="text-muted-foreground ml-2">({product.categories.name})</span>
                        )}
                      </label>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formData.selectedProductIds.length} Produkt(e) ausgewählt
              </p>
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
              <Button onClick={handleSave} size="sm" disabled={formData.selectedProductIds.length === 0}>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`edit_pickup_start_time_${schedule.id}`} className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Abholung von
                      </Label>
                      <Input
                        id={`edit_pickup_start_time_${schedule.id}`}
                        type="time"
                        value={formData.pickup_start_time}
                        onChange={(e) => setFormData({ ...formData, pickup_start_time: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`edit_pickup_end_time_${schedule.id}`}>Abholung bis</Label>
                      <Input
                        id={`edit_pickup_end_time_${schedule.id}`}
                        type="time"
                        value={formData.pickup_end_time}
                        onChange={(e) => setFormData({ ...formData, pickup_end_time: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Verfügbare Produkte auswählen *</Label>
                    <div className="mt-2 mb-3">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full p-2 border rounded text-sm"
                      >
                        <option value="all">Alle Kategorien</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id.toString()}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mt-2 max-h-60 overflow-y-auto border rounded-lg p-3 space-y-2">
                      {filteredProducts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Keine Produkte in dieser Kategorie</p>
                      ) : (
                        filteredProducts.map((product) => (
                          <div key={product.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-product-${product.id}`}
                              checked={formData.selectedProductIds.includes(product.id)}
                              onCheckedChange={() => toggleProduct(product.id)}
                            />
                            <label
                              htmlFor={`edit-product-${product.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {product.name}
                              {product.categories && (
                                <span className="text-muted-foreground ml-2">({product.categories.name})</span>
                              )}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.selectedProductIds.length} Produkt(e) ausgewählt
                    </p>
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
                    <Button onClick={handleSave} size="sm" disabled={formData.selectedProductIds.length === 0}>
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
                      {formatTimeRange(schedule.pickup_start_time, schedule.pickup_end_time) && (
                        <p className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <strong>Abholzeit:</strong>{" "}
                          {formatTimeRange(schedule.pickup_start_time, schedule.pickup_end_time)}
                        </p>
                      )}
                      <p>
                        <strong>Verfügbare Produkte:</strong>{" "}
                        {schedule.products && schedule.products.length > 0
                          ? schedule.products.map((p) => p.name).join(", ")
                          : "Keine Produkte zugeordnet"}
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
