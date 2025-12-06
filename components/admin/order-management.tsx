"use client"

import { useState, useMemo, useCallback, memo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Mail,
  Loader2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Users,
  RefreshCw,
  XCircle,
  FileText,
  ExternalLink,
  Send,
  Receipt,
  AlertCircle,
  Info,
} from "lucide-react"
import { mapDBToUIStatus } from "@/lib/order-status-mapping"
import type { EmailTemplateId } from "@/lib/email/build"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useTestMode } from "./test-mode-toggle" // Import useTestMode hook
import { useAdminCache } from "@/hooks/use-admin-cache"

interface OrderItem {
  id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  product_id?: number
  product_size?: string | null // Added product_size field
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
  pickup_location_normalized?: string // Added for filter normalization
  payment_method: string
  payment_status: string
  notes: string | null
  admin_notes: string | null // Added admin_notes field
  internal_status?: string | null // For marking orders (incomplete, needs_clarification, priority, ready)
  created_at: string
  pickup_token?: string // Added pickup_token field
  qr_code_url?: string | null // Added qr_code_url field
  customer: {
    first_name: string
    last_name: string
    email: string
    phone: string | null
    distribution_person_id?: string // Added distribution_person_id
    notes?: string | null // Added customer notes field
    special_requests?: string | null // Added special_requests field
  }
  order_items: OrderItem[]
  hellocash_invoice_id?: string | null // Added hellocash_invoice_id field
  hellocash_invoice_number?: string | null // Added hellocash_invoice_number field
}

interface CustomerDetails {
  street: string | null
  house_number: string | null
  postal_code: string | null
  city: string | null
  country: string | null
  email: string
  phone: string | null
  id: string // Added ID to CustomerDetails
}

