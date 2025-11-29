"use client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Edit, Mail, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import type { ExtendedCustomer } from "@/types/customer"
import { useToast } from "@/hooks/use-toast"
import { createBrowserClient } from "@/lib/supabase/client"

function formatCurrency(amount?: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount ?? 0)
}

function formatDate(dateString?: string | null) {
  if (!dateString) return "-"
  const d = new Date(dateString)
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric" })
}

export default function CustomerDetailModal({
  customer,
  isOpen,
  onClose,
  onEdit,
}: {
  customer: ExtendedCustomer | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (c: ExtendedCustomer) => void
}) {
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [notificationSuccess, setNotificationSuccess] = useState<string | null>(null)
  const [notificationError, setNotificationError] = useState<string | null>(null)
  const [customSubject, setCustomSubject] = useState("")
  const [customContent, setCustomContent] = useState("")
  const [selectedNotificationType, setSelectedNotificationType] = useState<string>("")
  const { toast } = useToast()
  const [resendingInvoice, setResendingInvoice] = useState<string | null>(null)
  const [customerOrders, setCustomerOrders] = useState<any[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen && customer?.id) {
      console.log("[v0] CustomerDetailModal - fetching orders for customer:", customer.id, customer.name)
      const fetchCustomerOrders = async () => {
        setLoadingOrders(true)
        try {
          const supabase = createBrowserClient()
          console.log("[v0] CustomerDetailModal - querying orders table with customer_id:", customer.id)

          const { data, error } = await supabase
            .from("orders")
            .select(`
              id, 
              order_number, 
              created_at, 
              total, 
              hellocash_invoice_id, 
              hellocash_invoice_number,
              delivery_method,
              pickup_location_id,
              order_items (
                id,
                product_id,
                product_name,
                quantity,
                unit_price
              )
            `)
            .eq("customer_id", customer.id)
            .order("created_at", { ascending: false })
            .limit(50)

          console.log("[v0] CustomerDetailModal - orders query result:", {
            count: data?.length || 0,
            error: error?.message || null,
            data: data?.slice(0, 2), // First 2 orders for debugging
          })

          if (error) {
            console.error("[v0] CustomerDetailModal - Supabase error:", error)
          }

          if (!error && data) {
            console.log("[v0] CustomerDetailModal - setting", data.length, "orders")
            setCustomerOrders(data)
          } else {
            console.log("[v0] CustomerDetailModal - no orders found or error occurred")
            setCustomerOrders([])
          }
        } catch (error) {
          console.error("[v0] CustomerDetailModal - Error fetching customer orders:", error)
          setCustomerOrders([])
        } finally {
          setLoadingOrders(false)
        }
      }

      fetchCustomerOrders()
    } else {
      console.log("[v0] CustomerDetailModal - NOT fetching orders. isOpen:", isOpen, "customer.id:", customer?.id)
    }
  }, [isOpen, customer?.id])

  const handleResendInvoice = async (orderId: string, orderNumber: string) => {
    setResendingInvoice(orderId)
    try {
      const response = await fetch("/api/admin/resend-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Rechnung versendet",
          description: data.pdfAttached
            ? `Rechnung für Bestellung ${orderNumber} wurde erfolgreich per E-Mail versendet.`
            : `E-Mail wurde versendet, aber PDF war zu groß für Anhang.`,
        })
      } else {
        toast({
          title: "Fehler",
          description: data.error || "Rechnung konnte nicht versendet werden",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error resending invoice:", error)
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten",
        variant: "destructive",
      })
    } finally {
      setResendingInvoice(null)
    }
  }

  const sendNotification = async (type: string, subject?: string, content?: string) => {
    if (!customer.email) {
      setNotificationError("Kunde hat keine E-Mail-Adresse")
      return
    }

    setNotificationLoading(true)
    setNotificationError(null)
    setNotificationSuccess(null)

    try {
      let emailSubject = subject || ""
      let emailContent = content || ""

      switch (type) {
        case "newsletter":
          emailSubject = "Newsletter - Hohenloher Gold"
          emailContent = `Liebe/r ${customer.first_name} ${customer.last_name},\n\nhier ist unser aktueller Newsletter mit den neuesten Angeboten und Informationen.\n\nMit freundlichen Grüßen,\nIhr Hohenloher Gold Team`
          break
        case "reminder":
          emailSubject = "Erinnerung - Hohenloher Gold"
          emailContent = `Liebe/r ${customer.first_name} ${customer.last_name},\n\nwir möchten Sie daran erinnern, dass wir wieder frische Produkte für Sie haben.\n\nBesuchen Sie uns gerne!\n\nMit freundlichen Grüßen,\nIhr Hohenloher Gold Team`
          break
        case "welcome":
          emailSubject = "Willkommen bei Hohenloher Gold!"
          emailContent = `Liebe/r ${customer.first_name} ${customer.last_name},\n\nherzlich willkommen bei Hohenloher Gold!\n\nWir freuen uns, Sie als Kunden begrüßen zu dürfen und stehen Ihnen gerne für alle Fragen zur Verfügung.\n\nMit freundlichen Grüßen,\nIhr Hohenloher Gold Team`
          break
        case "birthday":
          emailSubject = "Herzlichen Glückwunsch zum Geburtstag!"
          emailContent = `Liebe/r ${customer.first_name} ${customer.last_name},\n\nherzlichen Glückwunsch zu Ihrem Geburtstag!\n\nWir wünschen Ihnen alles Gute und einen wunderschönen Tag.\n\nMit freundlichen Grüßen,\nIhr Hohenloher Gold Team`
          break
        case "custom":
          emailSubject = customSubject
          emailContent = customContent
          break
      }

      if (!emailSubject || !emailContent) {
        setNotificationError("Betreff und Inhalt sind erforderlich")
        return
      }

      const response = await fetch("/api/send-bulk-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: emailSubject,
          content: emailContent,
          recipients: [customer.email],
          type: type === "newsletter" ? "newsletter" : "custom",
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.results.sent > 0) {
          setNotificationSuccess(`E-Mail erfolgreich an ${customer.email} gesendet`)
          setCustomSubject("")
          setCustomContent("")
          setSelectedNotificationType("")
        } else {
          setNotificationError("E-Mail konnte nicht gesendet werden")
        }
      } else {
        setNotificationError("Fehler beim Senden der E-Mail")
      }
    } catch (error) {
      console.error("[v0] CustomerDetailModal - Error sending notification:", error)
      setNotificationError("Unerwarteter Fehler beim Senden")
    } finally {
      setNotificationLoading(false)
    }
  }

  if (!customer) return null

  const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(" ")

  console.log("[v0] CustomerDetailModal - customer data:", {
    id: customer?.id,
    name: `${customer?.first_name} ${customer?.last_name}`,
    email: customer?.email,
    account_status: customer?.account_status,
    reminder_notifications: customer?.reminder_notifications,
    newsletter_subscription: customer?.newsletter_subscription,
  })

  console.log("[v0] CustomerDetailModal - isOpen:", isOpen, "customer:", customer?.first_name, customer?.last_name)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[120rem] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">Kundendetails</DialogTitle>
            {onEdit && (
              <Button onClick={() => onEdit(customer)} size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Bearbeiten
              </Button>
            )}
          </div>
          <DialogDescription>Alle verfügbaren Informationen zu {fullName || customer.email}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Grunddaten */}
          <section className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-lg border-b pb-2">Grundinformationen</h3>
            <div className="text-sm space-y-2">
              <div>
                <span className="font-medium">Name:</span> {fullName || "-"}
              </div>
              <div>
                <span className="font-medium">E-Mail:</span> {customer.email}
              </div>
              <div>
                <span className="font-medium">Telefon:</span> {customer.phone || "-"}
              </div>
              <div>
                <span className="font-medium">Adresse:</span>{" "}
                {[
                  customer.street && `${customer.street} ${customer.house_number ?? ""}`.trim(),
                  customer.postal_code && `${customer.postal_code} ${customer.city ?? ""}`.trim(),
                  customer.country,
                ]
                  .filter(Boolean)
                  .join(", ") || "-"}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t">
              {customer.customer_status && (
                <Badge variant="secondary" className="text-xs">
                  {customer.customer_status}
                </Badge>
              )}
              {customer.account_status && (
                <Badge variant="secondary" className="text-xs">
                  {customer.account_status}
                </Badge>
              )}
              {customer.newsletter_subscribed && <Badge className="text-xs">Newsletter</Badge>}
            </div>
          </section>

          {/* Aktivität / KPIs */}
          <section className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-lg border-b pb-2">Aktivität & KPIs</h3>
            <p className="text-xs text-gray-500 italic">
              Hinweis: KPI-Statistiken berücksichtigen nur erfolgreich abgeschlossene Bestellungen (ohne stornierte).
            </p>
            <div className="text-sm space-y-2">
              <div>
                <span className="font-medium">Bestellungen gesamt:</span> {customer.order_count ?? 0}
              </div>
              <div>
                <span className="font-medium">Gesamtumsatz:</span>{" "}
                <span className="text-green-600 font-semibold">{formatCurrency(customer.total_spent)}</span>
              </div>
              <div>
                <span className="font-medium">Ø Bestellwert:</span> {formatCurrency(customer.avg_order_value)}
              </div>
              <div>
                <span className="font-medium">Letzte Bestellung:</span> {formatDate(customer.last_order_date)}
              </div>
              <div>
                <span className="font-medium">Tage seit letzter Bestellung:</span>{" "}
                {customer.days_since_last_order !== null && customer.days_since_last_order !== undefined ? (
                  <span
                    className={
                      customer.days_since_last_order > 90
                        ? "text-red-600 font-semibold"
                        : customer.days_since_last_order > 30
                          ? "text-orange-600"
                          : "text-green-600"
                    }
                  >
                    {customer.days_since_last_order} Tage
                  </span>
                ) : (
                  "-"
                )}
              </div>
              <div className="pt-2 border-t">
                <span className="font-medium">Erstellt:</span> {formatDate(customer.created_at)}
              </div>
              <div>
                <span className="font-medium">Aktualisiert:</span> {formatDate(customer.updated_at)}
              </div>
            </div>
          </section>
        </div>

        <section className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-lg border-b pb-2 mb-3">Lieblingsprodukte</h3>
          {customer.favorite_products && customer.favorite_products.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {customer.favorite_products.slice(0, 10).map((fp, idx) => (
                <Badge key={`${fp.product_id}-${idx}`} variant="outline" className="text-xs">
                  {fp.name || `Produkt #${fp.product_id}`} · {fp.quantity}×
                </Badge>
              ))}
              {customer.favorite_products.length > 10 && (
                <Badge variant="secondary" className="text-xs">
                  +{customer.favorite_products.length - 10} weitere
                </Badge>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500">Keine Daten vorhanden</div>
          )}
        </section>

        <section className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-lg border-b pb-2 mb-3">Notizen</h3>
          <div className="text-sm whitespace-pre-wrap">
            {customer.notes?.trim() ? (
              <p className="leading-relaxed">{customer.notes}</p>
            ) : (
              <span className="text-gray-500">Keine Notizen vorhanden</span>
            )}
          </div>
        </section>

        {!!customer.favorite_categories?.length && (
          <section className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-lg border-b pb-2 mb-3">Lieblingskategorien</h3>
            <div className="flex flex-wrap gap-2">
              {customer.favorite_categories.slice(0, 10).map((cat, idx) => (
                <Badge key={`${cat}-${idx}`} variant="secondary" className="text-xs">
                  {cat}
                </Badge>
              ))}
              {customer.favorite_categories.length > 10 && (
                <Badge variant="outline" className="text-xs">
                  +{customer.favorite_categories.length - 10} weitere
                </Badge>
              )}
            </div>
          </section>
        )}

        <section className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-lg border-b pb-2 mb-3">Letzte Bestellungen</h3>
          {loadingOrders ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : customerOrders.length > 0 ? (
            <div className="space-y-2">
              {customerOrders.map((order) => {
                const isExpanded = expandedOrders.has(order.id)
                return (
                  <div key={order.id} className="border rounded-lg bg-white overflow-hidden">
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        const newExpanded = new Set(expandedOrders)
                        if (isExpanded) {
                          newExpanded.delete(order.id)
                        } else {
                          newExpanded.add(order.id)
                        }
                        setExpandedOrders(newExpanded)
                      }}
                    >
                      <div className="flex-1">
                        <div className="font-medium">#{order.order_number}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(order.created_at)} • {formatCurrency(order.total)}
                          {order.delivery_method && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {order.delivery_method === "pickup" ? "Abholung" : "Lieferung"}
                            </Badge>
                          )}
                        </div>
                        {order.hellocash_invoice_number && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Rechnung: {order.hellocash_invoice_number}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {order.hellocash_invoice_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleResendInvoice(order.id, order.order_number)
                            }}
                            disabled={resendingInvoice === order.id}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            {resendingInvoice === order.id ? "Wird gesendet..." : "Rechnung senden"}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost">
                          {isExpanded ? "Weniger" : "Details"}
                        </Button>
                      </div>
                    </div>

                    {isExpanded && order.order_items && order.order_items.length > 0 && (
                      <div className="px-3 pb-3 border-t bg-gray-50">
                        <h4 className="font-medium text-sm mt-3 mb-2">Bestellpositionen:</h4>
                        <div className="space-y-1">
                          {order.order_items.map((item: any) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-sm py-2 px-3 bg-white rounded border"
                            >
                              <div className="flex-1">
                                <div className="font-medium">{item.product_name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {item.quantity}× à {formatCurrency(item.unit_price / 100)}
                                </div>
                              </div>
                              <div className="font-semibold">
                                {formatCurrency((item.quantity * item.unit_price) / 100)}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-2 border-t flex justify-between items-center font-semibold">
                          <span>Gesamt:</span>
                          <span>{formatCurrency(order.total)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-sm text-gray-500">Keine Bestellungen gefunden</div>
          )}
        </section>

        <div className="mt-6 flex gap-2 justify-end border-t pt-4">
          <Button onClick={onClose} variant="outline">
            Schließen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
