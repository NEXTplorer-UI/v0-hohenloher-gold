"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { ExternalLink, CheckCircle, Loader2, RefreshCw, QrCode } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface OrderItem {
  id: string
  name: string
  size: string | null
  quantity: number
  unit_price: number
  total: number
}

interface OrderData {
  order_id: string
  order_number: string
  total: number
  total_formatted: string
  status: string
  hellocash_status: string
  hellocash_invoice_number: string | null
  hellocash_payment_url: string | null
  pickup_token: string
  expires_at: string | null
  pickup_date: string | null
  pickup_location: string | null
  delivery_method: string | null
  items: OrderItem[]
  customer: {
    name: string
    email: string
    phone: string | null
    street: string | null
    house_number: string | null
    postal_code: string | null
    city: string | null
  } | null
  qr_code_url: string | null
}

export default function PickupPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [order, setOrder] = useState<OrderData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<string>("cash")

  useEffect(() => {
    if (!token) {
      setError("Kein Token vorhanden")
      setLoading(false)
      return
    }

    checkAdminStatus()
    loadOrder()
    syncStatus()
  }, [token])

  async function checkAdminStatus() {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      console.log("[v0] Checking admin status for user:", user?.id || "No user")

      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

        console.log("[v0] Profile found:", profile)
        console.log("[v0] Is admin:", profile?.role === "admin")

        setIsAdmin(profile?.role === "admin")
      } else {
        console.log("[v0] No user logged in - setting isAdmin to false")
        setIsAdmin(false)
      }
    } catch (err) {
      console.error("[pickup] Admin check error:", err)
      setIsAdmin(false)
    }
  }

  async function loadOrder() {
    try {
      setLoading(true)
      const res = await fetch("/api/pos/hellocash/pickup-init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || "Fehler beim Laden der Bestellung")
        toast({
          title: "Fehler",
          description: data.message || "Bestellung konnte nicht geladen werden",
          variant: "destructive",
        })
        return
      }

      setOrder(data)
    } catch (err: any) {
      console.error("[pickup] Load error:", err)
      setError("Verbindungsfehler")
      toast({
        title: "Fehler",
        description: "Verbindung zum Server fehlgeschlagen",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function syncStatus() {
    if (!token) return

    try {
      setSyncing(true)
      const res = await fetch("/api/pos/hellocash/sync-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })

      if (res.ok) {
        const result = await res.json()
        console.log("[pickup] Status synced:", result)

        await loadOrder()

        if (result.newStatus !== result.previousStatus) {
          toast({
            title: "Status aktualisiert",
            description: `Zahlungsstatus wurde von helloCash synchronisiert`,
          })
        }
      }
    } catch (err) {
      console.error("[pickup] Sync error:", err)
    } finally {
      setSyncing(false)
    }
  }

  async function handleCopyAndOpen() {
    if (!order) return

    try {
      await navigator.clipboard.writeText(order.hellocash_invoice_number)
      window.open("https://myhellocash.com", "_blank")
      toast({
        title: "Kopiert",
        description: "Bestell-/Rechnungsnummer wurde kopiert",
      })
    } catch (err) {
      toast({
        title: "Fehler",
        description: "Kopieren fehlgeschlagen",
        variant: "destructive",
      })
    }
  }

  async function handleMarkPaid() {
    if (!order) return

    try {
      setMarking(true)
      const res = await fetch("/api/pos/hellocash/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          paymentMethod,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({
          title: "Fehler",
          description: data.message || "Fehler beim Markieren als bezahlt",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Erfolgreich",
        description: "Bestellung wurde als bezahlt markiert und Rechnung per E-Mail versendet",
      })

      await loadOrder()
    } catch (err: any) {
      console.error("[pickup] Mark paid error:", err)
      toast({
        title: "Fehler",
        description: "Verbindung zum Server fehlgeschlagen",
        variant: "destructive",
      })
    } finally {
      setMarking(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Lade Bestellung...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Fehler</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error || "Bestellung nicht gefunden"}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isPaid = order.status === "paid" || order.hellocash_status === "paid"

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Bestellabholung</h1>
          <p className="text-muted-foreground">Bestellung #{order.order_number}</p>
        </div>

        {isPaid && (
          <div className="flex items-center justify-center gap-2 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="font-medium text-green-700 dark:text-green-300">Bereits bezahlt</span>
          </div>
        )}

        {order.qr_code_url && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                QR-Code zum Vorzeigen
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <img
                src={order.qr_code_url || "/placeholder.svg"}
                alt="Bestell QR-Code"
                className="w-64 h-64 rounded-lg border-2 border-border"
              />
            </CardContent>
          </Card>
        )}

        {order.customer && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Kunde</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="font-medium">{order.customer.name}</p>
              <p className="text-sm text-muted-foreground">{order.customer.email}</p>
              {order.customer.phone && <p className="text-sm text-muted-foreground">Tel: {order.customer.phone}</p>}
              {order.delivery_method === "delivery" && order.customer.street && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-sm font-medium text-muted-foreground">Lieferadresse:</p>
                  <p className="text-sm">
                    {order.customer.street} {order.customer.house_number}
                  </p>
                  <p className="text-sm">
                    {order.customer.postal_code} {order.customer.city}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {(order.pickup_date || order.pickup_location) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {order.delivery_method === "pickup" ? "Abholinformationen" : "Lieferinformationen"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {order.pickup_date && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {order.delivery_method === "pickup" ? "Abholdatum:" : "Lieferdatum:"}
                  </p>
                  <p className="font-medium">
                    {new Date(order.pickup_date).toLocaleDateString("de-DE", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              )}
              {order.pickup_location && order.delivery_method === "pickup" && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Abholort:</p>
                  <p className="font-medium">{order.pickup_location}</p>
                </div>
              )}
              {order.delivery_method && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Art:</p>
                  <p className="font-medium">{order.delivery_method === "pickup" ? "Abholung" : "Lieferung"}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Bestellte Artikel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  {item.size && <p className="text-sm text-muted-foreground">{item.size}</p>}
                  <p className="text-sm text-muted-foreground">Menge: {item.quantity}</p>
                </div>
                <p className="font-medium">{item.total.toFixed(2)} €</p>
              </div>
            ))}
            <div className="flex justify-between items-center pt-3 border-t font-semibold text-lg">
              <span>Summe</span>
              <span>{order.total_formatted}</span>
            </div>
          </CardContent>
        </Card>

        {isAdmin && !isPaid && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-lg text-primary">Personal-Bereich</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Zahlungsmethode</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Zahlungsmethode wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Bar</SelectItem>
                    <SelectItem value="card">Karte</SelectItem>
                    <SelectItem value="ec">EC-Karte</SelectItem>
                    <SelectItem value="sumup">SumUp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full" size="lg" disabled={marking}>
                    {marking ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Wird verarbeitet...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-5 w-5" />
                        Zahlung abgeschlossen
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Zahlung bestätigen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Die Bestellung wird als bezahlt markiert (Zahlungsmethode:{" "}
                      {paymentMethod === "cash"
                        ? "Bar"
                        : paymentMethod === "card"
                          ? "Karte"
                          : paymentMethod === "ec"
                            ? "EC-Karte"
                            : "SumUp"}
                      ). Der Kunde erhält automatisch eine Rechnungskopie per E-Mail.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction onClick={handleMarkPaid}>Ja, als bezahlt markieren</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          <Button onClick={syncStatus} variant="outline" className="w-full bg-transparent" size="lg" disabled={syncing}>
            {syncing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Status wird aktualisiert...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-5 w-5" />
                Status aktualisieren
              </>
            )}
          </Button>

          {isAdmin && (
            <Button onClick={handleCopyAndOpen} className="w-full bg-transparent" variant="outline" size="lg">
              <ExternalLink className="mr-2 h-5 w-5" />
              In helloCash öffnen
            </Button>
          )}
        </div>

        {order.expires_at && (
          <p className="text-center text-sm text-muted-foreground">
            QR-Code gültig bis:{" "}
            {new Date(order.expires_at).toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>
        )}
      </div>
    </div>
  )
}
