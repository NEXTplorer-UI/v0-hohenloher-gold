"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { ExternalLink, CheckCircle, Loader2, RefreshCw } from "lucide-react"

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
  hellocash_invoice_number: string
  hellocash_payment_url: string | null
  pickup_token: string
  expires_at: string | null
  items: OrderItem[]
  customer: {
    name: string
    email: string
  } | null
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

  useEffect(() => {
    if (!token) {
      setError("Kein Token vorhanden")
      setLoading(false)
      return
    }

    loadOrder()
    // Sync status on page load
    syncStatus()
  }, [token])

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

        // Reload order to show updated status
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
        body: JSON.stringify({ token }),
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
        description: "Bestellung wurde als bezahlt markiert",
      })

      // Reload order to show updated status
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
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Bestellabholung</h1>
          <p className="text-muted-foreground">Bestellung #{order.order_number}</p>
        </div>

        {/* Status Badge */}
        {isPaid && (
          <div className="flex items-center justify-center gap-2 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="font-medium text-green-700 dark:text-green-300">Bereits bezahlt</span>
          </div>
        )}

        {/* Customer Info */}
        {order.customer && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Kunde</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="font-medium">{order.customer.name}</p>
              <p className="text-sm text-muted-foreground">{order.customer.email}</p>
            </CardContent>
          </Card>
        )}

        {/* Order Items */}
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
                <p className="font-medium">{(item.total / 100).toFixed(2)} €</p>
              </div>
            ))}
            <div className="flex justify-between items-center pt-3 border-t font-semibold text-lg">
              <span>Summe</span>
              <span>{order.total_formatted}</span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          {/* Refresh button */}
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

          <Button onClick={handleCopyAndOpen} className="w-full bg-transparent" variant="outline" size="lg">
            <ExternalLink className="mr-2 h-5 w-5" />
            In helloCash öffnen
          </Button>

          {!isPaid && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full" size="lg" disabled={marking}>
                  {marking ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Wird markiert...
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
                    Dieser Schritt markiert die Bestellung als bezahlt. Bitte stellen Sie sicher, dass die Zahlung in
                    helloCash erfolgreich war.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={handleMarkPaid}>Ja, als bezahlt markieren</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Expiration Info */}
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