interface OrderCardProps {
  order: Order
  isSelected: boolean
  onSelectionChange: (orderId: string, selected: boolean) => void
  onStatusChange: (orderId: string, status?: string, paymentStatus?: string) => void
  onMarkAsPaid: (orderId: string) => void
  onNotify: (orderId: string, templateId?: EmailTemplateId) => void
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
    onAdminNotesChange,
    onSyncStatus, // Added onSyncStatus prop
    onCancelInvoice, // Added onCancelInvoice prop
    onMarkAsPaid, // Added onMarkAsPaid prop
    isSelected,
    onSelectionChange,
  }: {
    order: Order
    onNotify: (orderId: string, templateId?: EmailTemplateId) => void
    onStatusChange: (orderId: string, status?: string, paymentStatus?: string, internalStatus?: string | null) => void // Modified to accept internalStatus
    onAdminNotesChange: (orderId: string, adminNotes: string) => void
    onSyncStatus: (orderId: string) => Promise<void> // Added onSyncStatus prop
    onCancelInvoice: (orderId: string) => Promise<void> // Added onCancelInvoice prop type
    onMarkAsPaid: (orderId: string) => void // Added onMarkAsPaid prop type
    isSelected: boolean
    onSelectionChange: (orderId: string, selected: boolean) => void
  }) => {
    const [showItems, setShowItems] = useState(false)
    const [showBulkNames, setShowBulkNames] = useState(false)
    const [showAdminNotes, setShowAdminNotes] = useState(false)
    const [adminNotes, setAdminNotes] = useState(order.admin_notes || "")
    const [isSavingNotes, setIsSavingNotes] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false) // Added isSyncing state
    const [isCancelling, setIsCancelling] = useState(false) // Added isCancelling state
    const [showCancelModal, setShowCancelModal] = useState(false) // Added showCancelModal state
    const [cancelReason, setCancelReason] = useState("") // Added cancelReason state
    const [showCustomerDetails, setShowCustomerDetails] = useState(false)
    const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null)
    const [loadingCustomerDetails, setLoadingCustomerDetails] = useState(false)

    // State and handler for notifications
    const [selectedNotification, setSelectedNotification] = useState<EmailTemplateId | "">("")
    const [isSendingNotification, setIsSendingNotification] = useState(false)

    const handleSendNotification = async () => {
      if (!selectedNotification) return
      setIsSendingNotification(true) // Set loading state
      try {
        await onNotify(order.id, selectedNotification)
      } finally {
        setIsSendingNotification(false) // Reset loading state
        setSelectedNotification("") // Clear selection after attempt
      }
    }

    const customerName = `${order.customer.first_name} ${order.customer.last_name}`
    const orderDate = new Date(order.created_at).toLocaleDateString("de-DE")
    const items = order.order_items.map((item) => `${item.product_name} (${item.quantity}x)`).join(", ")

    const bulkOrderNames = useMemo(() => parseBulkOrderNames(order.notes), [order.notes])
    const isBulkOrder = bulkOrderNames.length > 0

    const pickupUrl = order.pickup_token
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/pos/pickup?token=${order.pickup_token}`
      : null

    const loadCustomerDetails = async () => {
      if (customerDetails) {
        // Already loaded, just toggle visibility
        setShowCustomerDetails(!showCustomerDetails)
        return
      }

      setLoadingCustomerDetails(true)
      try {
        const response = await fetch(`/api/crm/customers/${order.customer_id}`)
        if (response.ok) {
          const data = await response.json()
          setCustomerDetails({
            id: data.id, // Ensure ID is set
            street: data.street,
            house_number: data.house_number,
            postal_code: data.postal_code,
            city: data.city,
            country: data.country,
            email: data.email,
            phone: data.phone,
          })
          setShowCustomerDetails(true)
        } else {
          console.error("[v0] Failed to load customer details")
        }
      } catch (error) {
        console.error("[v0] Error loading customer details:", error)
      } finally {
        setLoadingCustomerDetails(false)
      }
    }

    const handleSaveAdminNotes = async () => {
      setIsSavingNotes(true)
      try {
        await onAdminNotesChange(order.id, adminNotes)
      } finally {
        setIsSavingNotes(false)
      }
    }

    // Added handleSyncStatus function
    const handleSyncStatus = async () => {
      setIsSyncing(true)
      try {
        await onSyncStatus(order.id)
      } finally {
        setIsSyncing(false)
      }
    }

    const handleCancelInvoice = async () => {
      if (!cancelReason.trim()) {
        alert("Bitte geben Sie einen Stornierungsgrund ein")
        return
      }

      setIsCancelling(true)
      try {
        await onCancelInvoice(order.id)
        setShowCancelModal(false)
        setCancelReason("")
      } finally {
        setIsCancelling(false)
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

    // Define internal status badges
    const internalStatusBadges = useMemo(() => {
      const badges = []
      if (order.internal_status === "incomplete") {
        badges.push(
          <Badge key="incomplete" variant="destructive">
            Unvollständig
          </Badge>,
        )
      } else if (order.internal_status === "needs_clarification") {
        badges.push(
          <Badge key="needs_clarification" variant="warning">
            Klärung nötig
          </Badge>,
        )
      } else if (order.internal_status === "priority") {
        badges.push(
          <Badge key="priority" variant="secondary">
            Priorität
          </Badge>,
        )
      } else if (order.internal_status === "ready") {
        badges.push(
          <Badge key="ready" variant="success">
            Bereit
          </Badge>,
        )
      }
      return badges
    }, [order.internal_status])

    return (
      <Card
        className={`p-4 ${isSelected ? "bg-gold/5 border-gold" : ""} ${
          order.internal_status === "incomplete"
            ? "border-l-4 border-l-red-500"
            : order.internal_status === "needs_clarification"
              ? "border-l-4 border-l-orange-500"
              : order.internal_status === "priority"
                ? "border-l-4 border-l-yellow-500"
                : order.internal_status === "ready"
                  ? "border-l-4 border-l-green-500"
                  : ""
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelectionChange(order.id, checked as boolean)}
              className="mt-1"
            />
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{order.order_number}</span>
                <Badge variant={getStatusVariant(uiStatus)}>{getStatusDisplay(uiStatus)}</Badge>
                {order.payment_status === "paid" && (
                  <Badge className="bg-green-600 text-white hover:bg-green-700">✓ Bezahlt</Badge>
                )}
                {isBulkOrder && (
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" />
                    Sammelbestellung ({bulkOrderNames.length})
                  </Badge>
                )}
                {internalStatusBadges}
              </div>
              <div className="text-sm text-muted-foreground">
                <div>
                  <button
                    onClick={loadCustomerDetails}
                    disabled={loadingCustomerDetails}
                    className="hover:text-foreground underline decoration-dotted cursor-pointer text-left"
                  >
                    {loadingCustomerDetails ? (
                      <>
                        <Loader2 className="h-3 w-3 inline mr-1 animate-spin" />
                        Lädt...
                      </>
                    ) : (
                      <>
                        {customerName}
                        {showCustomerDetails ? (
                          <ChevronUp className="h-3 w-3 inline ml-1" />
                        ) : (
                          <ChevronDown className="h-3 w-3 inline ml-1" />
                        )}
                      </>
                    )}
                  </button>
                  <a
                    href={`/admin#customer-${order.customer_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 ml-2"
                    title="Kunde in Verwaltung öffnen"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  {" • "}
                  {order.customer.email}
                </div>

                {showCustomerDetails && customerDetails && (
                  <div className="mt-2 pl-4 border-l-2 border-gold/50 space-y-1 text-sm bg-gold/5 p-2 rounded">
                    <div className="font-medium text-foreground mb-1">📍 Lieferadresse:</div>
                    {customerDetails.street && customerDetails.house_number && (
                      <div>
                        {customerDetails.street} {customerDetails.house_number}
                      </div>
                    )}
                    {customerDetails.postal_code && customerDetails.city && (
                      <div>
                        {customerDetails.postal_code} {customerDetails.city}
                      </div>
                    )}
                    {customerDetails.country && <div>{customerDetails.country}</div>}
                    <div className="font-medium text-foreground mt-2 mb-1">📧 Kontakt:</div>
                    <div>{customerDetails.email}</div>
                    {customerDetails.phone && <div>📞 {customerDetails.phone}</div>}
                  </div>
                )}

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

                {/* CHANGE: Fixed to use order.notes instead of order.customer.notes */}
                {(order.notes || order.customer?.special_requests) && (
                  <div className="mt-3 border-l-4 border-l-gold bg-gold/10 p-3 rounded-r">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 text-gold mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="font-semibold text-gold">KUNDEN-INFO:</span>
                        {order.notes && (
                          <p className="text-sm text-foreground/80 mt-1">
                            <span className="font-medium">Bestellnotizen:</span> {order.notes}
                          </p>
                        )}
                        {order.customer?.special_requests && (
                          <p className="text-sm text-foreground/80 mt-1">
                            <span className="font-medium">Kundenhinweise:</span> {order.customer.special_requests}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {isBulkOrder && (
                  <div className="mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowBulkNames(!showBulkNames)}
                      className="h-auto p-0 text-sm text-muted-foreground hover:text-foreground"
                    >
                      {showBulkNames ? (
                        <ChevronUp className="h-4 w-4 mr-1" />
                      ) : (
                        <ChevronDown className="h-4 w-4 mr-1" />
                      )}
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
                    {order.order_items.length} Artikel anzeigen
                  </Button>
                  {showItems && (
                    <div className="mt-2 pl-4 border-l-2 border-muted space-y-1">
                      {order.order_items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>
                            {item.product_id ? `#${item.product_id} - ` : ""}
                            {item.product_name} ({item.quantity}x)
                            {item.product_size ? ` • ${item.product_size}` : ""}
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

              {/* CHANGE: Improved mobile layout - everything stacks vertically on mobile */}
              <div className="flex flex-col gap-2 w-full lg:flex-row lg:items-start lg:w-auto">
                {/* Left side: Action buttons */}
                <div className="flex flex-col gap-2 w-full lg:w-auto">
                  {order.qr_code_url && (
                    <div className="lg:hidden mb-2 flex justify-center">
                      <img
                        src={order.qr_code_url || "/placeholder.svg"}
                        alt="QR Code"
                        className="w-20 h-20 border rounded"
                        title="QR-Code für Abholung"
                      />
                    </div>
                  )}

                  {pickupUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(pickupUrl, "_blank")}
                      className="w-full"
                    >
                      🎫 Bestellung anzeigen
                    </Button>
                  )}

                  {order.hellocash_invoice_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSyncStatus}
                      disabled={isSyncing}
                      className="w-full bg-transparent"
                    >
                      {isSyncing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Synchronisiere...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Status aktualisieren
                        </>
                      )}
                    </Button>
                  )}

                  {order.hellocash_invoice_id && order.payment_status === "paid" && (
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`/api/invoices/${order.id}/pdf`, "_blank")}
                        className="w-full sm:flex-1"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Rechnung
                      </Button>
                      {order.status !== "cancelled" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowCancelModal(true)}
                          className="w-full sm:flex-1 text-destructive hover:text-destructive"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Stornieren
                        </Button>
                      )}
                    </div>
                  )}

                  {order.hellocash_invoice_id && order.status === "cancelled" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/api/invoices/${order.id}/pdf?cancellation=true`, "_blank")}
                      className="w-full"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Storno-Beleg
                    </Button>
                  )}

                  <div className="text-sm mb-2">
                    {order.hellocash_invoice_number ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Receipt className="h-4 w-4" />
                        Rechnung: {order.hellocash_invoice_number}
                      </span>
                    ) : order.hellocash_invoice_id ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Receipt className="h-4 w-4" />
                        Rechnung: #{order.hellocash_invoice_id}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-amber-600">
                        <AlertCircle className="h-4 w-4" />
                        Noch keine Rechnung
                      </span>
                    )}
                  </div>

                  {order.payment_status !== "paid" && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => onMarkAsPaid(order.id)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      Als bezahlt markieren
                    </Button>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <Select value={uiStatus} onValueChange={(value) => onStatusChange(order.id, value, undefined)}>
                      <SelectTrigger className="w-full sm:w-32">
                        <SelectValue placeholder="Status" />
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
                      <SelectTrigger className="w-full sm:w-32">
                        <SelectValue placeholder="Zahlungsstatus" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Ausstehend</SelectItem>
                        <SelectItem value="paid">Bezahlt</SelectItem>
                        <SelectItem value="failed">Fehlgeschlagen</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={order.internal_status || "normal"}
                      onValueChange={(value) =>
                        onStatusChange(order.id, undefined, undefined, value === "normal" ? null : value)
                      }
                    >
                      <SelectTrigger className="w-full sm:w-32">
                        <SelectValue placeholder="Interner Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="incomplete">Unvollständig</SelectItem>
                        <SelectItem value="needs_clarification">Klärung nötig</SelectItem>
                        <SelectItem value="priority">Priorität</SelectItem>
                        <SelectItem value="ready">Bereit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <Select
                      value={selectedNotification}
                      onValueChange={(value) => setSelectedNotification(value as EmailTemplateId)}
                    >
                      <SelectTrigger className="w-full">
                        <Mail className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Benachrichtigung wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="orderConfirmation">Bestellbestätigung</SelectItem>
                        <SelectItem value="readyForPickup">Abholbereit</SelectItem>
                        <SelectItem value="orderPickedUp">Abgeholt (Danke)</SelectItem>
                        <SelectItem value="shippingNotification">Versandbestätigung</SelectItem>
                        <SelectItem value="orderCancelled">Stornierung</SelectItem>
                        <SelectItem value="pickupReminder">Abholtermin-Erinnerung</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={handleSendNotification}
                      disabled={!selectedNotification || isSendingNotification}
                      className="w-full sm:w-auto whitespace-nowrap"
                    >
                      {isSendingNotification ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sendet...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Senden
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Right side: QR code (desktop only) */}
                {order.qr_code_url && (
                  <div className="hidden lg:block ml-4">
                    <img
                      src={order.qr_code_url || "/placeholder.svg"}
                      alt="QR Code"
                      className="w-24 h-24 border rounded"
                      title="QR-Code für Abholung"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {showCancelModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Rechnung stornieren</CardTitle>
                <CardDescription>
                  Bestellung: {order.order_number}
                  <br />
                  Diese Aktion kann nicht rückgangig gemacht werden.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cancelReason">Stornierungsgrund *</Label>
                  <textarea
                    id="cancelReason"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Grund für die Stornierung eingeben..."
                    className="w-full min-h-[100px] p-2 text-sm border rounded-md resize-y"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowCancelModal(false)} disabled={isCancelling}>
                    Abbrechen
                  </Button>
                  <Button variant="destructive" onClick={handleCancelInvoice} disabled={isCancelling}>
                    {isCancelling ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Storniere...
                      </>
                    ) : (
                      "Rechnung stornieren"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </Card>
    )
  },
)

OrderItem.displayName = "OrderItem"

function OrderManagement() {
  const testMode = useTestMode()
  const { toast } = useToast()

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  const [searchInput, setSearchInput] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const loadOrders = useCallback(({ q }: { q?: string }) => {
    if (q !== undefined) {
      setSearchTerm(q)
    }
  }, [])

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (searchTerm?.trim()) {
      params.append("q", searchTerm.trim())
      params.append("limit", "5000")
    } else {
      params.append("limit", "999999")
    }
    const url = `/api/admin/orders${params.toString() ? `?${params.toString()}` : ""}`
    return url
  }, [searchTerm])

  const {
    data: ordersResponse,
    isLoading,
    error: errorData,
    updateCache: updateOrdersCache,
  } = useAdminCache<Order[] | { orders: Order[]; total: number }>(apiUrl, {
    revalidateOnMount: true,
  })

  // Removed unused fetchOrders, using mutate directly now.
  const error = errorData ? String(errorData) : null

  const orders = Array.isArray(ordersResponse) ? ordersResponse : (ordersResponse?.orders ?? [])
  const totalOrdersCount = Array.isArray(ordersResponse) ? orders.length : (ordersResponse?.total ?? 0)

  // Function to fetch orders
  const fetchOrders = useCallback(() => {
    // Implementation for fetching orders
  }, [])

  return <div>{/* Order Management Component Implementation */}</div>
}
