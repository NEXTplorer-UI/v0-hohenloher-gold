"use client"
import { useEffect, lazy, Suspense, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { LogOut, Clock, Shield, Users, ShoppingCart, TrendingUp, Loader2, Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { AdminProvider, useAdmin } from "@/contexts/admin-context"
import RevenueAnalyticsModal from "@/components/admin/revenue-analytics-modal"
import { RefreshCw } from "lucide-react"

const CustomerInput = lazy(() => import("@/components/admin/customer-input"))
const CustomerTable = lazy(() => import("@/components/admin/customer-table"))
const OrderManagement = lazy(() => import("@/components/admin/order-management"))
const InventoryManagement = lazy(() => import("@/components/admin/inventory-management"))
const PickupLocationManagement = lazy(() => import("@/components/admin/pickup-management"))
const SupplierOrderCalculator = lazy(() => import("@/components/admin/supplier-calculator"))
const NewsletterSystem = lazy(() => import("@/components/admin/newsletter-system"))
const ContentManagementSystem = lazy(() => import("@/components/admin/content-management"))
const ProductManagement = lazy(() => import("@/components/admin/product-management"))
const DeliveryScheduleManagement = lazy(() => import("@/components/admin/delivery-schedule-management"))
const EmailPreviewSystem = lazy(() => import("@/app/admin/emails/page"))

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin" />
    <span className="ml-2">Lädt...</span>
  </div>
)

function Analytics() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [revenueModalOpen, setRevenueModalOpen] = useState(false)
  const { dispatch } = useAdmin()

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/analytics/dashboard-stats", { cache: "no-store" })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(value)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Analytics Übersicht</h2>
        <Button onClick={fetchStats} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Aktualisieren
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setRevenueModalOpen(true)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamtumsatz</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats ? formatCurrency(stats.totalRevenue) : "€0,00"}</div>
            <p className="text-xs text-muted-foreground">
              {stats && stats.revenueGrowth !== 0 && (
                <span className={stats.revenueGrowth > 0 ? "text-green-600" : "text-red-600"}>
                  {stats.revenueGrowth > 0 ? "+" : ""}
                  {stats.revenueGrowth}% zum Vormonat
                </span>
              )}
              {(!stats || stats.revenueGrowth === 0) && "Klicken für Details"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktive Kunden</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats ? stats.activeCustomers : "0"}</div>
            <p className="text-xs text-muted-foreground">
              {stats && stats.newCustomersThisWeek > 0 && (
                <span className="text-green-600">+{stats.newCustomersThisWeek} neue diese Woche</span>
              )}
              {(!stats || stats.newCustomersThisWeek === 0) && "Letzte 30 Tage"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offene Bestellungen</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats ? stats.pendingOrders : "0"}</div>
            <p className="text-xs text-muted-foreground">
              {stats && stats.nextPickupDate
                ? `Nächste Abholung: ${stats.nextPickupDate}`
                : "Keine geplanten Abholungen"}
            </p>
          </CardContent>
        </Card>
      </div>

      <RevenueAnalyticsModal open={revenueModalOpen} onOpenChange={setRevenueModalOpen} />
    </>
  )
}

