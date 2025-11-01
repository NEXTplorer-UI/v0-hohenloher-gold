"use client"
import { useState, useEffect, Suspense } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
} from "lucide-react"
import { LoadingSpinner } from "@/components/loading-spinner"
import { ProfileEditModal } from "@/components/customer/profile-edit-modal"
import DistributorTab from "@/components/customer/distributor-tab"

interface CustomerProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  address?: string
  city?: string
  postal_code?: string
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
  const router = useRouter()
  const supabase = createClient()

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
      const { data: profileData, error: profileError } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", userId)
        .single()

      if (profileError) {
        console.log("[v0] Profile error:", profileError)
      } else {
        setProfile(profileData)
      }
    } catch (error) {
      console.error("[v0] Error loading customer data:", error)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/")
    } catch (error) {
      console.error("[v0] Logout error:", error)
    }
  }

  const handleExportData = async () => {
    try {
      const response = await fetch("/api/customer/export-data")
      if (!response.ok) {
        throw new Error("Export fehlgeschlagen")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `hohenloher-gold-daten-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("[v0] Error exporting data:", error)
      alert("Fehler beim Exportieren der Daten")
    }
  }

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        "Sind Sie sicher, dass Sie Ihren Account löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.",
      )
    ) {
      return
    }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-end items-center mb-6">
          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-lg shadow-sm border">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gold" />
              <span className="text-sm font-medium text-gray-700">{user?.email}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-gray-600 hover:text-gold"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
              Aktualisieren
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-600 hover:text-gold">
              <LogOut className="w-4 h-4 mr-1" />
              Abmelden
            </Button>
          </div>
        </div>

        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Willkommen zurück, {profile?.first_name || "Kunde"}!
          </h2>
          <p className="text-muted-foreground">Verwalten Sie Ihre Bestellungen, Profil und Verteiler-Informationen</p>
        </div>

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Bestellungen
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="distributor" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Verteiler
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Datenschutz
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
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
                      <Card key={order.id} className="border-l-4 border-l-primary">
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
                              {order.pickup_date && (
                                <div className="text-sm text-muted-foreground">
                                  <span className="font-medium">Liefertermin:</span>{" "}
                                  {new Date(order.pickup_date).toLocaleDateString("de-DE", {
                                    day: "2-digit",
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </div>
                              )}
                            </div>
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

          {/* Profile Tab */}
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
                      {profile?.address ? (
                        <>
                          {profile.address}
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
          </TabsContent>

          {/* Distributor Tab */}
          <TabsContent value="distributor" className="space-y-6">
            <DistributorTab />
          </TabsContent>

          {/* Privacy Tab */}
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
                {/* Data Export Section */}
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
                        Daten als JSON exportieren
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Data Retention Policy */}
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

                {/* Account Deletion Section */}
                <div className="border border-destructive/50 rounded-lg p-6 space-y-4 bg-destructive/5">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-destructive/10 rounded-lg">
                      <Trash2 className="w-6 h-6 text-destructive" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2 text-destructive">Account löschen</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Wenn Sie Ihren Account löschen, werden Ihre persönlichen Daten anonymisiert. Bestelldaten werden
                        aus rechtlichen Gründen (Buchhaltung, Steuern) für 10 Jahre aufbewahrt, aber ohne Bezug zu Ihrer
                        Person.
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        <strong>DSGVO Artikel 17:</strong> Recht auf Löschung ("Recht auf Vergessenwerden")
                      </p>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-amber-800">
                          <strong>Wichtig:</strong> Diese Aktion kann nicht rückgängig gemacht werden. Nach der Löschung
                          können Sie sich nicht mehr einloggen und haben keinen Zugriff mehr auf Ihre Bestellhistorie.
                        </p>
                      </div>
                      <Button
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                        variant="destructive"
                        className="gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        {isDeleting ? "Wird gelöscht..." : "Account unwiderruflich löschen"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Privacy Policy Link */}
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

      {/* Profile Edit Modal */}
      {profile && (
        <ProfileEditModal
          open={isProfileEditOpen}
          onOpenChange={setIsProfileEditOpen}
          customer={profile}
          onSuccess={handleProfileUpdateSuccess}
        />
      )}
    </div>
  )
}

function AuthenticatedDashboard() {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        console.log("[v0] No user found, redirecting to login")
        router.push("/customer/login")
        return
      }

      console.log("[v0] User found:", user.email)
      setUser(user)
    } catch (error) {
      console.error("[v0] Error checking user:", error)
      router.push("/customer/login")
    }
  }

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
