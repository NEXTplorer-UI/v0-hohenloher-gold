"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calculator, Download, Mail, AlertTriangle, TrendingUp, RefreshCw } from "lucide-react"

interface SupplierOrderItem {
  product: string
  category: string
  currentStock: number
  orderedQuantity: number
  neededQuantity: number
  minimumOrder: number
  recommendation: string
  priority: "high" | "medium" | "low"
  supplier: string
  unitPrice: number
  totalCost: number
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case "high":
      return "destructive"
    case "medium":
      return "default"
    case "low":
      return "secondary"
    default:
      return "outline"
  }
}

function getPriorityIcon(priority: string) {
  if (priority === "high") {
    return <AlertTriangle className="h-3 w-3" />
  }
  return null
}

export default function SupplierOrderCalculator() {
  const [supplierOrders, setSupplierOrders] = useState<SupplierOrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showOnlyToOrder, setShowOnlyToOrder] = useState(false)

  const loadSupplierData = async () => {
    try {
      setLoading(true)
      console.log("[v0] Loading supplier demand analysis...")

      const response = await fetch("/api/admin/supplier-demand-analysis", { cache: "no-store" })

      if (!response.ok) {
        const text = await response.text()
        console.error("[v0] API returned error:", response.status, text.slice(0, 200))
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setSupplierOrders(data.recommendations)
        console.log("[v0] Loaded supplier recommendations:", data.recommendations.length)
      } else {
        console.error("[v0] Failed to load supplier data:", data.error)
      }
    } catch (error) {
      console.error("[v0] Error loading supplier data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSupplierData()
  }, [])

  const totalOrderCost = supplierOrders.reduce((sum, item) => sum + item.totalCost, 0)
  const highPriorityItems = supplierOrders.filter((item) => item.priority === "high").length
  const itemsToOrder = supplierOrders.filter((item) => item.totalCost > 0).length

  const handleExportOrderList = () => {
    // Generate CSV export
    const csvContent = [
      ["Produkt", "Kategorie", "Lieferant", "Zu bestellen", "Einzelpreis", "Gesamtpreis"],
      ...supplierOrders
        .filter((item) => item.totalCost > 0)
        .map((item) => [
          item.product,
          item.category,
          item.supplier,
          item.recommendation,
          `€${item.unitPrice.toFixed(2)}`,
          `€${item.totalCost.toFixed(2)}`,
        ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Bestellliste_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleSendToSupplier = async () => {
    // Group orders by supplier
    const ordersBySupplier = supplierOrders
      .filter((item) => item.totalCost > 0)
      .reduce(
        (acc, item) => {
          if (!acc[item.supplier]) {
            acc[item.supplier] = []
          }
          acc[item.supplier].push(item)
          return acc
        },
        {} as Record<string, SupplierOrderItem[]>,
      )

    // Send emails to each supplier
    for (const [supplier, items] of Object.entries(ordersBySupplier)) {
      const emailContent = `
        <h2>Bestellung von Hohenloher Gold</h2>
        <p>Sehr geehrte Damen und Herren,</p>
        <p>hiermit möchten wir folgende Artikel bestellen:</p>
        <table border="1" style="border-collapse: collapse; width: 100%;">
          <tr>
            <th>Artikel</th>
            <th>Menge</th>
            <th>Einzelpreis</th>
            <th>Gesamtpreis</th>
          </tr>
          ${items
            .map(
              (item) => `
            <tr>
              <td>${item.product}</td>
              <td>${item.recommendation}</td>
              <td>€${item.unitPrice.toFixed(2)}</td>
              <td>€${item.totalCost.toFixed(2)}</td>
            </tr>
          `,
            )
            .join("")}
        </table>
        <p><strong>Gesamtsumme: €${items.reduce((sum, item) => sum + item.totalCost, 0).toFixed(2)}</strong></p>
        <p>Mit freundlichen Grüßen<br>Hohenloher Gold</p>
      `

      try {
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: `bestellung@${supplier.toLowerCase().replace(/\s+/g, "")}.de`,
            subject: `Bestellung von Hohenloher Gold - ${new Date().toLocaleDateString("de-DE")}`,
            html: emailContent,
          }),
        })
      } catch (error) {
        console.error("[v0] Failed to send supplier email:", error)
      }
    }

    alert("Bestellungen wurden an die Lieferanten gesendet!")
  }

  const displayedOrders = showOnlyToOrder ? supplierOrders.filter((item) => item.totalCost > 0) : supplierOrders

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zu bestellen</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{itemsToOrder}</div>
            <p className="text-xs text-muted-foreground">von {supplierOrders.length} Artikeln</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hohe Priorität</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{highPriorityItems}</div>
            <p className="text-xs text-muted-foreground">Dringend bestellen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bestellwert</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totalOrderCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Geschätzte Kosten</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Calculator Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Großhändler-Bestellrechner
          </CardTitle>
          <CardDescription>
            Automatische Berechnung der benötigten Bestellmengen basierend auf Kundenbestellungen und Lagerbeständen
          </CardDescription>
          <div className="flex justify-between items-center">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showOnlyToOrder}
                onChange={(e) => setShowOnlyToOrder(e.target.checked)}
                className="rounded"
              />
              Nur Artikel mit Bestellbedarf anzeigen
            </label>
            <Button variant="outline" size="sm" onClick={loadSupplierData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Lädt..." : "Aktualisieren"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Lade Bestellempfehlungen...</div>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {showOnlyToOrder ? "Keine Bestellungen erforderlich" : "Keine Produkte gefunden"}
                </div>
              ) : (
                displayedOrders.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{item.product}</p>
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          Lager: {item.currentStock} • Bestellt: {item.orderedQuantity} • Mindestbestand:{" "}
                          {item.minimumOrder}
                        </p>
                        <p>
                          Lieferant: {item.supplier} • Einzelpreis: €{item.unitPrice.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.totalCost > 0 && (
                        <div className="text-right">
                          <p className="font-medium">€{item.totalCost.toFixed(2)}</p>
                        </div>
                      )}
                      <Badge
                        variant={getPriorityColor(item.priority)}
                        className="flex items-center gap-1 min-w-[120px] justify-center"
                      >
                        {getPriorityIcon(item.priority)}
                        {item.recommendation}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="mt-6 flex gap-2">
            <Button className="flex-1" onClick={handleExportOrderList} disabled={loading || itemsToOrder === 0}>
              <Download className="h-4 w-4 mr-2" />
              Bestellliste exportieren
            </Button>
            <Button variant="outline" onClick={handleSendToSupplier} disabled={loading || itemsToOrder === 0}>
              <Mail className="h-4 w-4 mr-2" />
              An Großhändler senden
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
