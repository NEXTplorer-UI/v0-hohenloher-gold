"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Plus, X, Save, Loader2, Package, History } from 'lucide-react'
import { useState, useEffect, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"

type RawStock = {
  id: number
  product_group: string
  stock_grams: number
  min_stock_grams: number
  unit_type: "weight" | "volume"
  product_count: number
  product_names: string[]
}

type StockOperation = {
  rawStockId: number | null
  type: "in" | "out" | null
  amount: string
  unit: "g" | "kg" | "ml" | "L"
  reason: string
}

interface RawStockManagementProps {
  cachedData?: RawStock[] | null
  onDataChange?: (data: RawStock[]) => void
}

const STOCK_IN_REASONS = [
  "Wareneingang - Lieferung",
  "Wareneingang - Nachlieferung",
  "Rückgabe vom Kunden",
  "Inventur - Korrektur nach oben",
  "Produktionsrückgabe",
  "Sonstige Eingänge",
]

const STOCK_OUT_REASONS = [
  "Verderb - Qualitätsmangel",
  "Verderb - Ablaufdatum",
  "Schwund - Transport",
  "Schwund - Lagerung",
  "Inventur - Korrektur nach unten",
  "Muster/Proben",
  "Sonstige Ausgänge",
]

export function RawStockManagement({ cachedData, onDataChange }: RawStockManagementProps = {}) {
  const [rawStocks, setRawStocks] = useState<RawStock[]>(cachedData || [])
  const [loading, setLoading] = useState(!cachedData)
  const [pendingItems, setPendingItems] = useState<Set<number>>(new Set())
  const { toast } = useToast()

  const [stockOperation, setStockOperation] = useState<StockOperation>({
    rawStockId: null,
    type: null,
    amount: "",
    unit: "kg",
    reason: "",
  })

  const fetchRawStocks = useCallback(async () => {
    if (cachedData && cachedData.length > 0) {
      console.log("[v0] Using cached raw stock data, skipping fetch")
      setRawStocks(cachedData)
      return
    }

    try {
      setLoading(true)
      const response = await fetch("/api/admin/inventory/raw-stock")
      if (!response.ok) throw new Error("Failed to fetch raw stocks")
      const data = await response.json()
      const stocks = data.rawStocks || []
      setRawStocks(stocks)
      if (onDataChange) {
        onDataChange(stocks)
      }
    } catch (error) {
      console.error("[v0] Error fetching raw stocks:", error)
      toast({
        title: "Fehler",
        description: "Rohwaren konnten nicht geladen werden",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast, cachedData, onDataChange])

  useEffect(() => {
    if (cachedData) {
      setRawStocks(cachedData)
    }
  }, [cachedData])

  useEffect(() => {
    fetchRawStocks()
  }, [fetchRawStocks])

  const startStockOperation = useCallback((rawStockId: number, type: "in" | "out", unitType: "weight" | "volume") => {
    setStockOperation({
      rawStockId,
      type,
      amount: "",
      unit: unitType === "weight" ? "kg" : "L",
      reason: "",
    })
  }, [])

  const cancelStockOperation = useCallback(() => {
    setStockOperation({
      rawStockId: null,
      type: null,
      amount: "",
      unit: "kg",
      reason: "",
    })
  }, [])

  const handleStockOperation = useCallback(
    async (rawStockId: number, type: "in" | "out", amountStr: string, unit: string, reason: string) => {
      const amount = parseFloat(amountStr)
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Ungültige Menge",
          description: "Die Menge muss größer als 0 sein.",
          variant: "destructive",
        })
        return
      }

      if (!reason.trim()) {
        toast({
          title: "Grund erforderlich",
          description: "Bitte wählen Sie einen Grund für die Lagerbewegung.",
          variant: "destructive",
        })
        return
      }

      let grams = 0
      if (unit === "g") grams = amount
      else if (unit === "kg") grams = amount * 1000
      else if (unit === "ml") grams = amount
      else if (unit === "L") grams = amount * 1000

      setPendingItems((prev) => new Set(prev).add(rawStockId))

      try {
        const response = await fetch("/api/admin/inventory/raw-stock/movement", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inventoryRawId: rawStockId,
            qtyGrams: type === "in" ? grams : -grams,
            reason: reason,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to create movement")
        }

        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error || "Failed to create movement")
        }

        toast({
          title: "Erfolgreich",
          description: `${type === "in" ? "Einbuchung" : "Ausbuchung"} erfolgreich durchgeführt.`,
        })

        setStockOperation({
          rawStockId: null,
          type: null,
          amount: "",
          unit: "kg",
          reason: "",
        })

        setRawStocks(prevStocks => 
          prevStocks.map(stock => 
            stock.id === rawStockId 
              ? { ...stock, stock_grams: result.newStock } 
              : stock
          )
        )
        
        const refreshResponse = await fetch("/api/admin/inventory/raw-stock")
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          const updatedStocks = refreshData.rawStocks || []
          setRawStocks(updatedStocks)
          if (onDataChange) {
            onDataChange(updatedStocks)
          }
        }
      } catch (error: any) {
        console.error("[v0] Error creating raw stock movement:", error)
        toast({
          title: "Fehler",
          description: `Fehler beim ${type === "in" ? "Einbuchen" : "Ausbuchen"}: ${error.message}`,
          variant: "destructive",
        })
      } finally {
        setPendingItems((prev) => {
          const next = new Set(prev)
          next.delete(rawStockId)
          return next
        })
      }
    },
    [toast, onDataChange],
  )

  const formatStock = (grams: number, unitType: "weight" | "volume") => {
    const kg = grams / 1000
    if (unitType === "weight") {
      return `${grams.toLocaleString()} g (${kg.toFixed(2)} kg)`
    } else {
      return `${grams.toLocaleString()} ml (${kg.toFixed(2)} L)`
    }
  }

  const lowStockItems = rawStocks.filter((item) => item.stock_grams <= item.min_stock_grams)

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Rohwaren werden geladen...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rohwaren-Bestand (Gramm-basiert)</CardTitle>
          <CardDescription>
            {rawStocks.length} Rohwaren-Gruppen
            {lowStockItems.length > 0 && (
              <span className="ml-2 text-red-600 font-medium">
                ({lowStockItems.length} mit niedrigem Bestand)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rawStocks.map((item) => {
              const isPending = pendingItems.has(item.id)
              const isLowStock = item.stock_grams <= item.min_stock_grams

              return (
                <Card key={item.id} className={`p-4 ${isPending ? "opacity-60" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{item.product_group}</span>
                        {isLowStock && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Niedrig
                          </Badge>
                        )}
                        {isPending && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Wird aktualisiert...
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div>Bestand: {formatStock(item.stock_grams, item.unit_type)}</div>
                        <div>Mindest: {formatStock(item.min_stock_grams, item.unit_type)}</div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="font-medium">{item.product_count} Produkte:</span>
                          <span className="text-xs">{item.product_names.join(", ")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {stockOperation.rawStockId === item.id ? (
                        <div className="flex items-center gap-2 p-2 border rounded-md bg-gray-50">
                          <div className="flex flex-col gap-2 min-w-60">
                            <div className="text-sm font-medium">
                              {stockOperation.type === "in" ? "Einbuchen" : "Ausbuchen"}
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.001"
                                placeholder="Menge"
                                value={stockOperation.amount}
                                onChange={(e) => setStockOperation((prev) => ({ ...prev, amount: e.target.value }))}
                                className="w-24 h-8"
                                autoFocus
                                disabled={isPending}
                              />
                              <select
                                value={stockOperation.unit}
                                onChange={(e) =>
                                  setStockOperation((prev) => ({ ...prev, unit: e.target.value as any }))
                                }
                                className="h-8 px-2 border rounded-md text-sm"
                                disabled={isPending}
                              >
                                {item.unit_type === "weight" ? (
                                  <>
                                    <option value="g">g</option>
                                    <option value="kg">kg</option>
                                  </>
                                ) : (
                                  <>
                                    <option value="ml">ml</option>
                                    <option value="L">L</option>
                                  </>
                                )}
                              </select>
                            </div>
                            <select
                              value={stockOperation.reason}
                              onChange={(e) => setStockOperation((prev) => ({ ...prev, reason: e.target.value }))}
                              className="h-8 px-2 border rounded-md text-sm"
                              disabled={isPending}
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
                                  handleStockOperation(
                                    item.id,
                                    stockOperation.type!,
                                    stockOperation.amount,
                                    stockOperation.unit,
                                    stockOperation.reason,
                                  )
                                }}
                                className="h-7 text-xs"
                                disabled={isPending}
                              >
                                {isPending ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <Save className="h-3 w-3 mr-1" />
                                )}
                                OK
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={cancelStockOperation}
                                className="h-7 text-xs"
                                disabled={isPending}
                              >
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
                            onClick={() => startStockOperation(item.id, "in", item.unit_type)}
                            className="h-8 text-xs"
                            disabled={isPending}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Einbuchen
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startStockOperation(item.id, "out", item.unit_type)}
                            className="h-8 text-xs"
                            disabled={isPending}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Ausbuchen
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