function CustomerSegments() {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/analytics/dashboard-stats", { cache: "no-store" })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error("Error fetching customer stats:", error)
      }
    }
    fetchStats()
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(value)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Bestellungen heute</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats ? stats.todayOrders : "0"}</div>
          <p className="text-xs text-muted-foreground">
            {stats && stats.yesterdayOrdersDiff !== 0 && (
              <span className={stats.yesterdayOrdersDiff > 0 ? "text-green-600" : "text-red-600"}>
                {stats.yesterdayOrdersDiff > 0 ? "+" : ""}
                {stats.yesterdayOrdersDiff} seit gestern
              </span>
            )}
            {(!stats || stats.yesterdayOrdersDiff === 0) && "Keine Änderung"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Bestellungen diese Woche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats ? stats.thisWeekOrders : "0"}</div>
          <p className="text-xs text-muted-foreground">
            {stats && stats.weeklyGrowth !== 0 && (
              <span className={stats.weeklyGrowth > 0 ? "text-green-600" : "text-red-600"}>
                {stats.weeklyGrowth > 0 ? "+" : ""}
                {stats.weeklyGrowth}% zur Vorwoche
              </span>
            )}
            {(!stats || stats.weeklyGrowth === 0) && "Keine Änderung"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Durchschnittlicher Bestellwert</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats ? formatCurrency(stats.avgOrderValue) : "€0,00"}</div>
          <p className="text-xs text-muted-foreground">Alle Bestellungen</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Abholrate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats ? `${stats.pickupRate}%` : "0%"}</div>
          <p className="text-xs text-muted-foreground">
            {stats && stats.pickupRate >= 90 && "Sehr gut"}
            {stats && stats.pickupRate >= 80 && stats.pickupRate < 90 && "Gut"}
            {stats && stats.pickupRate < 80 && "Verbesserungsbedarf"}
            {!stats && "Keine Daten"}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function AdminDashboardContent() {
  const { state, dispatch, updateActivity, handleLogout } = useAdmin()
  const router = useRouter()

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error || !user) {
          router.push("/auth/login")
          return
        }

        dispatch({ type: "SET_USER", payload: { id: user.id, email: user.email } })
      } catch (error) {
        console.error("Auth check failed:", error)
        router.push("/auth/login")
      } finally {
        dispatch({ type: "SET_LOADING", payload: false })
      }
    }

    checkAuth()

    const handleActivity = () => updateActivity()
    document.addEventListener("mousedown", handleActivity)
    document.addEventListener("keydown", handleActivity)
    document.addEventListener("scroll", handleActivity)

    return () => {
      document.removeEventListener("mousedown", handleActivity)
      document.removeEventListener("keydown", handleActivity)
      document.removeEventListener("scroll", handleActivity)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase])

  useEffect(() => {
    if (!state.autoLogoutEnabled || !state.user) return

    const interval = setInterval(() => {
      const timeSinceActivity = Date.now() - state.lastActivity
      const timeoutMs = state.logoutTimer * 60 * 1000
      const remainingMs = timeoutMs - timeSinceActivity

      if (remainingMs <= 0) {
        handleLogout()
      } else {
        dispatch({ type: "SET_TIME_UNTIL_LOGOUT", payload: Math.ceil(remainingMs / (60 * 1000)) })
      }
    }, 1000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.autoLogoutEnabled, state.logoutTimer, state.user])

  const MobileTabNavigation = () => (
    <Sheet open={state.mobileSheetOpen} onOpenChange={(open) => dispatch({ type: "SET_MOBILE_SHEET", payload: open })}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="md:hidden bg-transparent">
          <Menu className="h-4 w-4" />
          Navigation
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64">
        <div className="flex flex-col space-y-2 mt-6">
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => dispatch({ type: "SET_MOBILE_SHEET", payload: false })}
          >
            Übersicht
          </Button>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => dispatch({ type: "SET_MOBILE_SHEET", payload: false })}
          >
            Kunden
          </Button>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => dispatch({ type: "SET_MOBILE_SHEET", payload: false })}
          >
            Bestellungen
          </Button>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => dispatch({ type: "SET_MOBILE_SHEET", payload: false })}
          >
            Produkte
          </Button>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => dispatch({ type: "SET_MOBILE_SHEET", payload: false })}
          >
            Lager
          </Button>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => dispatch({ type: "SET_MOBILE_SHEET", payload: false })}
          >
            Abholorte
          </Button>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => dispatch({ type: "SET_MOBILE_SHEET", payload: false })}
          >
            Liefertermine
          </Button>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => dispatch({ type: "SET_MOBILE_SHEET", payload: false })}
          >
            Großhändler
          </Button>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => dispatch({ type: "SET_MOBILE_SHEET", payload: false })}
          >
            E-Mails
          </Button>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => dispatch({ type: "SET_MOBILE_SHEET", payload: false })}
          >
            Content
          </Button>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => dispatch({ type: "SET_MOBILE_SHEET", payload: false })}
          >
            Einstellungen
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )

  if (state.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Authentifizierung wird geprüft...</span>
      </div>
    )
  }

  if (!state.user) {
    return null
  }

  return (
    <div className="container mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold truncate">CRM Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground truncate">Willkommen zurück, {state.user?.email}</p>
        </div>
        <div className="flex items-center justify-between md:justify-end space-x-2 md:space-x-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-green-600" />
            <Badge variant="secondary" className="text-xs">
              Angemeldet
            </Badge>
            {state.autoLogoutEnabled && state.timeUntilLogout && (
              <div className="hidden sm:flex items-center space-x-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="whitespace-nowrap">{state.timeUntilLogout} Min.</span>
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="shrink-0 bg-transparent">
            <LogOut className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Abmelden</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between md:justify-start">
          <MobileTabNavigation />
          <TabsList className="hidden md:grid w-full grid-cols-5 lg:grid-cols-11 gap-1">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="customers">Kunden</TabsTrigger>
            <TabsTrigger value="orders">Bestellungen</TabsTrigger>
            <TabsTrigger value="products">Produkte</TabsTrigger>
            <TabsTrigger value="inventory">Lager</TabsTrigger>
            <TabsTrigger value="pickup">Abholorte</TabsTrigger>
            <TabsTrigger value="delivery">Liefertermine</TabsTrigger>
            <TabsTrigger value="supplier">Großhändler</TabsTrigger>
            <TabsTrigger value="emails">E-Mails</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="settings">Einstellungen</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4 md:space-y-6">
          <Analytics />
          <CustomerSegments />
        </TabsContent>

        <TabsContent value="customers" className="space-y-4 md:space-y-6">
          <Suspense fallback={<LoadingSpinner />}>
            <CustomerInput />
            <CustomerTable />
          </Suspense>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4 md:space-y-6">
          <Suspense fallback={<LoadingSpinner />}>
            <OrderManagement />
          </Suspense>
        </TabsContent>

        <TabsContent value="products" className="space-y-4 md:space-y-6">
          <Suspense fallback={<LoadingSpinner />}>
            <ProductManagement />
          </Suspense>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4 md:space-y-6">
          <Suspense fallback={<LoadingSpinner />}>
            <InventoryManagement />
          </Suspense>
        </TabsContent>

        <TabsContent value="pickup" className="space-y-4 md:space-y-6">
          <Suspense fallback={<LoadingSpinner />}>
            <PickupLocationManagement />
          </Suspense>
        </TabsContent>

        <TabsContent value="delivery" className="space-y-4 md:space-y-6">
          <Suspense fallback={<LoadingSpinner />}>
            <DeliveryScheduleManagement />
          </Suspense>
        </TabsContent>

        <TabsContent value="supplier" className="space-y-4 md:space-y-6">
          <Suspense fallback={<LoadingSpinner />}>
            <SupplierOrderCalculator />
          </Suspense>
        </TabsContent>

        <TabsContent value="emails" className="space-y-4 md:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>E-Mail Verwaltung</CardTitle>
              <CardDescription>Newsletter versenden und Email-Templates verwalten</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="newsletter" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="newsletter">Newsletter versenden</TabsTrigger>
                  <TabsTrigger value="preview">Email-Vorschau</TabsTrigger>
                </TabsList>

                <TabsContent value="newsletter" className="space-y-4">
                  <Suspense fallback={<LoadingSpinner />}>
                    <NewsletterSystem />
                  </Suspense>
                </TabsContent>

                <TabsContent value="preview" className="space-y-4">
                  <Suspense fallback={<LoadingSpinner />}>
                    <EmailPreviewSystem />
                  </Suspense>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4 md:space-y-6">
          <Suspense fallback={<LoadingSpinner />}>
            <ContentManagementSystem />
          </Suspense>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 md:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Sicherheitseinstellungen</CardTitle>
              <CardDescription className="text-sm">Konfigurieren Sie Ihre Sicherheitseinstellungen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="text-sm md:text-base">Automatische Abmeldung</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Automatisch abmelden nach Inaktivität</div>
                </div>
                <Switch
                  checked={state.autoLogoutEnabled}
                  onCheckedChange={(checked) => dispatch({ type: "SET_AUTO_LOGOUT", payload: checked })}
                />
              </div>
              {state.autoLogoutEnabled && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Abmeldung nach (Minuten)</label>
                  <select
                    value={state.logoutTimer}
                    onChange={(e) => dispatch({ type: "SET_LOGOUT_TIMER", payload: Number(e.target.value) })}
                    className="w-full p-2 border rounded text-sm md:text-base"
                  >
                    <option value={15}>15 Minuten</option>
                    <option value={30}>30 Minuten</option>
                    <option value={60}>60 Minuten</option>
                    <option value={120}>120 Minuten</option>
                  </select>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function AdminDashboard() {
  return (
    <AdminProvider>
      <AdminDashboardContent />
    </AdminProvider>
  )
}
