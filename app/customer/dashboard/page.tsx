"use client"
import { useState, useEffect, Suspense } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarInitials } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { User, ShoppingBag, CreditCard, Settings, LogOut, Package, Calendar, Euro } from "lucide-react"
import { LoadingSpinner } from "@/components/loading-spinner"

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
  order_date: string
  total_amount: number
  status: string
  items: OrderItem[]
}

interface OrderItem {
  product_name: string
  quantity: number
  price: number
}

function DashboardContent({ user }: { user: any }) {
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadCustomerData(user.id)
  }, [user.id])

  const loadCustomerData = async (userId: string) => {
    try {
      // Load customer profile
      const { data: profileData, error: profileError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", userId)
        .single()

      if (profileError) {
        console.log("[v0] Profile error:", profileError)
      } else {
        setProfile(profileData)
      }

      // Load customer orders (mock data for now)
      const mockOrders: Order[] = [
        {
          id: "ORD-001",
          order_date: "2024-01-15",
          total_amount: 45.9,
          status: "delivered",
          items: [
            { product_name: "Hohenloher Blütenhonig 500g", quantity: 2, price: 12.9 },
            { product_name: "Hohenloher Waldhonig 250g", quantity: 1, price: 8.5 },
            { product_name: "Hohenloher Rapshonig 500g", quantity: 1, price: 11.6 },
          ],
        },
        {
          id: "ORD-002",
          order_date: "2024-02-03",
          total_amount: 28.4,
          status: "shipped",
          items: [{ product_name: "Hohenloher Akazienhonig 250g", quantity: 2, price: 14.2 }],
        },
        {
          id: "ORD-003",
          order_date: "2024-02-20",
          total_amount: 67.3,
          status: "processing",
          items: [
            { product_name: "Hohenloher Geschenkset", quantity: 1, price: 35.0 },
            { product_name: "Hohenloher Blütenhonig 1kg", quantity: 1, price: 22.9 },
            { product_name: "Hohenloher Propolis Tropfen", quantity: 1, price: 9.4 },
          ],
        },
      ]
      setOrders(mockOrders)
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      delivered: { label: "Zugestellt", variant: "default" as const },
      shipped: { label: "Versandt", variant: "secondary" as const },
      processing: { label: "In Bearbeitung", variant: "outline" as const },
      cancelled: { label: "Storniert", variant: "destructive" as const },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.processing
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const userInitials = profile
    ? `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`
    : user?.email?.[0]?.toUpperCase() || "U"

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">Hohenloher Gold</h1>
            </div>
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <AvatarInitials>{userInitials}</AvatarInitials>
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-medium">
                  {profile?.first_name} {profile?.last_name}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Willkommen zurück, {profile?.first_name || "Kunde"}!
          </h2>
          <p className="text-muted-foreground">Verwalten Sie Ihre Bestellungen, Profil und Zahlungsinformationen</p>
        </div>

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Bestellungen
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Zahlungen
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
                <div className="space-y-4">
                  {orders.map((order) => (
                    <Card key={order.id} className="border-l-4 border-l-primary">
                      <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">Bestellung #{order.id}</span>
                              {getStatusBadge(order.status)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(order.order_date).toLocaleDateString("de-DE")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Euro className="w-4 h-4" />
                                {order.total_amount.toFixed(2)} €
                              </span>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            Details anzeigen
                          </Button>
                        </div>
                        <div className="mt-4">
                          <p className="text-sm font-medium mb-2">Artikel:</p>
                          <div className="space-y-1">
                            {order.items.map((item, index) => (
                              <div key={index} className="text-sm text-muted-foreground flex justify-between">
                                <span>
                                  {item.quantity}x {item.product_name}
                                </span>
                                <span>{(item.quantity * item.price).toFixed(2)} €</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
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
                  <Button className="bg-primary hover:bg-primary/90">Profil bearbeiten</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Zahlungsmethoden
                </CardTitle>
                <CardDescription>Verwalten Sie Ihre Zahlungsinformationen</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Keine Zahlungsmethoden hinterlegt</h3>
                  <p className="text-muted-foreground mb-4">
                    Fügen Sie eine Zahlungsmethode hinzu, um Ihre Bestellungen zu vereinfachen
                  </p>
                  <Button className="bg-primary hover:bg-primary/90">Zahlungsmethode hinzufügen</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
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
