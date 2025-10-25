"use client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Edit } from "lucide-react"
import { useState } from "react"
import type { ExtendedCustomer } from "@/types/customer"

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

  if (!customer) return null

  const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(" ")

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
      console.error("[v0] Error sending notification:", error)
      setNotificationError("Unerwarteter Fehler beim Senden")
    } finally {
      setNotificationLoading(false)
    }
  }

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                  {fp.name || `#${fp.product_id}`} · {fp.quantity}×
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

        {/* Kategorien */}
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

        {/* Footer */}
        <div className="mt-6 flex gap-2 justify-end border-t pt-4">
          <Button onClick={onClose} variant="outline">
            Schließen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
