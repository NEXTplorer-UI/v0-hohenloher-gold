"use client"

import { useState, useMemo, useCallback, memo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Mail, Search, Filter, Loader2, ChevronDown, ChevronUp, MapPin, Users } from "lucide-react"
import { mapDBToUIStatus, getEmailTemplateForStatus } from "@/lib/order-status-mapping"
import type { EmailTemplateId } from "@/lib/email/build"
import { useToast } from "@/hooks/use-toast"

interface OrderItem {
  id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  product_id?: number
  weight?: number
}

interface Order {
  id: string
  order_number: string
  customer_id: string
  status: string
  total: number
  delivery_method: string
  pickup_location: string | null
  payment_method: string
  payment_status: string
  notes: string | null
  admin_notes: string | null // Added admin_notes field
  created_at: string
  customer: {
    first_name: string
    last_name: string
    email: string
    phone: string | null
  }
  order_items: OrderItem[]
}

function parseBulkOrderNames(notes: string | null): string[] {
  if (!notes) return []

  const lines = notes.split("\n")
  const names: string[] = []
  let inBulkSection = false

  for (const line of lines) {
    if (line.includes("Sammelbestellung für:")) {
      inBulkSection = true
      continue
    }

    if (inBulkSection) {
      // Match lines like "1. Name" or "- Name"
      const match = line.match(/^\d+\.\s*(.+)$/) || line.match(/^-\s*(.+)$/)
      if (match && match[1].trim()) {
        names.push(match[1].trim())
      } else if (line.trim() && !line.includes(":")) {
        // Stop if we hit a line that doesn't match the pattern
        break
      }
    }
  }

  return names
}

