"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Printer } from "lucide-react"

interface Order {
  id: string
  order_number: string
  qr_code_url: string | null
  customer: {
    first_name: string
    last_name: string
  }
  pickup_location: string | null
  created_at: string
  total: number
}

export default function PrintQRCodesPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch("/api/admin/orders")
        if (!response.ok) throw new Error("Failed to fetch orders")

        const data = await response.json()

        const ordersWithQR = data
          .filter((order: Order) => order.qr_code_url)
          .sort((a: Order, b: Order) => {
            const nameA = `${a.customer.last_name} ${a.customer.first_name}`.toLowerCase()
            const nameB = `${b.customer.last_name} ${b.customer.first_name}`.toLowerCase()
            return nameA.localeCompare(nameB, "de")
          })

        setOrders(ordersWithQR)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Lade QR-Codes...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="no-print mb-6">
        <Card>
          <CardHeader>
            <CardTitle>QR-Codes drucken</CardTitle>
            <CardDescription>
              Druckbare Übersicht aller QR-Codes für Bestellungen ({orders.length} Codes)
              <br />
              Sortiert alphabetisch nach Kundenname (Nachname, Vorname)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handlePrint} className="w-full sm:w-auto">
              <Printer className="h-4 w-4 mr-2" />
              Als PDF drucken
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Tipp: Wählen Sie im Druckdialog "Als PDF speichern" um eine PDF-Datei zu erstellen
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="print:p-0">
        <h1 className="text-2xl font-bold mb-6 print:text-xl print:mb-4">QR-Codes für Bestellabholung</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4">
          {orders.map((order) => (
            <Card key={order.id} className="print:break-inside-avoid print:border print:border-gray-300">
              <CardContent className="p-6 print:p-4 flex flex-col items-center text-center">
                <div className="font-bold text-xl mb-2 print:text-lg">
                  {order.customer.last_name}, {order.customer.first_name}
                </div>

                <div className="text-sm text-muted-foreground mb-3 print:text-xs print:mb-2">
                  Bestellung: {order.order_number}
                </div>

                {order.qr_code_url && (
                  <img
                    src={order.qr_code_url || "/placeholder.svg"}
                    alt={`QR Code ${order.order_number}`}
                    className="w-48 h-48 mb-3 print:w-40 print:h-40 print:mb-2"
                  />
                )}

                <div className="text-sm font-medium mb-1 print:text-xs">Betrag: €{order.total.toFixed(2)}</div>

                {order.pickup_location && (
                  <div className="text-xs text-muted-foreground print:text-[10px]">
                    Abholort: {order.pickup_location}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          @page {
            size: A4;
            margin: 1.5cm;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          * {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  )
}
