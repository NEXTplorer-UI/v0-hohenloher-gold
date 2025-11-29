"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertTriangle, Plus, X, Save, Loader2, Package, Edit } from "lucide-react"
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

export function RawStockManagement({ cachedData, onDataChange }: RawStockManagementProps) {
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

  const [editingGroup, setEditingGroup] = useState<RawStock | null>(null)
  const [editingGroupName, setEditingGroupName] = useState("")
  const [editingGroupMinStock, setEditingGroupMinStock] = useState("")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [allProducts, setAllProducts] = useState<Array<{ id: number; name: string; inventory_raw_id: number | null }>>(
    [],
  )
  const [removingProductId, setRemovingProductId] = useState<number | null>(null)

  const fetchRawStocks = useCallback(async () => {
    if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
      console.log("[v0] Using cached raw stock data, skipping fetch")
      setRawStocks(cachedData)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch("/api/admin/inventory/raw-stock")
      if (!response.ok) throw new Error("Failed to fetch raw stocks")
      const data = await response.json()
      const stocks = Array.isArray(data) ? data : data.rawStocks || []
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
      setRawStocks([])
    } finally {
      setLoading(false)
    }
  }, [toast, cachedData, onDataChange])

  const fetchAllProducts = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/products")
      if (!response.ok) throw new Error("Failed to fetch products")
      const data = await response.json()
      setAllProducts(data.products || [])
    } catch (error) {
      console.error("[v0] Error fetching products:", error)
    }
  }, [])

  useEffect(() => {
    fetchAllProducts()
  }, [fetchAllProducts])

  useEffect(() => {
    if (cachedData && Array.isArray(cachedData)) {
      setRawStocks(cachedData)
      setLoading(false)
    }
  }, [cachedData])

  useEffect(() => {
    if (!cachedData || !Array.isArray(cachedData) || cachedData.length === 0) {
      fetchRawStocks()
    }
  }, [fetchRawStocks, cachedData])

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
      const amount = Number.parseFloat(amountStr)
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

        setRawStocks((prevStocks) =>
          prevStocks.map((stock) => (stock.id === rawStockId ? { ...stock, stock_grams: result.newStock } : stock)),
        )

        const refreshResponse = await fetch("/api/admin/inventory/raw-stock")
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          const updatedStocks = refreshData.rawStocks || []
          setRawStocks(updatedStocks)
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
    [toast],
  )

  const handleOpenEditDialog = useCallback((rawStock: RawStock) => {
    setEditingGroup(rawStock)
    setEditingGroupName(rawStock.product_group)
    setEditingGroupMinStock((rawStock.min_stock_grams / 1000).toString())
    setIsEditDialogOpen(true)
  }, [])

  const handleSaveGroupEdit = useCallback(async () => {
    if (!editingGroup || !editingGroupName.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Gruppennamen ein.",
        variant: "destructive",
      })
      return
    }

    const minStockKg = Number.parseFloat(editingGroupMinStock)
    if (isNaN(minStockKg) || minStockKg < 0) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen gültigen Mindestbestand ein.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/admin/inventory/raw-stock/${editingGroup.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_group: editingGroupName.trim(),
          min_stock_grams: minStockKg * 1000,
        }),
      })

      if (!response.ok) throw new Error("Failed to update group")

      toast({
        title: "Erfolgreich",
        description: "Rohware-Gruppe wurde aktualisiert.",
      })

      setIsEditDialogOpen(false)
      setEditingGroup(null)
      fetchRawStocks()
    } catch (error) {
      console.error("[v0] Error updating group:", error)
      toast({
        title: "Fehler",
        description: "Gruppe konnte nicht aktualisiert werden.",
        variant: "destructive",
      })
    }
  }, [editingGroup, editingGroupName, editingGroupMinStock, toast, fetchRawStocks])

  const handleRemoveProductFromGroup = useCallback(
    async (productId: number, productName: string, rawStockId: number) => {
      if (!confirm(`Möchten Sie "${productName}" wirklich aus dieser Gruppe entfernen?`)) {
        return
      }

      setRemovingProductId(productId)

      try {
        const response = await fetch("/api/admin/products/assign-raw-group", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            rawGroupId: null, // null removes the assignment
          }),
        })

        if (!response.ok) throw new Error("Failed to remove product")

        toast({
          title: "Erfolgreich",
          description: `"${productName}" wurde aus der Gruppe entfernt.`,
        })

        fetchRawStocks()
      } catch (error) {
        console.error("[v0] Error removing product from group:", error)
        toast({
          title: "Fehler",
          description: "Produkt konnte nicht entfernt werden.",
          variant: "destructive",
        })
      } finally {
        setRemovingProductId(null)
      }
    },
    [toast, fetchRawStocks],
  )

  const formatStock = (grams: number, unitType: "weight" | "volume") => {
    const kg = grams / 1000
    if (unitType === "weight") {
      return `${grams.toLocaleString()} g (${kg.toFixed(2)} kg)`
    } else {
      return `${grams.toLocaleString()} ml (${kg.toFixed(2)} L)`
    }
  }

  const lowStockItems = Array.isArray(rawStocks)
    ? rawStocks.filter((item) => item.stock_grams <= item.min_stock_grams)
    : []

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
            {Array.isArray(rawStocks) ? rawStocks.length : 0} Rohwaren-Gruppen
            {lowStockItems.length > 0 && (
              <span className="ml-2 text-red-600 font-medium">({lowStockItems.length} mit niedrigem Bestand)</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.isArray(rawStocks) &&
              rawStocks.map((item) => {
                const isPending = pendingItems.has(item.id)
                const isLowStock = item.stock_grams <= item.min_stock_grams

                const groupProducts = allProducts.filter((p) => p.inventory_raw_id === item.id)

                return (
                  <Card key={item.id} className={`p-4 ${isPending ? "opacity-60" : ""}`}>
                    <div className="flex items-start justify-between gap-4">
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

                          <div className="mt-2">
                            <span className="font-medium">{groupProducts.length} Produkte:</span>
                            {groupProducts.length > 0 ? (
                              <div className="mt-1 space-y-1">
                                {groupProducts.map((product) => (
                                  <div key={product.id} className="flex items-center gap-2 text-xs">
                                    <span>{product.name}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-5 w-5 p-0"
                                      onClick={() => handleRemoveProductFromGroup(product.id, product.name, item.id)}
                                      disabled={removingProductId === product.id}
                                    >
                                      {removingProductId === product.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <X className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs ml-1">Keine Produkte zugeordnet</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEditDialog(item)}
                          className="h-8"
                          disabled={isPending}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>

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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rohware-Gruppe bearbeiten</DialogTitle>
            <DialogDescription>Ändern Sie den Namen und Mindestbestand der Gruppe</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-group-name">Gruppenname *</Label>
              <Input
                id="edit-group-name"
                value={editingGroupName}
                onChange={(e) => setEditingGroupName(e.target.value)}
                placeholder="z.B. Orangen, Mandeln"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-min-stock">
                Mindestbestand ({editingGroup?.unit_type === "weight" ? "kg" : "L"}) *
              </Label>
              <Input
                id="edit-min-stock"
                type="number"
                step="0.001"
                value={editingGroupMinStock}
                onChange={(e) => setEditingGroupMinStock(e.target.value)}
                placeholder="z.B. 5"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveGroupEdit}>
              <Save className="h-4 w-4 mr-2" />
              Speichern
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
