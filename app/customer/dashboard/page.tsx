"use client"
import { useState, useEffect, Suspense } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import {
  User,
  ShoppingBag,
  Settings,
  LogOut,
  Package,
  Calendar,
  Euro,
  Download,
  Trash2,
  Shield,
  RefreshCw,
  Users,
  Bell,
  QrCode,
} from "lucide-react"
import { LoadingSpinner } from "@/components/loading-spinner"
import { ProfileEditModal } from "@/components/customer/profile-edit-modal"
import DistributorTab from "@/components/customer/distributor-tab"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface CustomerProfile {
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
  newsletter_subscribed?: boolean
  reminder_notifications?: boolean
  marketing_consent?: boolean
}

interface Order {
  id: string
  order_number: string
  order_time: string
  total: number
  subtotal: number
  shipping_cost: number
  status: string
  payment_status: string
  payment_method: string
  delivery_method: string
  pickup_location?: string
  pickup_date?: string
  notes?: string
  items: OrderItem[]
  hellocash_invoice_number?: string
  pickup_token?: string
  qr_code_expires_at?: string
}

interface OrderItem {
  id: string
  product_name: string
  product_category: string
  product_size?: string
  quantity: number
  unit_price: number
  expected_delivery_date?: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function DashboardContent({ user }: { user: any }) {
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false)
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false)
  const [reminderNotifications, setReminderNotifications] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [isSavingPreferences, setIsSavingPreferences] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const router = useRouter()
  const { signOut } = useAuth()

  const {
    data: ordersData,
    error: ordersError,
    isLoading: ordersLoading,
    mutate: refreshOrders,
  } = useSWR("/api/customer/orders", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 0,
  })

  const orders: Order[] = ordersData?.data || []

  useEffect(() => {
    loadCustomerData(user.id)
  }, [user.id])

  const loadCustomerData = async (userId: string) => {
    try {
      const response = await fetch(`/api/customer/profile`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Fehler beim Laden der Daten")
      }

      const result = await response.json()
      const profileData = result.data

      setProfile(profileData)
      setNewsletterSubscribed(profileData.newsletter_subscribed || false)
      setReminderNotifications(profileData.reminder_notifications || false)
      setMarketingConsent(profileData.marketing_consent || false)
    } catch (error) {
      console.error("[v0] Error loading customer data:", error)
    }
  }

  const handleLogout = async () => {
    try {
      console.log("[v0] Logging out customer...")
      await signOut()
      router.push("/")
    } catch (error) {
      console.error("[v0] Logout error:", error)
    }
  }

  const handleExportData = async () => {
    console.log("[v0] Export data button clicked")
    try {
      console.log("[v0] Fetching export data from API...")
      const response = await fetch("/api/customer/export-data")

      console.log("[v0] Response status:", response.status)
      console.log("[v0] Response headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        throw new Error("Export fehlgeschlagen")
      }

      // Get the filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition")
      let filename = `hohenloher-gold-datenexport-${new Date().toISOString().split("T")[0]}.txt`

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      console.log("[v0] Downloading file:", filename)

      // Get the text content and create a proper blob
      const text = await response.text()
      const blob = new Blob([text], { type: "text/csv; charset=utf-8" })

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()

      console.log("[v0] Download triggered successfully")

      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("[v0] Error exporting data:", error)
      alert("Fehler beim Exportieren der Daten")
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch("/api/customer/delete-account", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Löschen fehlgeschlagen")
      }

      alert("Ihr Account wurde erfolgreich gelöscht. Sie werden nun abgemeldet.")
      router.push("/")
    } catch (error) {
      console.error("[v0] Error deleting account:", error)
      alert("Fehler beim Löschen des Accounts")
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshOrders()
      await loadCustomerData(user.id)
    } catch (error) {
      console.error("[v0] Refresh error:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { label: "Bestätigt", variant: "default" as const },
      delivered: { label: "Zugestellt", variant: "default" as const },
      shipped: { label: "Versandt", variant: "secondary" as const },
      processing: { label: "In Bearbeitung", variant: "outline" as const },
      cancelled: { label: "Storniert", variant: "destructive" as const },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.processing
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { label: "Bezahlt", variant: "default" as const },
      pending: { label: "Ausstehend", variant: "outline" as const },
      failed: { label: "Fehlgeschlagen", variant: "destructive" as const },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const handleProfileUpdateSuccess = () => {
    loadCustomerData(user.id)
  }

  const handlePreferenceChange = async (field: "newsletter" | "reminders" | "marketing", value: boolean) => {
    setIsSavingPreferences(true)
    try {
      const updateData =
        field === "newsletter"
          ? { newsletter_subscribed: value }
          : field === "reminders"
            ? { reminder_notifications: value }
            : { marketing_consent: value }

      const response = await fetch("/api/customer/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        throw new Error("Fehler beim Speichern")
      }

      const result = await response.json()

      if (field === "newsletter") {
        setNewsletterSubscribed(value)
      } else if (field === "reminders") {
        setReminderNotifications(value)
      } else {
        setMarketingConsent(value)
      }

      console.log("[v0] Preferences updated successfully")
    } catch (error) {
      console.error("[v0] Error updating preferences:", error)
      alert("Fehler beim Speichern der Einstellungen")
      if (field === "newsletter") {
        setNewsletterSubscribed(!value)
      } else if (field === "reminders") {
        setReminderNotifications(!value)
      } else {
        setMarketingConsent(!value)
      }
    } finally {
      setIsSavingPreferences(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-end items-center mb-6">
          <div className="bg-white px-4 py-3 rounded-lg shadow-sm border w-full sm:w-auto">
            {/* Mobile: stacked layout, Desktop: horizontal */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <User className="w-4 h-4 text-gold flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700 truncate">{user?.email}</span>
              </div>
              <div className="flex items-center gap-2 justify-end sm:justify-start">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="text-gray-600 hover:text-gold flex-1 sm:flex-initial"
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Aktualisieren</span>
                  <span className="sm:hidden">Aktualisieren</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gold flex-1 sm:flex-initial"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Abmelden
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Willkommen zurück, {profile?.first_name || "Kunde"}!
          </h2>
          <p className="text-muted-foreground">Verwalten Sie Ihre Bestellungen, Profil und Verteiler-Informationen</p>
        </div>

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="orders" className="flex flex-col items-center gap-1 py-3">
              <ShoppingBag className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Bestellungen</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex flex-col items-center gap-1 py-3">
              <User className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Profil</span>
            </TabsTrigger>
            <TabsTrigger value="distributor" className="flex flex-col items-center gap-1 py-3">
              <Users className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Verteiler</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex flex-col items-center gap-1 py-3">
              <Shield className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Datenschutz</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Ihre Bestellungen
                </CardTitle>
                <CardDescription>Übersicht über alle Ihre Bestellungen bei Hohenloher Gold</CardDescription>
              </CardHeader>
              <CardContent>
                {ordersLoading && (
                  <div className="text-center py-8">
                    <LoadingSpinner text="Bestellungen werden geladen..." />
                  </div>
                )}

                {ordersError && (
                  <div className="text-center py-8">
                    <p className="text-destructive">Fehler beim Laden der Bestellungen</p>
                    <p className="text-sm text-muted-foreground mt-2">{ordersError.message}</p>
                  </div>
                )}

                {!ordersLoading && !ordersError && orders.length === 0 && (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Noch keine Bestellungen</h3>
                    <p className="text-muted-foreground mb-4">Sie haben noch keine Bestellungen aufgegeben</p>
                    <Button onClick={() => router.push("/shop")} className="bg-primary hover:bg-primary/90">
                      Zum Shop
                    </Button>
                  </div>
                )}

                {!ordersLoading && !ordersError && orders.length > 0 && (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <Card
                        key={order.id}
                        className={`border-l-4 ${
                          order.status === "cancelled" ? "border-l-destructive opacity-60" : "border-l-primary"
                        }`}
                      >
                        <CardContent className="pt-6">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">Bestellung #{order.order_number}</span>
                                {getStatusBadge(order.status)}
                                {getPaymentStatusBadge(order.payment_status)}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(order.order_time).toLocaleDateString("de-DE")}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Euro className="w-4 h-4" />
                                  {order.total.toFixed(2)} €
                                </span>
                                {order.delivery_method === "pickup" && order.pickup_location && (
                                  <span className="text-xs">Abholung: {order.pickup_location}</span>
                                )}
                                {order.delivery_method === "delivery" && <span className="text-xs">Lieferung</span>}
                              </div>
                              {order.hellocash_invoice_number && (
                                <div className="text-sm text-muted-foreground">
                                  <span className="font-medium">Rechnungsnummer:</span> {order.hellocash_invoice_number}
                                </div>
                              )}
                              {order.pickup_date && (
                                <div className="text-sm text-muted-foreground">
                                  <span className="font-medium">Liefertermin:</span>{" "}
                                  {new Date(order.pickup_date + "T00:00:00").toLocaleDateString("de-DE", {
                                    day: "2-digit",
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </div>
                              )}
                              {order.pickup_token && (
                                <div className="text-sm">
                                  <a
                                    href={`/pos/pickup?token=${order.pickup_token}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-primary hover:underline"
                                  >
                                    <QrCode className="w-4 h-4" />
                                    <span>Abholseite mit QR-Code öffnen</span>
                                  </a>
                                  {order.qr_code_expires_at && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Gültig bis:{" "}
                                      {new Date(order.qr_code_expires_at).toLocaleDateString("de-DE", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                            {order.payment_status === "paid" && order.hellocash_invoice_number && (
                              <div className="flex-shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2 bg-transparent"
                                  onClick={() => {
                                    window.open(`/api/invoices/${order.id}/pdf`, "_blank")
                                  }}
                                >
                                  <Download className="w-4 h-4" />
                                  Rechnung herunterladen
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="mt-4">
                            <p className="text-sm font-medium mb-2">Artikel ({order.items.length}):</p>
                            <div className="space-y-1">
                              {order.items.map((item) => (
                                <div key={item.id} className="text-sm text-muted-foreground flex justify-between">
                                  <span>
                                    {item.quantity}x {item.product_name}
                                    {item.product_size && ` (${item.product_size})`}
                                  </span>
                                  <span>{(item.quantity * item.unit_price).toFixed(2)} €</span>
                                </div>
                              ))}
                            </div>
                            {order.shipping_cost > 0 && (
                              <div className="text-sm text-muted-foreground flex justify-between mt-2 pt-2 border-t">
                                <span>Versandkosten</span>
                                <span>{order.shipping_cost.toFixed(2)} €</span>
                              </div>
                            )}
                            <div className="text-sm font-semibold flex justify-between mt-2 pt-2 border-t">
                              <span>Gesamt</span>
                              <span>{order.total.toFixed(2)} €</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Profil verwalten
                </CardTitle>
                <CardDescription>Bearbeiten Sie Ihre persönlichen Informationen</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Vorname</label>
                      <p className="text-muted-foreground">{profile?.first_name || "Nicht angegeben"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Nachname</label>
                      <p className="text-muted-foreground">{profile?.last_name || "Nicht angegeben"}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">E-Mail-Adresse</label>
                    <p className="text-muted-foreground">{user?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Telefonnummer</label>
                    <p className="text-muted-foreground">{profile?.phone || "Nicht angegeben"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Adresse</label>
                    <p className="text-muted-foreground">
                      {profile?.street || profile?.house_number ? (
                        <>
                          {profile.street} {profile.house_number}
                          <br />
                          {profile.postal_code} {profile.city}
                        </>
                      ) : (
                        "Nicht angegeben"
                      )}
                    </p>
                  </div>
                  <Button onClick={() => setIsProfileEditOpen(true)} className="bg-primary hover:bg-primary/90">
                    Profil bearbeiten
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Benachrichtigungseinstellungen
                </CardTitle>
                <CardDescription>
                  Verwalten Sie Ihre E-Mail-Benachrichtigungen und Newsletter-Einstellungen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start justify-between gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">Marketing-E-Mails</span>
                      {marketingConsent && (
                        <Badge variant="secondary" className="text-xs">
                          Aktiv
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Erhalten Sie personalisierte Angebote und Produktempfehlungen per E-Mail
                    </p>
                  </div>
                  <Switch
                    checked={marketingConsent}
                    onCheckedChange={(checked) => handlePreferenceChange("marketing", checked)}
                    disabled={isSavingPreferences}
                  />
                </div>

                <div className="flex items-start justify-between gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">Newsletter</span>
                      {newsletterSubscribed && (
                        <Badge variant="secondary" className="text-xs">
                          Aktiv
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Erhalten Sie Neuigkeiten, Angebote und Informationen zu neuen Produkten per E-Mail
                    </p>
                  </div>
                  <Switch
                    checked={newsletterSubscribed}
                    onCheckedChange={(checked) => handlePreferenceChange("newsletter", checked)}
                    disabled={isSavingPreferences}
                  />
                </div>

                <div className="flex items-start justify-between gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">Abholungs-Erinnerungen</span>
                      {reminderNotifications && (
                        <Badge variant="secondary" className="text-xs">
                          Aktiv
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Erhalten Sie Erinnerungen an bevorstehende Abholtermine für Ihre Bestellungen
                    </p>
                  </div>
                  <Switch
                    checked={reminderNotifications}
                    onCheckedChange={(checked) => handlePreferenceChange("reminders", checked)}
                    disabled={isSavingPreferences}
                  />
                </div>

                {isSavingPreferences && (
                  <p className="text-sm text-muted-foreground text-center">Einstellungen werden gespeichert...</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distributor" className="space-y-6">
            <DistributorTab />
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Datenschutz & DSGVO
                </CardTitle>
                <CardDescription>
                  Verwalten Sie Ihre persönlichen Daten gemäß der Datenschutz-Grundverordnung (DSGVO)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border rounded-lg p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Download className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">Daten exportieren</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Laden Sie eine Kopie all Ihrer persönlichen Daten herunter, die wir über Sie gespeichert haben.
                        Dies umfasst Ihr Profil, Bestellhistorie und alle anderen Informationen.
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        <strong>DSGVO Artikel 20:</strong> Recht auf Datenübertragbarkeit
                      </p>
                      <Button onClick={handleExportData} variant="outline" className="gap-2 bg-transparent">
                        <Download className="w-4 h-4" />
                        Daten exportieren
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">Datenaufbewahrung</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Wir speichern Ihre Daten gemäß den gesetzlichen Aufbewahrungsfristen:
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                        <li>Bestelldaten: 10 Jahre (steuerrechtliche Aufbewahrungspflicht)</li>
                        <li>Rechnungen: 10 Jahre (HGB §257)</li>
                        <li>Kundendaten: Bis zur Löschung des Accounts oder 3 Jahre nach letzter Aktivität</li>
                        <li>Newsletter-Daten: Bis zum Widerruf der Einwilligung</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="border border-destructive/50 rounded-lg p-6 space-y-4 bg-destructive/5">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-destructive/10 rounded-lg">
                      <Trash2 className="w-6 h-6 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-destructive mb-2 break-words">Account löschen</h3>
                      <p className="text-sm text-muted-foreground mb-4 break-words">
                        Wenn Sie Ihren Account löschen, werden Ihre persönlichen Daten anonymisiert. Bestelldaten werden
                        aus rechtlichen Gründen (Buchführung, Steuern) für 10 Jahre aufbewahrt, aber ohne Bezug zu Ihrer
                        Person.
                      </p>
                      <p className="text-xs text-muted-foreground italic break-words">
                        DSGVO Artikel 17: Recht auf Löschung {"("}
                        <a
                          href="https://dsgvo-gesetz.de/art-17-dsgvo/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-foreground break-all"
                        >
                          Recht auf Vergessenwerden
                        </a>
                        {")"}
                      </p>
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                        <p className="text-sm text-amber-800 break-words">
                          <strong>Wichtig:</strong> Diese Aktion kann nicht rückgängig gemacht werden. Nach der Löschung
                          können Sie sich nicht mehr einloggen und haben keinen Zugriff mehr auf Ihre Bestellhistorie.
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button variant="destructive" className="w-full" onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Account unwiderruflich löschen
                  </Button>
                </div>

                <div className="text-center pt-4">
                  <p className="text-sm text-muted-foreground">
                    Weitere Informationen finden Sie in unserer{" "}
                    <a href="/privacy" className="text-primary hover:underline">
                      Datenschutzerklärung
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {profile && (
        <ProfileEditModal
          open={isProfileEditOpen}
          onOpenChange={setIsProfileEditOpen}
          customer={profile}
          onSuccess={handleProfileUpdateSuccess}
        />
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Account wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Ihre persönlichen Daten werden anonymisiert.
              Bestelldaten bleiben aus rechtlichen Gründen erhalten, werden aber von Ihrem Account getrennt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Wird gelöscht..." : "Endgültig löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function AuthenticatedDashboard() {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const { user: authUser, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authUser) {
      console.log("[v0] No user found, redirecting to login")
      router.push("/customer/login")
      return
    }

    console.log("[v0] User found:", authUser.email)
    setUser(authUser)
  }, [authUser, router])

  if (!user) {
    return null
  }

  return (
    <Suspense fallback={<LoadingSpinner className="min-h-screen" text="Lade Dashboard..." />}>
      <DashboardContent user={user} />
    </Suspense>
  )
}

export default function CustomerDashboard() {
  return (
    <Suspense fallback={<LoadingSpinner className="min-h-screen" text="Authentifizierung wird geprüft..." />}>
      <AuthenticatedDashboard />
    </Suspense>
  )
}
