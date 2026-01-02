"use client"

import { useState, useMemo, useCallback, memo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Download,
  Mail,
  Search,
  Filter,
  Loader2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Users,
  Plus,
  X,
  RefreshCw,
  XCircle,
  FileText,
  Printer,
  ExternalLink,
  Send,
  Receipt,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Info,
  Edit,
} from "lucide-react"
import { mapDBToUIStatus } from "@/lib/order-status-mapping"
import type { EmailTemplateId } from "@/lib/email/build"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ExportOptionsDialog, type ExportOptions } from "@/components/admin/export-options-dialog"
import { useTestMode } from "./test-mode-toggle" // Import useTestMode hook
import { useAdminCache } from "@/hooks/use-admin-cache"
import { Combobox } from "@/components/ui/combobox" // Import Combobox
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
    onSyncStatus,
    onCancelInvoice,
    onMarkAsPaid,
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

    useEffect(() => {
      setAdminNotes(order.admin_notes || "")
    }, [order.admin_notes])

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

                {/* CHANGE: Admin notes display only in yellow box, button moved outside */}
                {(order.notes || order.customer?.special_requests || order.admin_notes) && (
                  <div className="mt-3 border-l-4 border-l-gold bg-gold/10 p-3 rounded-r space-y-2">
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
                    {/* CHANGE: Admin notes with red background, only display text here */}
                    {order.admin_notes && (
                      <div className="border-l-4 border-l-red-500 bg-red-50 p-2 rounded-r">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <span className="font-semibold text-red-600">ADMIN-NOTIZ:</span>
                            <p className="text-sm text-foreground/80 mt-1">{order.admin_notes}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* CHANGE: Admin notes button always visible, outside the container */}
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdminNotes(!showAdminNotes)}
                    className="h-8"
                  >
                    {order.admin_notes ? (
                      <>
                        <Edit className="h-4 w-4 mr-1" />
                        Admin-Notiz bearbeiten
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        Admin-Notiz hinzufügen
                      </>
                    )}
                  </Button>
                </div>

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

                {/* Admin Notes section - REMOVED */}
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

        {showAdminNotes && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Admin-Notiz bearbeiten</CardTitle>
                <CardDescription>Fügen Sie eine Notiz zur Bestellung {order.order_number} hinzu.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="adminNotesInput">Notiz</Label>
                  <textarea
                    id="adminNotesInput"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Geben Sie Ihre Notiz hier ein..."
                    className="w-full min-h-[100px] p-2 text-sm border rounded-md resize-y"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowAdminNotes(false)} disabled={isSavingNotes}>
                    Abbrechen
                  </Button>
                  <Button onClick={handleSaveAdminNotes} disabled={isSavingNotes}>
                    {isSavingNotes ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Speichert...
                      </>
                    ) : (
                      "Speichern"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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

  const fetchOrders = useCallback(async () => {
    await updateOrdersCache() // Use mutate to refresh data
  }, [updateOrdersCache]) // Dependency on updateOrdersCache

  // State for customer search in manual order form
  const [customerSearchQuery, setCustomerSearchQuery] = useState("")
  const [customerSearchResults, setCustomerSearchResults] = useState<CustomerDetails[]>([])
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false)

  // State for manual order form
  const [showManualOrderForm, setShowManualOrderForm] = useState(false)
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [customers, setCustomers] = useState<CustomerDetails[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [pickupLocations, setPickupLocations] = useState<{ id: string; name: string }[]>([])
  const [distributionPersons, setDistributionPersons] = useState<{ id: string; name: string }[]>([])
  const [manualOrderForm, setManualOrderForm] = useState({
    customerId: "",
    customerEmail: "",
    deliveryMethod: "pickup",
    pickupLocationId: "",
    distributionPersonId: "",
    paymentMethod: "invoice",
    paymentStatus: "pending",
    status: "confirmed",
    notes: "",
    items: [{ productId: "", quantity: 1, price: 0 }],
  })

  // State for filters
  const [showFilters, setShowFilters] = useState(false)
  const [commentFilter, setCommentFilter] = useState("all")
  const [deliveryMethodFilter, setDeliveryMethodFilter] = useState("all")
  const [pickupLocationFilter, setPickupLocationFilter] = useState("all")

  // State for selected orders and export
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set())
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [includeCustomerAddress, setIncludeCustomerAddress] = useState(true) // State for export option

  // State for new customer dialog in manual order form
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false)
  const [newCustomerForm, setNewCustomerForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    street: "",
    house_number: "",
    postal_code: "",
    city: "",
  })
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)

  // State for "Mark as Paid" modal
  const [showMarkAsPaidModal, setShowMarkAsPaidModal] = useState(false)
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<string | null>(null)
  const [isMarkingAsPaid, setIsMarkingAsPaid] = useState(false)
  // CHANGE: Changed default payment method from "cash" to "bank_transfer" (Rechnung)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("bank_transfer")
  const [createInvoice, setCreateInvoice] = useState(true)
  const [sendInvoiceEmail, setSendInvoiceEmail] = useState(true)
  const [discountPercent, setDiscountPercent] = useState("")
  const [customDiscountPercent, setCustomDiscountPercent] = useState("")
  const [invoiceTestMode, setInvoiceTestMode] = useState(false)
  const [selectedCashierId, setSelectedCashierId] = useState("")
  const [helloCashEmployees, setHelloCashEmployees] = useState<any[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [invoiceText, setInvoiceText] = useState("")

  useEffect(() => {
    if (!customerSearchQuery || customerSearchQuery.length < 2) {
      setCustomerSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearchingCustomers(true)
      try {
        const response = await fetch(`/api/admin/customers/search?q=${encodeURIComponent(customerSearchQuery)}`)
        if (response.ok) {
          const data = await response.json()
          setCustomerSearchResults(data.customers || [])
        }
      } catch (error) {
        console.error("[v0] Error searching customers:", error)
      } finally {
        setIsSearchingCustomers(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [customerSearchQuery])

  const fetchFormData = useCallback(async () => {
    try {
      const [customersRes, productsRes, locationsRes, distributionPersonsRes] = await Promise.all([
        fetch("/api/crm/customers"),
        fetch("/api/products"),
        fetch("/api/admin/pickup-locations"),
        fetch("/api/admin/distribution-persons"),
      ])

      if (customersRes.ok) {
        const customersData = await customersRes.json()
        const customersArray = customersData.customers || customersData
        if (Array.isArray(customersArray)) {
          setCustomers(customersArray)
        } else {
          console.error("[v0] Customers data is not an array:", customersData)
          setCustomers([])
        }
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json()
        setProducts(productsData.products || productsData || [])
      }

      if (locationsRes.ok) {
        const locationsData = await locationsRes.json()
        setPickupLocations(locationsData.locations || [])
      }

      if (distributionPersonsRes.ok) {
        const distributionPersonsData = await distributionPersonsRes.json()
        setDistributionPersons(distributionPersonsData.persons || [])
      }
    } catch (error) {
      console.error("[v0] Error fetching form data:", error)
      toast({
        title: "Fehler",
        description: "Formulardaten konnten nicht geladen werden",
        variant: "destructive",
      })
    }
  }, [toast])

  useEffect(() => {
    if (showManualOrderForm && customers.length === 0) {
      fetchFormData()
    }
  }, [showManualOrderForm, customers.length, fetchFormData])

  const handleCreateManualOrder = useCallback(async () => {
    console.log("[v0] handleCreateManualOrder called")
    console.log("[v0] manualOrderForm:", manualOrderForm)
    console.log("[v0] isCreatingOrder:", isCreatingOrder)

    if (!manualOrderForm.customerId) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie einen Kunden aus",
        variant: "destructive",
      })
      return
    }

    if (manualOrderForm.items.length === 0 || !manualOrderForm.items[0].productId) {
      toast({
        title: "Fehler",
        description: "Bitte fügen Sie mindestens ein Produkt hinzu",
        variant: "destructive",
      })
      return
    }

    if (manualOrderForm.deliveryMethod === "pickup" && !manualOrderForm.pickupLocationId) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie einen Abholort aus",
        variant: "destructive",
      })
      return
    }

    const customer =
      customers.find((c) => c.id === manualOrderForm.customerId) ||
      customerSearchResults.find((c) => c.id === manualOrderForm.customerId)
    if (!customer) {
      toast({
        title: "Fehler",
        description: "Kunde nicht gefunden",
        variant: "destructive",
      })
      return
    }

    try {
      setIsCreatingOrder(true)

      const orderItems = manualOrderForm.items
        .filter((item) => item.productId)
        .map((item) => {
          const product = products.find((p) => p.id.toString() === item.productId)
          return {
            name: product?.name || "Unbekanntes Produkt",
            quantity: item.quantity,
            price: item.price || product?.price || 0,
            category: "Manuell erfasst",
          }
        })

      const pickupLocation = pickupLocations.find((loc) => loc.id === manualOrderForm.pickupLocationId)

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          deliveryMethod: manualOrderForm.deliveryMethod,
          pickupLocation: pickupLocation?.name || null,
          pickupLocationId: manualOrderForm.pickupLocationId || null,
          distributionPersonId: manualOrderForm.distributionPersonId || null,
          paymentMethod: manualOrderForm.paymentMethod,
          notes: manualOrderForm.notes || null,
          items: orderItems,
          emailReminder: false,
          emailUpdates: false,
          isTest: false,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Fehler beim Erstellen der Bestellung")
      }

      const result = await response.json()

      if (manualOrderForm.status !== "confirmed" || manualOrderForm.paymentStatus !== "pending") {
        await fetch("/api/admin/update-order-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: result.data.order.id,
            status: manualOrderForm.status,
            paymentStatus: manualOrderForm.paymentStatus,
          }),
        })
      }

      toast({
        title: "Bestellung erstellt",
        description: `Bestellung ${result.data.order.order_number} wurde erfolgreich erstellt`,
      })

      setManualOrderForm({
        customerId: "",
        customerEmail: "",
        deliveryMethod: "pickup",
        pickupLocationId: "",
        distributionPersonId: "",
        paymentMethod: "invoice",
        paymentStatus: "pending",
        status: "confirmed",
        notes: "",
        items: [{ productId: "", quantity: 1, price: 0 }],
      })
      setShowManualOrderForm(false)

      await fetchOrders() // Use fetchOrders which triggers update
    } catch (error) {
      console.error("[v0] Error creating manual order:", error)
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Bestellung konnte nicht erstellt werden",
        variant: "destructive",
      })
    } finally {
      setIsCreatingOrder(false)
    }
  }, [manualOrderForm, customers, customerSearchResults, products, pickupLocations, toast, fetchOrders])

  const addOrderItem = useCallback(() => {
    setManualOrderForm((prev) => ({
      ...prev,
      items: [...prev.items, { productId: "", quantity: 1, price: 0 }],
    }))
  }, [])

  const removeOrderItem = useCallback((index: number) => {
    setManualOrderForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
  }, [])

  const updateOrderItem = useCallback(
    (index: number, field: string, value: any) => {
      setManualOrderForm((prev) => ({
        ...prev,
        items: prev.items.map((item, i) => {
          if (i === index) {
            const updated = { ...item, [field]: value }
            if (field === "productId" && value) {
              const product = products.find((p) => p.id.toString() === value)
              if (product) {
                updated.price = product.price
              }
            }
            return updated
          }
          return item
        }),
      }))
    },
    [products],
  )

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = statusFilter === "all" || order.status === statusFilter

      const matchesComment =
        commentFilter === "all" ||
        (commentFilter === "with" && order.admin_notes && order.admin_notes.trim() !== "") ||
        (commentFilter === "without" && (!order.admin_notes || order.admin_notes.trim() === ""))

      const matchesDeliveryMethod = deliveryMethodFilter === "all" || order.delivery_method === deliveryMethodFilter

      const matchesPickupLocation =
        pickupLocationFilter === "all" || order.pickup_location_normalized === pickupLocationFilter

      return matchesStatus && matchesComment && matchesDeliveryMethod && matchesPickupLocation
    })
  }, [orders, statusFilter, commentFilter, deliveryMethodFilter, pickupLocationFilter])

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredOrders.slice(startIndex, endIndex)
  }, [filteredOrders, currentPage, itemsPerPage])

  const uniquePickupLocations = useMemo(() => {
    const locations = new Set<string>()
    orders.forEach((order) => {
      if (order.pickup_location_normalized) {
        locations.add(order.pickup_location_normalized)
      }
    })
    return Array.from(locations).sort()
  }, [orders])

  const exportOrders = useCallback(
    async (options: ExportOptions, orderIds?: string[]) => {
      try {
        const params = new URLSearchParams({
          format: options.format,
          sorting: options.sorting,
          showSubtotals: options.showSubtotals.toString(),
          emptyLinesBetweenGroups: options.emptyLinesBetweenGroups.toString(),
          showGroupHeaders: options.showGroupHeaders.toString(),
          includeCustomerAddress: includeCustomerAddress.toString(), // Added for address inclusion
        })

        // Export only selected orders if specified
        if (orderIds && orderIds.length > 0) {
          params.append("ids", orderIds.join(","))
        } else if (
          searchTerm ||
          statusFilter !== "all" ||
          commentFilter !== "all" ||
          deliveryMethodFilter !== "all" ||
          pickupLocationFilter !== "all"
        ) {
          // If filters are applied, export filtered orders
          const filteredIds = filteredOrders.map((order) => order.id)
          params.append("ids", filteredIds.join(","))
        } else {
          // Otherwise, export all orders for the current page
          const pageOrderIds = paginatedOrders.map((order) => order.id)
          params.append("ids", pageOrderIds.join(","))
        }

        const url = `/api/admin/orders-export-advanced?${params.toString()}`
        const response = await fetch(url)

        if (!response.ok) {
          throw new Error("Failed to export orders")
        }

        const blob = await response.blob()
        const downloadUrl = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = downloadUrl
        a.download = `bestellungen-${options.format}-${new Date().toISOString().split("T")[0]}.csv`
        a.click()
        URL.revokeObjectURL(downloadUrl)

        if (orderIds && orderIds.length > 0) {
          setSelectedOrderIds(new Set())
          toast({
            title: "Export erfolgreich",
            description: `${orderIds.length} Bestellung(en) wurden exportiert`,
          })
        }
      } catch (error) {
        console.error("[v0] Error exporting orders:", error)
        toast({
          title: "Export fehlgeschlagen",
          description: "Die Bestellungen konnten nicht exportiert werden",
          variant: "destructive",
        })
      }
    },
    [
      toast,
      includeCustomerAddress,
      filteredOrders,
      paginatedOrders,
      searchTerm,
      statusFilter,
      commentFilter,
      deliveryMethodFilter,
      pickupLocationFilter,
    ],
  )

  const handleNotify = useCallback(
    async (orderId: string, templateId?: EmailTemplateId) => {
      const order = orders.find((o) => o.id === orderId)
      if (!order) return

      try {
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
          toast({
            title: "Benachrichtigung gesendet",
            description: `Eine ${templateId || "Standard-Benachrichtigung"} wurde an ${order.customer.email} gesendet.`,
          })
        } else {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
          toast({
            title: "Fehler beim Senden",
            description: errorData.error || "Benachrichtigung konnte nicht gesendet werden",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error(`[v0] Error sending notification:`, error)
        toast({
          title: "Fehler",
          description: error instanceof Error ? error.message : "Unbekannter Fehler",
          variant: "destructive",
        })
      }
    },
    [orders, toast],
  )

  const handleStatusChange = useCallback(
    async (orderId: string, status?: string, paymentStatus?: string, internalStatus?: string | null) => {
      console.log("[v0] handleStatusChange called:", {
        orderId,
        status,
        paymentStatus,
        internalStatus,
      })
      // </CHANGE>

      try {
        updateOrdersCache((prevData) => {
          // Use prevOrders directly and handle both array and object types for prevData
          const orders = Array.isArray(prevData) ? prevData : (prevData?.orders ?? [])

          console.log("[v0] Optimistic update - before:", {
            orderId,
            currentInternalStatus: orders.find((o) => o.id === orderId)?.internal_status,
            newInternalStatus: internalStatus,
          })
          // </CHANGE>

          const updated = orders.map((order) => {
            if (order.id === orderId) {
              return {
                ...order,
                ...(status && { status }),
                ...(paymentStatus && { payment_status: paymentStatus }),
                ...(internalStatus !== undefined && { internal_status: internalStatus }),
              }
            }
            return order
          })

          console.log("[v0] Optimistic update - after:", {
            orderId,
            newInternalStatus: updated.find((o) => o.id === orderId)?.internal_status,
          })
          // </CHANGE>

          // Return the correct structure based on prevData type
          return Array.isArray(prevData) ? updated : { ...prevData, orders: updated }
        }, false)

        const response = await fetch("/api/admin/update-order-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ orderId, status, paymentStatus, internalStatus }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
          // Revert optimistic update if failed
          await fetchOrders()

          toast({
            title: "Fehler",
            description: errorData.error || "Status konnte nicht aktualisiert werden",
            variant: "destructive",
          })
          return // Exit early if API call failed
        }

        const result = await response.json()

        console.log("[v0] API response:", {
          orderId,
          returnedInternalStatus: result.order?.internal_status,
          fullOrder: result.order,
        })
        // </CHANGE>

        const updatedOrder = result.order

        updateOrdersCache((prevData) => {
          // Use prevOrders directly and handle both array and object types for prevData
          const orders = Array.isArray(prevData) ? prevData : (prevData?.orders ?? [])

          console.log("[v0] Applying API response - before:", {
            orderId,
            currentInternalStatus: orders.find((o) => o.id === orderId)?.internal_status,
            apiInternalStatus: updatedOrder?.internal_status,
          })
          // </CHANGE>

          const updated = orders.map((order) => {
            if (order.id === orderId && updatedOrder) {
              return {
                ...order,
                status: updatedOrder.status,
                payment_status: updatedOrder.payment_status,
                internal_status: updatedOrder.internal_status,
              }
            }
            return order
          })

          console.log("[v0] Applying API response - after:", {
            orderId,
            finalInternalStatus: updated.find((o) => o.id === orderId)?.internal_status,
          })
          // </CHANGE>

          // Return the correct structure based on prevData type
          return Array.isArray(prevData) ? updated : { ...prevData, orders: updated }
        }, false)

        toast({
          title: "Status aktualisiert",
          description: "Der Bestellstatus wurde erfolgreich aktualisiert",
        })
      } catch (error) {
        console.error("[v0] Error updating order status:", error)
        // Revert optimistic update if failed
        await fetchOrders()

        toast({
          title: "Fehler",
          description: error instanceof Error ? error.message : "Unbekannter Fehler",
          variant: "destructive",
        })
      }
    },
    [toast, updateOrdersCache, fetchOrders], // Ensure fetchOrders is a dependency if used for revert
  )

  const handleAdminNotesChange = useCallback(
    async (orderId: string, adminNotes: string) => {
      try {
        updateOrdersCache((prevData) => {
          const prevOrders = Array.isArray(prevData) ? prevData : (prevData?.orders ?? [])
          const updatedOrders = prevOrders.map((order) => {
            if (order.id === orderId) {
              return {
                ...order,
                admin_notes: adminNotes,
              }
            }
            return order
          })
          return Array.isArray(prevData) ? updatedOrders : { orders: updatedOrders, total: prevData?.total ?? 0 }
        })

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
          updateOrdersCache((prevData) => {
            const prevOrders = Array.isArray(prevData) ? prevData : (prevData?.orders ?? [])
            const updatedOrders = prevOrders.map((order) => {
              if (order.id === orderId) {
                return {
                  ...order,
                  admin_notes: adminNotes,
                }
              }
              return order
            })
            return Array.isArray(prevData) ? updatedOrders : { orders: updatedOrders, total: prevData?.total ?? 0 }
          })

          toast({
            title: "Notizen gespeichert",
            description: "Die Admin-Notizen wurden erfolgreich gespeichert",
          })
        } else {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
          // Revert optimistic update if failed
          await fetchOrders()

          toast({
            title: "Fehler",
            description: errorData.error || "Notizen konnten nicht gespeichert werden",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error(`[v0] Error updating admin notes:`, error)
        // Revert optimistic update if failed
        await fetchOrders()

        toast({
          title: "Fehler",
          description: error instanceof Error ? error.message : "Unbekannter Fehler",
          variant: "destructive",
        })
      }
    },
    [updateOrdersCache, fetchOrders, toast],
  )

  const handleSyncStatus = useCallback(
    async (orderId: string) => {
      try {
        const response = await fetch("/api/pos/hellocash/sync-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ orderId }),
        })

        if (response.ok) {
          const result = await response.json()
          // Reload orders to show updated status
          await fetchOrders()

          if (result.newStatus !== result.previousStatus) {
            toast({
              title: "Status aktualisiert",
              description: `Bestellung wurde von helloCash synchronisiert: ${result.helloCashStatus}`,
            })
          } else {
            toast({
              title: "Bereits aktuell",
              description: "Keine Änderungen von helloCash",
            })
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
          toast({
            title: "Fehler",
            description: errorData.error || "Status konnte nicht synchronisiert werden",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error(`[v0] Error syncing status:`, error)
        toast({
          title: "Fehler",
          description: error instanceof Error ? error.message : "Unbekannter Fehler",
          variant: "destructive",
        })
      }
    },
    [fetchOrders, toast],
  )

  const handleCancelInvoice = useCallback(
    async (orderId: string) => {
      const order = orders.find((o) => o.id === orderId)
      if (!order) return

      try {
        const reason = prompt("Stornierungsgrund:")
        if (!reason) return

        const response = await fetch(`/api/admin/invoices/${orderId}/cancel`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason }),
        })

        if (response.ok) {
          toast({
            title: "Rechnung storniert",
            description: `Rechnung für ${order.order_number} wurde erfolgreich storniert`,
          })
          // Reload orders to show updated status
          await fetchOrders()
        } else {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
          toast({
            title: "Fehler",
            description: errorData.error || "Rechnung konnte nicht storniert werden",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error(`[v0] Error cancelling invoice:`, error)
        toast({
          title: "Fehler",
          description: error instanceof Error ? error.message : "Unbekannter Fehler",
          variant: "destructive",
        })
      }
    },
    [orders, fetchOrders, toast],
  )

  const handleCreateNewCustomer = useCallback(async () => {
    try {
      setIsCreatingCustomer(true)

      // Validate only name is required
      const fullName = `${newCustomerForm.first_name} ${newCustomerForm.last_name}`.trim()
      if (!fullName) {
        toast({
          title: "Fehler",
          description: "Bitte geben Sie mindestens einen Namen ein",
          variant: "destructive",
        })
        return
      }

      const response = await fetch("/api/crm/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomerForm),
      })

      if (!response.ok) {
        throw new Error("Failed to create customer")
      }

      const { customer } = await response.json()

      toast({
        title: "Erfolg",
        description: "Kunde wurde erfolgreich angelegt",
      })

      // Add to customer list and select
      setCustomers((prev) => [...prev, customer])
      setManualOrderForm((prev) => ({
        ...prev,
        customerId: customer.id,
        customerEmail: customer.email || "",
      }))

      // Reset form and close dialog
      setNewCustomerForm({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        street: "",
        house_number: "",
        postal_code: "",
        city: "",
      })
      setShowNewCustomerDialog(false)
    } catch (error) {
      console.error("[v0] Error creating customer:", error)
      toast({
        title: "Fehler",
        description: "Kunde konnte nicht angelegt werden",
        variant: "destructive",
      })
    } finally {
      setIsCreatingCustomer(false)
    }
  }, [newCustomerForm, toast])

  const loadHelloCashEmployees = useCallback(async () => {
    setLoadingEmployees(true)
    try {
      const response = await fetch("/api/admin/hellocash/employees")
      if (response.ok) {
        const data = await response.json()
        setHelloCashEmployees(data.employees || [])
      } else {
        console.error("[v0] Failed to load HelloCash employees:", response.status)
        toast({
          title: "Warnung",
          description: "Kassierer konnten nicht geladen werden",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error loading HelloCash employees:", error)
    } finally {
      setLoadingEmployees(false)
    }
  }, [toast])

  const handleMarkAsPaid = useCallback(
    (orderId: string) => {
      setSelectedOrderForPayment(orderId)
      setShowMarkAsPaidModal(true)
      loadHelloCashEmployees()
    },
    [loadHelloCashEmployees],
  )

  const handleConfirmMarkAsPaid = useCallback(async () => {
    if (!selectedOrderForPayment) return

    if (selectedPaymentMethod === "cash" && !selectedCashierId) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Bitte wählen Sie einen Kassierer aus für Barzahlung",
      })
      return
    }

    setIsMarkingAsPaid(true)

    try {
      const percent = discountPercent
        ? Number.parseFloat(discountPercent)
        : Number.parseFloat(customDiscountPercent) || 0

      const response = await fetch("/api/admin/mark-order-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrderForPayment,
          paymentMethod: selectedPaymentMethod,
          createInvoice,
          sendEmail: sendInvoiceEmail, // Adding sendEmail parameter
          discountPercent: percent > 0 ? percent : undefined,
          testMode: invoiceTestMode,
          cashierId: selectedCashierId || undefined,
          invoiceText: invoiceText || undefined,
          includeCustomerAddress,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || result.details || "Failed to mark as paid")
      }

      let successMessage = "Bestellung wurde als bezahlt markiert"
      if (createInvoice && result.invoiceNumber) {
        successMessage = `Rechnung ${result.invoiceNumber} wurde erfolgreich erstellt`
        if (sendInvoiceEmail) {
          successMessage += " und per E-Mail versendet"
        }
      }

      toast({
        title: "Erfolg",
        description: successMessage,
      })

      setShowMarkAsPaidModal(false)
      setSelectedOrderForPayment(null)
      setSelectedPaymentMethod("bank_transfer")
      setCreateInvoice(true)
      setSendInvoiceEmail(true) // Reset send email state
      setDiscountPercent("")
      setCustomDiscountPercent("")
      setInvoiceTestMode(false)
      setIncludeCustomerAddress(true)
      setSelectedCashierId("")
      setInvoiceText("")

      // Reload orders
      await fetchOrders()
    } catch (error) {
      console.error(`[v0] Error marking as paid:`, error)
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error instanceof Error ? error.message : "Fehler beim Markieren als bezahlt",
      })
    } finally {
      setIsMarkingAsPaid(false)
    }
  }, [
    selectedOrderForPayment,
    selectedPaymentMethod,
    createInvoice,
    sendInvoiceEmail,
    discountPercent,
    customDiscountPercent,
    invoiceTestMode,
    selectedCashierId,
    invoiceText,
    includeCustomerAddress,
    toast,
    fetchOrders,
  ])

  const handleOrderSelection = useCallback((orderId: string, selected: boolean) => {
    setSelectedOrderIds((prev) => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(orderId)
      } else {
        newSet.delete(orderId)
      }
      return newSet
    })
  }, [])

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedOrderIds(new Set(paginatedOrders.map((order) => order.id)))
      } else {
        setSelectedOrderIds(new Set())
      }
    },
    [paginatedOrders],
  )

  const allFilteredSelected = useMemo(() => {
    return paginatedOrders.length > 0 && paginatedOrders.every((order) => selectedOrderIds.has(order.id))
  }, [paginatedOrders, selectedOrderIds])

  const someFilteredSelected = useMemo(() => {
    return paginatedOrders.some((order) => selectedOrderIds.has(order.id)) && !allFilteredSelected
  }, [paginatedOrders, selectedOrderIds, allFilteredSelected])

  const totalPages = Math.ceil(totalOrdersCount / itemsPerPage)
  const showPagination = !searchTerm && totalPages > 1

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
  }

  const handleSearch = useCallback(() => {
    setSearchTerm(searchInput.trim())
    setCurrentPage(1)
  }, [searchInput])

  const handleClearSearch = useCallback(() => {
    setSearchInput("")
    setSearchTerm("")
    setCurrentPage(1)
  }, [])

  if (isLoading) {
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Bestellungen verwalten</CardTitle>
          <CardDescription>Übersicht und Verwaltung aller Kundenbestellungen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Button
              onClick={() => setShowManualOrderForm(!showManualOrderForm)}
              variant={showManualOrderForm ? "secondary" : "default"}
              className="w-full sm:w-auto"
            >
              {showManualOrderForm ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Formular schließen
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Manuelle Bestellung erfassen
                </>
              )}
            </Button>

            {showManualOrderForm && (
              <Card className="mt-4 border-gold/20">
                <CardHeader>
                  <CardTitle className="text-lg">Neue Bestellung manuell erfassen</CardTitle>
                  <CardDescription>Erfassen Sie eine Bestellung für einen bestehenden Kunden</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer">Kunde *</Label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Combobox
                            value={manualOrderForm.customerId}
                            onValueChange={(value) => {
                              console.log("[v0] Combobox onValueChange called with value:", value)
                              const customer =
                                customers.find((c) => c.id === value) ||
                                customerSearchResults.find((c) => c.id === value)
                              setManualOrderForm((prev) => ({
                                ...prev,
                                customerId: value,
                                customerEmail: customer?.email || "",
                              }))
                            }}
                            onSearchChange={(search) => {
                              console.log("[v0] Combobox onSearchChange called with search:", search)
                              setCustomerSearchQuery(search)
                            }}
                            searchValue={customerSearchQuery}
                            placeholder="Kunde suchen..."
                            emptyText="Keine Kunden gefunden"
                            isLoading={isSearchingCustomers}
                            options={customerSearchResults.map((customer) => ({
                              value: customer.id,
                              label: `${customer.first_name} ${customer.last_name} (${customer.email})`,
                            }))}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setShowNewCustomerDialog(true)}
                          title="Neuen Kunden anlegen"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Delivery Method */}
                    <div className="space-y-2">
                      <Label htmlFor="deliveryMethod">Liefermethode *</Label>
                      <Select
                        value={manualOrderForm.deliveryMethod}
                        onValueChange={(value) => setManualOrderForm((prev) => ({ ...prev, deliveryMethod: value }))}
                      >
                        <SelectTrigger id="deliveryMethod">
                          <SelectValue placeholder="Methode auswählen..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pickup">Abholung</SelectItem>
                          <SelectItem value="delivery">Lieferung</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Pickup Location (only if pickup) */}
                    {manualOrderForm.deliveryMethod === "pickup" && (
                      <div className="space-y-2">
                        <Label htmlFor="pickupLocation">Abholort *</Label>
                        <Select
                          value={manualOrderForm.pickupLocationId}
                          onValueChange={(value) =>
                            setManualOrderForm((prev) => ({ ...prev, pickupLocationId: value }))
                          }
                        >
                          <SelectTrigger id="pickupLocation">
                            <SelectValue placeholder="Abholort auswählen..." />
                          </SelectTrigger>
                          <SelectContent>
                            {pickupLocations.map((location) => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {manualOrderForm.pickupLocationId && (
                          <p className="text-xs text-muted-foreground">
                            💡 Basierend auf zugeordneter Verteilperson vorgeschlagen
                          </p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="distributionPerson">Verteilperson (optional)</Label>
                      <Select
                        value={manualOrderForm.distributionPersonId}
                        onValueChange={(value) =>
                          setManualOrderForm((prev) => ({ ...prev, distributionPersonId: value }))
                        }
                      >
                        <SelectTrigger id="distributionPerson">
                          <SelectValue placeholder="Verteilperson auswählen..." />
                        </SelectTrigger>
                        <SelectContent>
                          {distributionPersons
                            .filter((person) => person.name)
                            .map((person) => (
                              <SelectItem key={person.id} value={person.id}>
                                {person.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Zahlungsmethode *</Label>
                      <Select
                        value={manualOrderForm.paymentMethod}
                        onValueChange={(value) => setManualOrderForm((prev) => ({ ...prev, paymentMethod: value }))}
                      >
                        <SelectTrigger id="paymentMethod">
                          <SelectValue placeholder="Methode auswählen..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="invoice">Rechnung</SelectItem>
                          <SelectItem value="prepayment">Vorkasse</SelectItem>
                          <SelectItem value="sumup">SumUp (Karte)</SelectItem>
                          <SelectItem value="cash">Barzahlung</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Payment Status */}
                    <div className="space-y-2">
                      <Label htmlFor="paymentStatus">Zahlungsstatus *</Label>
                      <Select
                        value={manualOrderForm.paymentStatus}
                        onValueChange={(value) => setManualOrderForm((prev) => ({ ...prev, paymentStatus: value }))}
                      >
                        <SelectTrigger id="paymentStatus">
                          <SelectValue placeholder="Status auswählen..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Ausstehend</SelectItem>
                          <SelectItem value="paid">Bezahlt</SelectItem>
                          <SelectItem value="failed">Fehlgeschlagen</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Order Status */}
                    <div className="space-y-2">
                      <Label htmlFor="orderStatus">Bestellstatus *</Label>
                      <Select
                        value={manualOrderForm.status}
                        onValueChange={(value) => setManualOrderForm((prev) => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger id="orderStatus">
                          <SelectValue placeholder="Status auswählen..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Ausstehend</SelectItem>
                          <SelectItem value="confirmed">Bestätigt</SelectItem>
                          <SelectItem value="ready">Bereit</SelectItem>
                          <SelectItem value="picked_up">Abgeholt</SelectItem>
                          <SelectItem value="cancelled">Storniert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Bestellpositionen *</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addOrderItem}>
                        <Plus className="h-4 w-4 mr-2" />
                        Position hinzufügen
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {manualOrderForm.items.map((item, index) => (
                        <div key={index} className="flex gap-2 items-end">
                          <div className="flex-1 space-y-2">
                            <Select
                              value={item.productId}
                              onValueChange={(value) => updateOrderItem(index, "productId", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Produkt auswählen..." />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((product) => (
                                  <SelectItem key={product.id} value={product.id.toString()}>
                                    {product.name} - €{product.price.toFixed(2)}/{product.unit}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-24 space-y-2">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateOrderItem(index, "quantity", Number.parseInt(e.target.value) || 1)}
                              placeholder="Menge"
                            />
                          </div>
                          <div className="w-28 space-y-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.price}
                              onChange={(e) => updateOrderItem(index, "price", Number.parseFloat(e.target.value) || 0)}
                              placeholder="Preis"
                            />
                          </div>
                          {manualOrderForm.items.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeOrderItem(index)}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notizen (optional)</Label>
                    <textarea
                      id="notes"
                      value={manualOrderForm.notes}
                      onChange={(e) => setManualOrderForm((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Zusätzliche Informationen zur Bestellung..."
                      className="w-full min-h-[80px] p-2 text-sm border rounded-md resize-y"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 justify-end pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowManualOrderForm(false)
                        setManualOrderForm({
                          customerId: "",
                          customerEmail: "",
                          deliveryMethod: "pickup",
                          pickupLocationId: "",
                          distributionPersonId: "",
                          paymentMethod: "invoice",
                          paymentStatus: "pending",
                          status: "confirmed",
                          notes: "",
                          items: [{ productId: "", quantity: 1, price: 0 }],
                        })
                      }}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      onClick={(e) => {
                        console.log("[v0] Create order button clicked")
                        handleCreateManualOrder()
                      }}
                      disabled={isCreatingOrder}
                    >
                      {isCreatingOrder ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Wird erstellt...
                        </>
                      ) : (
                        "Bestellung erstellen"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nach Kunde oder Bestellnummer suchen..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch()
                    }
                  }}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch} variant="secondary">
                Suchen
              </Button>
              {searchTerm && (
                <Button onClick={handleClearSearch} variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="relative">
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                Filter
                {(statusFilter !== "all" ||
                  deliveryMethodFilter !== "all" ||
                  commentFilter !== "all" ||
                  pickupLocationFilter !== "all") && (
                  <Badge variant="secondary" className="ml-2">
                    Aktiv
                  </Badge>
                )}
              </Button>

              {showFilters && (
                <Card className="absolute top-full mt-2 w-64 z-50 shadow-lg">
                  <CardContent className="p-4 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Status</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Alle Status" />
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
                    </div>

                    <div className="h-px bg-border" />

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Abholort</Label>
                      <Select value={pickupLocationFilter} onValueChange={setPickupLocationFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Alle Abholorte" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Abholorte</SelectItem>
                          {uniquePickupLocations.map((location) => (
                            <SelectItem key={location} value={location}>
                              {location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="h-px bg-border" />

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Liefermethode</Label>
                      <Select value={deliveryMethodFilter} onValueChange={setDeliveryMethodFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Alle Methoden" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Methoden</SelectItem>
                          <SelectItem value="pickup">Abholung</SelectItem>
                          <SelectItem value="delivery">Versand</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="h-px bg-border" />

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Kommentare</Label>
                      <Select value={commentFilter} onValueChange={setCommentFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Alle Kommentare" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Kommentare</SelectItem>
                          <SelectItem value="with">Mit Kommentar</SelectItem>
                          <SelectItem value="without">Ohne Kommentar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setStatusFilter("all")
                          setDeliveryMethodFilter("all")
                          setCommentFilter("all")
                          setPickupLocationFilter("all")
                        }}
                        className="flex-1"
                      >
                        Zurücksetzen
                      </Button>
                      <Button size="sm" onClick={() => setShowFilters(false)} className="flex-1">
                        Fertig
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Button onClick={() => window.open("/admin/print-qr-codes", "_blank")} variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              QR-Codes drucken
            </Button>

            {selectedOrderIds.size > 0 ? (
              <>
                <Button onClick={() => setShowExportDialog(true)} variant="default">
                  <Download className="h-4 w-4 mr-2" />
                  Ausgewählte exportieren ({selectedOrderIds.size})
                </Button>
                <Button onClick={() => setSelectedOrderIds(new Set())} variant="outline">
                  Auswahl aufheben
                </Button>
              </>
            ) : (
              <Button onClick={() => setShowExportDialog(true)} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportieren
              </Button>
            )}
            <Button onClick={fetchOrders} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Aktualisieren
            </Button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={allFilteredSelected}
                onCheckedChange={handleSelectAll}
                className={someFilteredSelected ? "data-[state=checked]:bg-gold/50" : ""}
              />
              <span className="text-sm text-muted-foreground">
                {selectedOrderIds.size > 0
                  ? `${selectedOrderIds.size} von ${paginatedOrders.length} ausgewählt`
                  : `${totalOrdersCount} Bestellungen`}
              </span>
            </div>
          </div>

          <div className="h-[600px] overflow-auto border rounded-lg">
            <div className="space-y-2 p-4">
              {paginatedOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {orders.length === 0
                    ? "Keine Bestellungen vorhanden"
                    : "Keine Bestellungen entsprechen den Filterkriterien"}
                </div>
              ) : (
                paginatedOrders.map((order) => (
                  <OrderItem
                    key={order.id}
                    order={order}
                    onNotify={handleNotify}
                    onStatusChange={handleStatusChange}
                    onAdminNotesChange={handleAdminNotesChange}
                    onSyncStatus={handleSyncStatus}
                    onCancelInvoice={handleCancelInvoice}
                    onMarkAsPaid={handleMarkAsPaid}
                    isSelected={selectedOrderIds.has(order.id)}
                    onSelectionChange={handleOrderSelection}
                  />
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {showPagination && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Seite {currentPage} von {totalPages} ({totalOrdersCount} Bestellungen gesamt)
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Zurück
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>
                  Weiter
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <ExportOptionsDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        selectedOrderIds={selectedOrderIds.size > 0 ? Array.from(selectedOrderIds) : undefined}
        onExport={(options) =>
          exportOrders(options, selectedOrderIds.size > 0 ? Array.from(selectedOrderIds) : undefined)
        }
      />

      {showMarkAsPaidModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Als bezahlt markieren</CardTitle>
              <CardDescription>Wählen Sie die Zahlungsart und optionale Einstellungen.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="paymentMethodSelect">Zahlungsart *</Label>
                <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                  <SelectTrigger id="paymentMethodSelect">
                    <SelectValue placeholder="Zahlungsart auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Bar</SelectItem>
                    <SelectItem value="card">EC-Karte</SelectItem>
                    <SelectItem value="sumup">SumUp</SelectItem>
                    <SelectItem value="bank_transfer">Rechnung</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="coupon">Gutschein</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/50">
                <Checkbox
                  id="createInvoice"
                  checked={createInvoice}
                  onCheckedChange={(checked) => setCreateInvoice(checked as boolean)}
                />
                <div className="flex flex-col">
                  <Label htmlFor="createInvoice" className="cursor-pointer font-medium">
                    HelloCash-Rechnung erstellen
                  </Label>
                  <p className="text-xs text-muted-foreground">Rechnung wird generiert und in HelloCash gespeichert</p>
                </div>
              </div>

              {createInvoice && (
                <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/50">
                  <Checkbox
                    id="sendInvoiceEmail"
                    checked={sendInvoiceEmail}
                    onCheckedChange={(checked) => setSendInvoiceEmail(checked as boolean)}
                  />
                  <div className="flex flex-col">
                    <Label htmlFor="sendInvoiceEmail" className="cursor-pointer font-medium">
                      Rechnung per E-Mail versenden
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Wenn deaktiviert, wird die Rechnung nur generiert ohne E-Mail
                    </p>
                  </div>
                </div>
              )}

              {createInvoice && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="cashierSelect">
                      Kassierer {selectedPaymentMethod === "cash" && <span className="text-destructive">*</span>}
                    </Label>
                    <Select value={selectedCashierId} onValueChange={setSelectedCashierId} disabled={loadingEmployees}>
                      <SelectTrigger id="cashierSelect">
                        <SelectValue
                          placeholder={
                            loadingEmployees
                              ? "Lädt..."
                              : selectedPaymentMethod === "cash"
                                ? "Kassierer auswählen (Pflicht für Bar)"
                                : "Kassierer auswählen (optional)"
                          }
                        >
                          {selectedCashierId && helloCashEmployees.length > 0
                            ? (() => {
                                const selected = helloCashEmployees.find(
                                  (e) => e.employee_id.toString() === selectedCashierId,
                                )
                                return selected ? selected.employee_name : "Kassierer auswählen (optional)"
                              })()
                            : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {helloCashEmployees.map((employee) => (
                          <SelectItem key={employee.employee_id} value={employee.employee_id.toString()}>
                            {employee.employee_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 p-3 border rounded-md">
                    <Label className="font-medium">Rabatt (optional)</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={discountPercent === "5" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setDiscountPercent("5")
                          setCustomDiscountPercent("")
                        }}
                        className="flex-1"
                      >
                        5%
                      </Button>
                      <Button
                        type="button"
                        variant={discountPercent === "8" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setDiscountPercent("8")
                          setCustomDiscountPercent("")
                        }}
                        className="flex-1"
                      >
                        8%
                      </Button>
                      <Button
                        type="button"
                        variant={discountPercent === "10" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setDiscountPercent("10")
                          setCustomDiscountPercent("")
                        }}
                        className="flex-1"
                      >
                        10%
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customDiscountPercent" className="text-sm text-muted-foreground">
                        Oder eigener Prozentsatz
                      </Label>
                      <Input
                        id="customDiscountPercent"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        placeholder="0"
                        value={customDiscountPercent}
                        onChange={(e) => {
                          setCustomDiscountPercent(e.target.value)
                          setDiscountPercent("")
                        }}
                      />
                    </div>
                    {(discountPercent || customDiscountPercent) &&
                      selectedOrderForPayment &&
                      (() => {
                        const order = orders.find((o) => o.id === selectedOrderForPayment)
                        if (!order) return null
                        const percent = discountPercent
                          ? Number.parseFloat(discountPercent)
                          : Number.parseFloat(customDiscountPercent) || 0
                        const amount = (order.total * percent) / 100
                        return (
                          <p className="text-sm text-muted-foreground">
                            Rabatt: {percent}% ({amount.toFixed(2)} €)
                          </p>
                        )
                      })()}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="invoiceText" className="text-sm">
                      Rechnungstext (optional)
                    </Label>
                    <textarea
                      id="invoiceText"
                      placeholder="z.B. Lieferung für Projektname"
                      value={invoiceText}
                      onChange={(e) => setInvoiceText(e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-md text-sm resize-none h-20 bg-background"
                    />
                    <p className="text-xs text-muted-foreground">
                      Dieser Text wird auf der HelloCash-Rechnung angezeigt
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded-md bg-yellow-50">
                    <Checkbox
                      id="invoiceTestMode"
                      checked={invoiceTestMode}
                      onCheckedChange={(checked) => setInvoiceTestMode(checked as boolean)}
                    />
                    <div className="flex flex-col">
                      <Label htmlFor="invoiceTestMode" className="cursor-pointer font-medium">
                        Als Test-Rechnung erstellen
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Test-Rechnungen erscheinen nicht in der echten Buchhaltung
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded-md bg-blue-50">
                    <Checkbox
                      id="includeCustomerAddress"
                      checked={includeCustomerAddress}
                      onCheckedChange={(checked) => setIncludeCustomerAddress(checked as boolean)}
                    />
                    <div className="flex flex-col">
                      <Label htmlFor="includeCustomerAddress" className="cursor-pointer font-medium">
                        Kundenadresse auf Rechnung anzeigen
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Deaktivieren um Rechnungen ohne Kundenanschrift zu erstellen
                      </p>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowMarkAsPaidModal(false)
                    setSelectedOrderForPayment(null)
                    setSelectedPaymentMethod("bank_transfer")
                    setCreateInvoice(true)
                    setSendInvoiceEmail(true)
                    setDiscountPercent("")
                    setCustomDiscountPercent("")
                    setInvoiceTestMode(false)
                    setIncludeCustomerAddress(true)
                    setSelectedCashierId("")
                    setInvoiceText("")
                  }}
                  disabled={isMarkingAsPaid}
                >
                  Abbrechen
                </Button>
                <Button variant="default" onClick={handleConfirmMarkAsPaid} disabled={isMarkingAsPaid}>
                  {isMarkingAsPaid ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Wird verarbeitet...
                    </>
                  ) : createInvoice ? (
                    sendInvoiceEmail ? (
                      "Rechnung versenden"
                    ) : (
                      "Rechnung erstellen"
                    )
                  ) : (
                    "Als bezahlt markieren"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Neuen Kunden anlegen</DialogTitle>
            <DialogDescription>Nur der Name ist Pflichtfeld. Alle anderen Felder sind optional.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new_first_name">Vorname *</Label>
              <Input
                id="new_first_name"
                value={newCustomerForm.first_name}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, first_name: e.target.value })}
                placeholder="Max"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_last_name">Nachname *</Label>
              <Input
                id="new_last_name"
                value={newCustomerForm.last_name}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, last_name: e.target.value })}
                placeholder="Mustermann"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="new_email">E-Mail (optional)</Label>
              <Input
                id="new_email"
                type="email"
                value={newCustomerForm.email}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                placeholder="max@example.com"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="new_phone">Telefon (optional)</Label>
              <Input
                id="new_phone"
                value={newCustomerForm.phone}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                placeholder="+49 123 456789"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_street">Straße (optional)</Label>
              <Input
                id="new_street"
                value={newCustomerForm.street}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, street: e.target.value })}
                placeholder="Hauptstraße"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_house_number">Hausnummer (optional)</Label>
              <Input
                id="new_house_number"
                value={newCustomerForm.house_number}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, house_number: e.target.value })}
                placeholder="123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_postal_code">PLZ (optional)</Label>
              <Input
                id="new_postal_code"
                value={newCustomerForm.postal_code}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, postal_code: e.target.value })}
                placeholder="12345"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_city">Stadt (optional)</Label>
              <Input
                id="new_city"
                value={newCustomerForm.city}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, city: e.target.value })}
                placeholder="Berlin"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCustomerDialog(false)} disabled={isCreatingCustomer}>
              Abbrechen
            </Button>
            <Button onClick={handleCreateNewCustomer} disabled={isCreatingCustomer}>
              {isCreatingCustomer ? "Wird angelegt..." : "Kunde anlegen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default memo(OrderManagement)
