"use client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Activity,
  Bell,
  Users,
  ShoppingCart,
  Euro,
  Heart,
  Edit,
  Send,
  Loader2,
} from "lucide-react"
import { useState } from "react"

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

interface CustomerDetailModalProps {
  customer: ExtendedCustomer | null
  isOpen: boolean
  onClose: () => void
  onEdit: (customer: ExtendedCustomer) => void
}

export default function CustomerDetailModal({ customer, isOpen, onClose, onEdit }: CustomerDetailModalProps) {
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [notificationSuccess, setNotificationSuccess] = useState<string | null>(null)
  const [notificationError, setNotificationError] = useState<string | null>(null)
  const [customSubject, setCustomSubject] = useState("")
  const [customContent, setCustomContent] = useState("")
  const [selectedNotificationType, setSelectedNotificationType] = useState<string>("")

  if (!customer) return null

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Nicht verfügbar"
    return new Date(dateString).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return "0,00 €"
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const getStatusBadge = (status?: string, type: "account" | "customer" = "customer") => {
    if (type === "account") {
      return status === "has_account" ? (
        <Badge variant="default" className="bg-green-100 text-green-800">
          Hat Konto
        </Badge>
      ) : (
        <Badge variant="secondary">Kein Konto</Badge>
      )
    }

    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Aktiv
          </Badge>
        )
      case "inactive":
        return <Badge variant="secondary">Inaktiv</Badge>
      case "blocked":
        return <Badge variant="destructive">Gesperrt</Badge>
      default:
        return <Badge variant="secondary">Unbekannt</Badge>
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
      <DialogContent
        className="w-[95vw] h-[95vh] max-w-none max-h-none overflow-y-auto p-6"
        style={{
          width: "95vw",
          height: "95vh",
          maxWidth: "none",
          maxHeight: "none",
        }}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
              <User className="w-7 h-7" />
              {customer.first_name} {customer.last_name}
            </DialogTitle>
            <Button onClick={() => onEdit(customer)} size="sm" className="text-base px-4 py-2">
              <Edit className="w-5 h-5 mr-2" />
              Bearbeiten
            </Button>
          </div>
          <DialogDescription className="text-base mt-2">
            Detaillierte Kundeninformationen für {customer.first_name} {customer.last_name}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 mt-8">
          {/* Grundinformationen */}
          <Card className="h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-3">
                <User className="w-6 h-6" />
                Grundinformationen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4">
                <Mail className="w-6 h-6 text-gray-500 flex-shrink-0" />
                <span className="break-all text-base">{customer.email || "Nicht angegeben"}</span>
              </div>
              <div className="flex items-center gap-4">
                <Phone className="w-6 h-6 text-gray-500 flex-shrink-0" />
                <span className="text-base">{customer.phone || "Nicht angegeben"}</span>
              </div>
              <div className="flex items-start gap-4">
                <MapPin className="w-6 h-6 text-gray-500 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed text-base">
                  {customer.street && customer.house_number
                    ? `${customer.street} ${customer.house_number}, ${customer.postal_code} ${customer.city}`
                    : "Adresse nicht vollständig"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Status & Aktivität */}
          <Card className="h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-3">
                <Activity className="w-6 h-6" />
                Status & Aktivität
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-base">Kontostatus:</span>
                {getStatusBadge(customer.account_status, "account")}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-base">Kundenstatus:</span>
                {getStatusBadge(customer.customer_status)}
              </div>
              <div className="flex items-center gap-4">
                <Calendar className="w-6 h-6 text-gray-500 flex-shrink-0" />
                <div>
                  <div className="font-medium text-base">Registriert:</div>
                  <div className="text-base text-gray-600">{formatDate(customer.registration_date)}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Activity className="w-6 h-6 text-gray-500 flex-shrink-0" />
                <div>
                  <div className="font-medium text-base">Letzte Aktivität:</div>
                  <div className="text-base text-gray-600">{formatDate(customer.last_activity)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Kommunikationspräferenzen */}
          <Card className="h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-3">
                <Bell className="w-6 h-6" />
                Kommunikation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-base">Newsletter:</span>
                <Badge
                  variant={customer.newsletter_subscription ? "default" : "secondary"}
                  className="ml-2 text-sm px-3 py-1"
                >
                  {customer.newsletter_subscription ? "Abonniert" : "Nicht abonniert"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-base">Erinnerungen:</span>
                <Badge
                  variant={customer.reminder_notifications ? "default" : "secondary"}
                  className="ml-2 text-sm px-3 py-1"
                >
                  {customer.reminder_notifications ? "Aktiviert" : "Deaktiviert"}
                </Badge>
              </div>
              {customer.referral_source && (
                <div className="flex items-center gap-4">
                  <Users className="w-6 h-6 text-gray-500 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-base">Empfehlung:</div>
                    <div className="text-base text-gray-600">{customer.referral_source}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bestellhistorie */}
          <Card className="h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-3">
                <ShoppingCart className="w-6 h-6" />
                Bestellhistorie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-base">Anzahl Bestellungen:</span>
                <Badge variant="outline" className="text-lg px-4 py-2 font-semibold">
                  {customer.total_orders || 0}
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <Euro className="w-6 h-6 text-gray-500 flex-shrink-0" />
                <div>
                  <div className="font-medium text-base">Gesamtumsatz:</div>
                  <div className="text-xl font-bold text-green-600">{formatCurrency(customer.total_spent)}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Euro className="w-6 h-6 text-gray-500 flex-shrink-0" />
                <div>
                  <div className="font-medium text-base">Ø Bestellwert:</div>
                  <div className="text-xl font-bold">{formatCurrency(customer.average_order_value)}</div>
                </div>
              </div>
              {customer.last_order_date && (
                <div className="flex items-center gap-4">
                  <Calendar className="w-6 h-6 text-gray-500 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-base">Letzte Bestellung:</div>
                    <div className="text-base text-gray-600">{formatDate(customer.last_order_date)}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Verteilersystem */}
          <Card className="h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-3">
                <Users className="w-6 h-6" />
                Verteilersystem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-base">Teilnahme:</span>
                <Badge
                  variant={customer.distribution_system_benefits?.participated ? "default" : "secondary"}
                  className="ml-2 text-sm px-3 py-1"
                >
                  {customer.distribution_system_benefits?.participated ? "Ja" : "Nein"}
                </Badge>
              </div>
              {customer.distribution_system_benefits?.participated && (
                <>
                  <div className="flex items-center gap-4">
                    <Euro className="w-6 h-6 text-gray-500 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-base">Gesamtvorteile:</div>
                      <div className="text-xl font-bold text-blue-600">
                        {formatCurrency(customer.distribution_system_benefits.total_benefits)}
                      </div>
                    </div>
                  </div>
                  {customer.distribution_system_benefits.last_benefit_date && (
                    <div className="flex items-center gap-4">
                      <Calendar className="w-6 h-6 text-gray-500 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-base">Letzter Vorteil:</div>
                        <div className="text-base text-gray-600">
                          {formatDate(customer.distribution_system_benefits.last_benefit_date)}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Lieblingskategorien */}
          {customer.favorite_categories && customer.favorite_categories.length > 0 && (
            <Card className="h-fit">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-3">
                  <Heart className="w-6 h-6" />
                  Lieblingskategorien
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {customer.favorite_categories.map((category, index) => (
                    <Badge key={index} variant="outline" className="text-base px-3 py-1">
                      {category}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Benachrichtigungen senden */}
          <Card className="lg:col-span-2 xl:col-span-3">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-3">
                <Mail className="w-6 h-6" />
                Benachrichtigungen senden
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Schnellbenachrichtigungen */}
              <div>
                <h4 className="font-medium text-base mb-3">Schnellbenachrichtigungen:</h4>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => sendNotification("newsletter")}
                    disabled={notificationLoading || !customer.email}
                    variant="outline"
                    size="sm"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Newsletter
                  </Button>
                  <Button
                    onClick={() => sendNotification("reminder")}
                    disabled={notificationLoading || !customer.email}
                    variant="outline"
                    size="sm"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Erinnerung
                  </Button>
                  <Button
                    onClick={() => sendNotification("welcome")}
                    disabled={notificationLoading || !customer.email}
                    variant="outline"
                    size="sm"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Willkommen
                  </Button>
                  <Button
                    onClick={() => sendNotification("birthday")}
                    disabled={notificationLoading || !customer.email}
                    variant="outline"
                    size="sm"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Geburtstag
                  </Button>
                </div>
              </div>

              {/* Benutzerdefinierte Nachricht */}
              <div className="border-t pt-6">
                <h4 className="font-medium text-base mb-3">Benutzerdefinierte Nachricht:</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Betreff</label>
                    <Input
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      placeholder="E-Mail Betreff eingeben..."
                      disabled={notificationLoading}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Nachricht</label>
                    <Textarea
                      value={customContent}
                      onChange={(e) => setCustomContent(e.target.value)}
                      placeholder="Nachricht eingeben..."
                      rows={4}
                      disabled={notificationLoading}
                    />
                  </div>
                  <Button
                    onClick={() => sendNotification("custom")}
                    disabled={notificationLoading || !customer.email || !customSubject || !customContent}
                    className="w-full sm:w-auto"
                  >
                    {notificationLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Nachricht senden
                  </Button>
                </div>
              </div>

              {/* Statusmeldungen */}
              {notificationSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 text-sm">{notificationSuccess}</p>
                </div>
              )}
              {notificationError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">{notificationError}</p>
                </div>
              )}
              {!customer.email && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">Kunde hat keine E-Mail-Adresse hinterlegt</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