const OrderItem = memo(
  ({
    order,
    onNotify,
    onStatusChange,
    onAdminNotesChange, // Added onAdminNotesChange prop
  }: {
    order: Order
    onNotify: (orderId: string, templateId?: EmailTemplateId) => void
    onStatusChange: (orderId: string, status?: string, paymentStatus?: string) => void
    onAdminNotesChange: (orderId: string, adminNotes: string) => void // Added prop type
  }) => {
    const [showItems, setShowItems] = useState(false)
    const [showBulkNames, setShowBulkNames] = useState(false)
    const [showAdminNotes, setShowAdminNotes] = useState(false) // Added state for admin notes visibility
    const [adminNotes, setAdminNotes] = useState(order.admin_notes || "") // Added state for admin notes
    const [isSavingNotes, setIsSavingNotes] = useState(false) // Added loading state
    const customerName = `${order.customer.first_name} ${order.customer.last_name}`
    const orderDate = new Date(order.created_at).toLocaleDateString("de-DE")
    const items = order.order_items.map((item) => `${item.product_name} (${item.quantity}x)`).join(", ")

    const bulkOrderNames = useMemo(() => parseBulkOrderNames(order.notes), [order.notes])
    const isBulkOrder = bulkOrderNames.length > 0

    const handleSaveAdminNotes = async () => {
      setIsSavingNotes(true)
      try {
        await onAdminNotesChange(order.id, adminNotes)
      } finally {
        setIsSavingNotes(false)
      }
    }

    const getPaymentMethodDisplay = (method: string) => {
      switch (method) {
        case "cash":
          return "Barzahlung"
        case "card":
          return "Kartenzahlung"
        case "bank_transfer":
          return "Überweisung"
        default:
          return method
      }
    }

    const getPaymentStatusDisplay = (status: string) => {
      switch (status) {
        case "paid":
          return "Bezahlt"
        case "pending":
          return "Ausstehend"
        case "failed":
          return "Fehlgeschlagen"
        default:
          return status
      }
    }

    const getStatusDisplay = (status: string) => {
      switch (status) {
        case "confirmed":
          return "Bestätigt"
        case "ready":
          return "Bereit"
        case "picked_up":
          return "Abgeholt"
        case "cancelled":
          return "Storniert"
        case "pending":
          return "Ausstehend"
        default:
          return status
      }
    }

    const getStatusVariant = (status: string) => {
      switch (status) {
        case "picked_up":
          return "default"
        case "ready":
          return "secondary"
        case "confirmed":
          return "outline"
        case "cancelled":
          return "destructive"
        default:
          return "outline"
      }
    }

    const totalWeight = useMemo(() => {
      return order.order_items.reduce((sum, item) => {
        const itemWeight = item.weight || 0
        return sum + itemWeight * item.quantity
      }, 0)
    }, [order.order_items])

    const uiStatus = mapDBToUIStatus(order.status as any)

    return (
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{order.order_number}</span>
              <Badge variant={getStatusVariant(uiStatus)}>{getStatusDisplay(uiStatus)}</Badge>
              {isBulkOrder && (
                <Badge variant="secondary" className="gap-1">
                  <Users className="h-3 w-3" />
                  Sammelbestellung ({bulkOrderNames.length})
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              <div>
                {customerName} • {order.customer.email}
              </div>
              <div className="flex items-center gap-1">
                <span>{orderDate}</span>
                {order.pickup_location && (
                  <>
                    <span>•</span>
                    <MapPin className="h-3 w-3" />
                    <span className="font-medium">{order.pickup_location}</span>
                  </>
                )}
                {!order.pickup_location && <span>• Lieferung</span>}
              </div>
              <div>
                {getPaymentMethodDisplay(order.payment_method)} • {getPaymentStatusDisplay(order.payment_status)}
              </div>
              {isBulkOrder && (
                <div className="mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBulkNames(!showBulkNames)}
                    className="h-auto p-0 text-sm text-muted-foreground hover:text-foreground"
                  >
                    {showBulkNames ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                    Namen anzeigen ({bulkOrderNames.length} Personen)
                  </Button>
                  {showBulkNames && (
                    <div className="mt-2 pl-4 border-l-2 border-muted space-y-1">
                      {bulkOrderNames.map((name, index) => (
                        <div key={index} className="text-sm">
                          {index + 1}. {name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowItems(!showItems)}
                  className="h-auto p-0 text-sm text-muted-foreground hover:text-foreground"
                >
                  {showItems ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                  {order.order_items.length} Artikel anzeigen ({totalWeight.toFixed(2)} kg)
                </Button>
                {showItems && (
                  <div className="mt-2 pl-4 border-l-2 border-muted space-y-1">
                    {order.order_items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>
                          {item.product_id ? `#${item.product_id} - ` : ""}
                          {item.product_name} ({item.quantity}x)
                          {item.weight ? ` • ${(item.weight * item.quantity).toFixed(2)} kg` : ""}
                        </span>
                        <span>€{item.total_price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {order.notes && !isBulkOrder && <div>Notiz: {order.notes}</div>}
              <div className="mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdminNotes(!showAdminNotes)}
                  className="h-auto p-0 text-sm text-muted-foreground hover:text-foreground"
                >
                  {showAdminNotes ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                  Admin-Notizen {order.admin_notes ? "(vorhanden)" : "(leer)"}
                </Button>
                {showAdminNotes && (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Interne Notizen zur Bestellung (nur für Admins sichtbar)..."
                      className="w-full min-h-[80px] p-2 text-sm border rounded-md resize-y"
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveAdminNotes}
                      disabled={isSavingNotes || adminNotes === order.admin_notes}
                    >
                      {isSavingNotes ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Notizen speichern
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="font-bold">€{order.total.toFixed(2)}</span>
            <div className="flex gap-2">
              <Select value={uiStatus} onValueChange={(value) => onStatusChange(order.id, value, undefined)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Ausstehend</SelectItem>
                  <SelectItem value="confirmed">Bestätigt</SelectItem>
                  <SelectItem value="ready">Bereit</SelectItem>
                  <SelectItem value="picked_up">Abgeholt</SelectItem>
                  <SelectItem value="cancelled">Storniert</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={order.payment_status}
                onValueChange={(value) => onStatusChange(order.id, undefined, value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Ausstehend</SelectItem>
                  <SelectItem value="paid">Bezahlt</SelectItem>
                  <SelectItem value="failed">Fehlgeschlagen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const templateId = getEmailTemplateForStatus(uiStatus)
                onNotify(order.id, templateId as EmailTemplateId)
              }}
            >
              <Mail className="h-4 w-4 mr-2" />
              Benachrichtigen
            </Button>
          </div>
        </div>
      </Card>
    )
  },
)

OrderItem.displayName = "OrderItem"

function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const { toast } = useToast()

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("[v0] Fetching orders from database...")

      const response = await fetch("/api/admin/orders", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      })

      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to fetch orders")
        } else {
          const errorText = await response.text()
          console.error("[v0] Non-JSON error response:", errorText.substring(0, 200))
          throw new Error(`Server error: ${response.status} ${response.statusText}`)
        }
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const responseText = await response.text()
        console.error("[v0] Expected JSON but got:", responseText.substring(0, 200))
        throw new Error("Server returned invalid response format")
      }

      const ordersData = await response.json()

      console.log("[v0] Successfully loaded orders:", ordersData?.length || 0)
      setOrders(ordersData || [])
    } catch (err) {
      console.error("[v0] Unexpected error fetching orders:", err)
      setError(`Fehler beim Laden der Bestellungen: ${err instanceof Error ? err.message : "Unbekannter Fehler"}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const customerName = `${order.customer.first_name} ${order.customer.last_name}`.toLowerCase()
      const matchesSearch =
        customerName.includes(searchTerm.toLowerCase()) ||
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === "all" || order.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [orders, searchTerm, statusFilter])

  const exportOrders = useCallback(async () => {
    try {
      console.log("[v0] Starting orders export...")

      const response = await fetch("/api/admin/orders-export")

      if (!response.ok) {
        throw new Error("Failed to export orders")
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `bestellungen-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)

      console.log("[v0] Orders export completed")
    } catch (error) {
      console.error("[v0] Error exporting orders:", error)
    }
  }, [])

  const handleNotify = useCallback(
    async (orderId: string, templateId?: EmailTemplateId) => {
      const order = orders.find((o) => o.id === orderId)
      if (!order) return

      try {
        console.log(`[v0] Sending notification for order ${order.order_number}`)

        const response = await fetch("/api/admin/notify-customer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: order.id,
            templateId,
          }),
        })

        if (response.ok) {
          console.log(`[v0] Notification sent successfully for order ${order.order_number}`)
          alert(`Benachrichtigung wurde an ${order.customer.email} gesendet`)
        } else {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
          console.error(`[v0] Failed to send notification for order ${order.order_number}:`, errorData)
          alert(`Fehler: ${errorData.error || "Benachrichtigung konnte nicht gesendet werden"}`)
        }
      } catch (error) {
        console.error(`[v0] Error sending notification:`, error)
        alert(`Fehler: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`)
      }
    },
    [orders],
  )

  const handleStatusChange = useCallback(
    async (orderId: string, status?: string, paymentStatus?: string) => {
      try {
        console.log(`[v0] Updating order ${orderId} status:`, { status, paymentStatus })

        const previousOrders = orders

        // Optimistic update
        setOrders((prevOrders) =>
          prevOrders.map((order) => {
            if (order.id === orderId) {
              return {
                ...order,
                ...(status && { status }),
                ...(paymentStatus && { payment_status: paymentStatus }),
              }
            }
            return order
          }),
        )

        const response = await fetch("/api/admin/update-order-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId,
            status,
            paymentStatus,
          }),
        })

        if (response.ok) {
          console.log(`[v0] Order status updated successfully`)

          const { order: updatedOrder } = await response.json()

          setOrders((prevOrders) =>
            prevOrders.map((order) => {
              if (order.id === orderId && updatedOrder) {
                return {
                  ...order,
                  status: updatedOrder.status,
                  payment_status: updatedOrder.payment_status,
                }
              }
              return order
            }),
          )

          toast({
            title: "Status aktualisiert",
            description: "Der Bestellstatus wurde erfolgreich geändert",
          })
        } else {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
          console.error(`[v0] Failed to update order status:`, errorData)

          setOrders(previousOrders)

          toast({
            title: "Fehler",
            description: errorData.error || "Status konnte nicht geändert werden",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error(`[v0] Error updating order status:`, error)

        await fetchOrders()

        toast({
          title: "Fehler",
          description: error instanceof Error ? error.message : "Unbekannter Fehler",
          variant: "destructive",
        })
      }
    },
    [orders, fetchOrders, toast],
  )

  const handleAdminNotesChange = useCallback(
    async (orderId: string, adminNotes: string) => {
      try {
        console.log(`[v0] Updating admin notes for order ${orderId}`)

        const response = await fetch("/api/admin/update-order-notes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId,
            adminNotes,
          }),
        })

        if (response.ok) {
          console.log(`[v0] Admin notes updated successfully`)

          setOrders((prevOrders) =>
            prevOrders.map((order) => {
              if (order.id === orderId) {
                return {
                  ...order,
                  admin_notes: adminNotes,
                }
              }
              return order
            }),
          )

          toast({
            title: "Notizen gespeichert",
            description: "Die Admin-Notizen wurden erfolgreich gespeichert",
          })
        } else {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
          console.error(`[v0] Failed to update admin notes:`, errorData)

          toast({
            title: "Fehler",
            description: errorData.error || "Notizen konnten nicht gespeichert werden",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error(`[v0] Error updating admin notes:`, error)

        toast({
          title: "Fehler",
          description: error instanceof Error ? error.message : "Unbekannter Fehler",
          variant: "destructive",
        })
      }
    },
    [toast],
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Bestellungen verwalten</CardTitle>
            <CardDescription>Übersicht und Verwaltung aller Kundenbestellungen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Bestellungen werden geladen...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Bestellungen verwalten</CardTitle>
            <CardDescription>Übersicht und Verwaltung aller Kundenbestellungen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center p-8">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchOrders}>Erneut versuchen</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bestellungen verwalten</CardTitle>
          <CardDescription>Übersicht und Verwaltung aller Kundenbestellungen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nach Kunde oder Bestellnummer suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="pending">Ausstehend</SelectItem>
                <SelectItem value="confirmed">Bestätigt</SelectItem>
                <SelectItem value="ready">Bereit</SelectItem>
                <SelectItem value="picked_up">Abgeholt</SelectItem>
                <SelectItem value="cancelled">Storniert</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportOrders} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Excel Export
            </Button>
            <Button onClick={fetchOrders} variant="outline">
              Aktualisieren
            </Button>
          </div>

          <div className="text-sm text-muted-foreground mb-4">
            {filteredOrders.length} von {orders.length} Bestellungen
          </div>

          <div className="h-96 overflow-auto border rounded-lg">
            <div className="space-y-2 p-4">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {orders.length === 0
                    ? "Keine Bestellungen vorhanden"
                    : "Keine Bestellungen entsprechen den Filterkriterien"}
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <OrderItem
                    key={order.id}
                    order={order}
                    onNotify={handleNotify}
                    onStatusChange={handleStatusChange}
                    onAdminNotesChange={handleAdminNotesChange} // Added prop
                  />
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default memo(OrderManagement)
