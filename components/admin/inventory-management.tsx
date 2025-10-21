"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Download,
  Upload,
  Plus,
  AlertTriangle,
  Edit2,
  Save,
  X,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { InventoryProvider, useInventory } from "@/contexts/inventory-context"
import { useCallback, useState } from "react"

const STOCK_IN_REASONS = [
  "Wareneingang - Lieferung",
  "Wareneingang - Nachlieferung",
  "Rückgabe vom Kunden",
  "Inventur - Korrektur nach oben",
  "Produktionsrückgabe",
  "Umpackung - Zugang",
  "Sonstige Eingänge",
]

const STOCK_OUT_REASONS = [
  "Verkauf - Kundenbestellung",
  "Verkauf - Direktverkauf",
  "Verderb - Qualitätsmangel",
  "Verderb - Ablaufdatum",
  "Schwund - Transport",
  "Schwund - Lagerung",
  "Inventur - Korrektur nach unten",
  "Muster/Proben",
  "Umpackung - Abgang",
  "Sonstige Ausgänge",
]

function InventoryManagementContent() {
  const {
    state,
    dispatch,
    startEditingMinStock,
    saveMinStock,
    cancelEditingMinStock,
    exportInventory,
    refreshInventory,
    filteredInventory,
    categories,
    lowStockItems,
    setSortBy,
    setSortOrder,
  } = useInventory()

  const [isExportingHistory, setIsExportingHistory] = useState(false)
  const [stockOperation, setStockOperation] = useState<{
    itemId: number | null
    type: "in" | "out" | null
    amount: string
    reason: string
  }>({
    itemId: null,
    type: null,
    amount: "",
    reason: "",
  })

  const exportInventoryHistory = useCallback(async () => {
    try {
      setIsExportingHistory(true)
      console.log("[v0] Starting inventory history export...")

      const response = await fetch("/api/admin/inventory-history")
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `lagerhistorie-${new Date().toISOString().split("T")[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
        console.log("[v0] Inventory history export completed")
      } else {
        console.error("[v0] Export failed with status:", response.status)
      }
    } catch (error) {
      console.error("[v0] Error exporting inventory history:", error)
    } finally {
      setIsExportingHistory(false)
    }
  }, [])

  const handleStockOperation = useCallback(
    async (itemId: number, type: "in" | "out", amount: number, reason: string) => {
      try {
        console.log(`[v0] Creating ${type === "in" ? "Eingang" : "Ausgang"} movement for item ${itemId}`)

        const item = filteredInventory.find((i) => i.id === itemId)
        if (!item) {
          throw new Error("Item not found")
        }

        const response = await fetch("/api/admin/inventory/create-movement", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: itemId,
            qty: type === "in" ? amount : -amount, // Signed qty
            reason: reason,
            referenceId: `MANUAL-${Date.now()}`,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to create inventory movement")
        }

        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error || "Failed to create movement")
        }

        console.log(`[v0] Successfully created ${type} movement`)

        await refreshInventory()

        setStockOperation({
          itemId: null,
          type: null,
          amount: "",
          reason: "",
        })
      } catch (error) {
        console.error(`[v0] Error creating ${type} movement:`, error)
        alert(`Fehler beim ${type === "in" ? "Einbuchen" : "Ausbuchen"}: ${error.message}`)
      }
    },
    [filteredInventory, refreshInventory],
  )

  const startStockOperation = useCallback((itemId: number, type: "in" | "out") => {
    setStockOperation({
      itemId,
      type,
      amount: "",
      reason: "",
    })
  }, [])

  const cancelStockOperation = useCallback(() => {
    setStockOperation({
      itemId: null,
      type: null,
      amount: "",
      reason: "",
    })
  }, [])

  const toggleSort = useCallback(
    (sortBy: "name" | "stock" | "price" | "minStock" | "category" | "value") => {
      if (state.sortBy === sortBy) {
        // Toggle order if same column
        setSortOrder(state.sortOrder === "asc" ? "desc" : "asc")
      } else {
        // Set new column and default to ascending
        setSortBy(sortBy)
        setSortOrder("asc")
      }
    },
    [state.sortBy, state.sortOrder, setSortBy, setSortOrder],
  )

  const renderSortIcon = (column: string) => {
    if (state.sortBy !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />
    }
    return state.sortOrder === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lagerverwaltung</CardTitle>
          <CardDescription>
            Vollständige Bestandsübersicht mit {state.items.length} Artikeln
            {lowStockItems.length > 0 && (
              <span className="ml-2 text-red-600 font-medium">
                ({lowStockItems.length} Artikel mit niedrigem Bestand)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6 flex-wrap">
            <Button onClick={exportInventory} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={exportInventoryHistory} variant="outline" disabled={isExportingHistory}>
              {isExportingHistory ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isExportingHistory ? "Exportiere..." : "Lagerhistorie Export"}
            </Button>
            <Button onClick={refreshInventory} variant="outline" disabled={state.loading}>
              {state.loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {state.loading ? "Lädt..." : "Aktualisieren"}
            </Button>
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Artikel hinzufügen
            </Button>

            <select
              value={state.selectedCategory}
              onChange={(e) => dispatch({ type: "SET_SELECTED_CATEGORY", payload: e.target.value })}
              className="px-3 py-2 border rounded-md"
            >
              <option value="Alle">Alle Kategorien</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-muted-foreground">Sortieren:</span>
              <select
                value={state.sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="name">Name</option>
                <option value="stock">Bestand</option>
                <option value="price">Preis</option>
                <option value="minStock">Mindestbestand</option>
                <option value="category">Kategorie</option>
                <option value="value">Gesamtwert</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(state.sortOrder === "asc" ? "desc" : "asc")}
                className="h-10"
              >
                {state.sortOrder === "asc" ? (
                  <>
                    <ArrowUp className="h-4 w-4 mr-1" />
                    Aufsteigend
                  </>
                ) : (
                  <>
                    <ArrowDown className="h-4 w-4 mr-1" />
                    Absteigend
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="h-96 overflow-auto border rounded-lg">
            <div className="space-y-2 p-4">
              {filteredInventory.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                        {item.stock <= item.minStock && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Niedrig
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-4">
                        <span>
                          Mindestbestand:
                          {state.editingMinStock === item.id ? (
                            <span className="inline-flex items-center gap-1 ml-1">
                              <Input
                                type="number"
                                value={state.tempMinStock}
                                onChange={(e) => dispatch({ type: "SET_TEMP_MIN_STOCK", payload: e.target.value })}
                                className="w-16 h-6 text-xs"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => saveMinStock(item.id)}
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={cancelEditingMinStock}>
                                <X className="h-3 w-3" />
                              </Button>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 ml-1">
                              {item.minStock} x {item.unit}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-4 w-4 p-0"
                                onClick={() => startEditingMinStock(item.id, item.minStock)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </span>
                          )}
                        </span>
                        <span>
                          €{item.price.toFixed(2)}/{item.unit}
                        </span>
                        <span className="font-medium">Wert: €{(item.stock * item.price).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Lagerbestand</div>
                        <span className="text-lg font-bold">
                          {item.stock} x {item.unit}
                        </span>
                      </div>
                      {stockOperation.itemId === item.id ? (
                        <div className="flex items-center gap-2 p-2 border rounded-md bg-gray-50">
                          <div className="flex flex-col gap-2 min-w-48">
                            <div className="text-sm font-medium">
                              {stockOperation.type === "in" ? "Einbuchen" : "Ausbuchen"}
                            </div>
                            <Input
                              type="number"
                              placeholder="Menge"
                              value={stockOperation.amount}
                              onChange={(e) => setStockOperation((prev) => ({ ...prev, amount: e.target.value }))}
                              className="w-20 h-8"
                              autoFocus
                            />
                            <select
                              value={stockOperation.reason}
                              onChange={(e) => setStockOperation((prev) => ({ ...prev, reason: e.target.value }))}
                              className="h-8 px-2 border rounded-md text-sm"
                            >
                              <option value="">Grund auswählen...</option>
                              {(stockOperation.type === "in" ? STOCK_IN_REASONS : STOCK_OUT_REASONS).map((reason) => (
                                <option key={reason} value={reason}>
                                  {reason}
                                </option>
                              ))}
                            </select>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={() => {
                                  const amount = Number.parseInt(stockOperation.amount)
                                  if (amount > 0 && stockOperation.reason.trim()) {
                                    handleStockOperation(item.id, stockOperation.type!, amount, stockOperation.reason)
                                  } else {
                                    alert("Bitte Menge und Grund auswählen")
                                  }
                                }}
                                className="h-7 text-xs"
                              >
                                <Save className="h-3 w-3 mr-1" />
                                OK
                              </Button>
                              <Button size="sm" variant="ghost" onClick={cancelStockOperation} className="h-7 text-xs">
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startStockOperation(item.id, "in")}
                            className="h-8 text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Einbuchen
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startStockOperation(item.id, "out")}
                            className="h-8 text-xs"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Ausbuchen
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function InventoryManagement() {
  return (
    <InventoryProvider>
      <InventoryManagementContent />
    </InventoryProvider>
  )
}
