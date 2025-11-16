"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, Upload, Plus, AlertTriangle, Edit2, Save, X, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, Loader2, History } from 'lucide-react'
import { InventoryProvider, useInventory } from "@/contexts/inventory-context"
import { useCallback, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { useAdminCache } from "@/hooks/use-admin-cache"
import { useLazyTabs } from "@/hooks/use-lazy-tabs"
import {
  InventoryHistoryExportDialog,
  type InventoryHistoryExportOptions,
} from "@/components/admin/inventory-history-export-dialog"
import { ProductMovementHistoryModal } from "@/components/admin/product-movement-history-modal"
import { RawStockManagement } from "@/components/admin/raw-stock-management"

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
    filteredInventory,
    categories,
    lowStockItems,
    setSortBy,
    setSortOrder,
  } = useInventory()

  const { toast } = useToast()
  const [isExportingHistory, setIsExportingHistory] = useState(false)
  const [showHistoryExportDialog, setShowHistoryExportDialog] = useState(false)
  const [pendingItems, setPendingItems] = useState<Set<number>>(new Set())
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<{
    id: number
    name: string
  } | null>(null)
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

  const {
    data: productStockData,
    loading: productStockLoading,
    refresh: refreshProductStock,
  } = useAdminCache<any>("/api/admin/inventory", {
    revalidateOnFocus: false,
  })

  const {
    data: rawStockData,
    loading: rawStockLoading,
    refresh: refreshRawStock,
  } = useAdminCache<any>("/api/admin/inventory/raw-stock", {
    revalidateOnFocus: false,
  })

  const { activeTab, loadTab, isTabLoaded } = useLazyTabs(["products", "raw"], "products")

  const handleStockOperation = useCallback(
    async (itemId: number, type: "in" | "out", amount: number, reason: string) => {
      if (amount <= 0) {
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

      const item = filteredInventory.find((i) => i.id === itemId)
      if (!item) {
        toast({
          title: "Fehler",
          description: "Artikel nicht gefunden.",
          variant: "destructive",
        })
        return
      }

      setPendingItems((prev) => new Set(prev).add(itemId))

      const newStock = type === "in" ? item.stock + amount : item.stock - amount
      dispatch({
        type: "UPDATE_ITEM_STOCK",
        payload: { itemId, newStock },
      })

      try {
        console.log(`[v0] Creating ${type === "in" ? "Eingang" : "Ausgang"} movement for item ${itemId}`)

        const response = await fetch("/api/admin/inventory/create-movement", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: itemId,
            qty: type === "in" ? amount : -amount,
            reason: reason,
            referenceId: `MANUAL-${Date.now()}`,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to create inventory movement")
        }

        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error || "Failed to create movement")
        }

        console.log(`[v0] Successfully created ${type} movement, new stock:`, result.newStock)

        if (result.newStock !== undefined) {
          dispatch({
            type: "UPDATE_ITEM_STOCK",
            payload: { itemId, newStock: result.newStock },
          })
        }

        if (result.newStock < 0) {
          toast({
            title: "Vorbestellung aktiviert",
            description:
              "Der Artikel wird vorbestellt. Kunden werden über den Liefertermin informiert, sobald dieser bekannt ist.",
            variant: "default",
          })
        } else {
          toast({
            title: "Erfolgreich",
            description: `${type === "in" ? "Einbuchung" : "Ausbuchung"} erfolgreich durchgeführt.`,
          })
        }

        setStockOperation({
          itemId: null,
          type: null,
          amount: "",
          reason: "",
        })

        await refreshProductStock()
      } catch (error: any) {
        console.error(`[v0] Error creating ${type} movement:`, error)

        dispatch({
          type: "UPDATE_ITEM_STOCK",
          payload: { itemId, newStock: item.stock },
        })

        toast({
          title: "Fehler",
          description: `Fehler beim ${type === "in" ? "Einbuchen" : "Ausbuchen"}: ${error.message}`,
          variant: "destructive",
        })
      } finally {
        setPendingItems((prev) => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
      }
    },
    [filteredInventory, dispatch, refreshProductStock, toast],
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
        setSortOrder(state.sortOrder === "asc" ? "desc" : "asc")
      } else {
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
      <Tabs value={activeTab} onValueChange={(tab) => loadTab(tab as "products" | "raw")} className="w-full">
        {/* </CHANGE> */}
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="products">
            Produkt-Bestand (Stück)
            <Badge variant="outline" className="ml-2 text-xs">
              Alter Bestand
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="raw">
            Rohwaren-Bestand (Gramm)
            <Badge variant="default" className="ml-2 text-xs">
              Aktiv
            </Badge>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="products">
          {isTabLoaded("products") && (
            // </CHANGE> */}
            <Card>
              <CardHeader>
                <CardTitle>Lagerverwaltung (Alter Bestand)</CardTitle>
                <CardDescription>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span>
                      Nur zur Übertragung der Bestände. Neue Produkte nutzen das Rohwaren-System.
                    </span>
                  </div>
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
                  <Button onClick={() => setShowHistoryExportDialog(true)} variant="outline" disabled={isExportingHistory}>
                    {isExportingHistory ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {isExportingHistory ? "Exportiere..." : "Lagerhistorie Export"}
                  </Button>
                  <Button onClick={refreshProductStock} variant="outline" disabled={productStockLoading}>
                    {productStockLoading ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {productStockLoading ? "Lädt..." : "Aktualisieren"}
                  </Button>
                  {/* </CHANGE> */}
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
                    {filteredInventory.map((item) => {
                      const isPending = pendingItems.has(item.id)

                      return (
                        <Card key={item.id} className={`p-4 ${isPending ? "opacity-60" : ""}`}>
                          <div className="flex items-center justify-between">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setSelectedProductForHistory({ id: item.id, name: item.name })}
                                  className="font-medium hover:text-primary hover:underline transition-colors"
                                >
                                  {item.name}
                                </button>
                                <Badge variant="outline" className="text-xs">
                                  {item.category}
                                </Badge>
                                {item.stock <= item.minStock && (
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
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0"
                                        onClick={cancelEditingMinStock}
                                      >
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
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedProductForHistory({ id: item.id, name: item.name })}
                                className="h-8"
                                title="Buchungshistorie anzeigen"
                              >
                                <History className="h-4 w-4" />
                              </Button>
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
                                      disabled={isPending}
                                    />
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
                                          const amount = Number.parseInt(stockOperation.amount)
                                          handleStockOperation(item.id, stockOperation.type!, amount, stockOperation.reason)
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
                                    onClick={() => startStockOperation(item.id, "in")}
                                    className="h-8 text-xs"
                                    disabled={isPending}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Einbuchen
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => startStockOperation(item.id, "out")}
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
                </div>
              </CardContent>
            </Card>
          )}
          {/* </CHANGE> */}
        </TabsContent>

        <TabsContent value="raw">
          {isTabLoaded("raw") && (
            <RawStockManagement 
              cachedData={rawStockData}
              onDataChange={(data) => {
                // Update cache when data changes
                refreshRawStock()
              }}
            />
          )}
          {/* </CHANGE> */}
        </TabsContent>
      </Tabs>

      <InventoryHistoryExportDialog
        open={showHistoryExportDialog}
        onOpenChange={setShowHistoryExportDialog}
        onExport={exportInventoryHistory}
      />

      <ProductMovementHistoryModal
        open={!!selectedProductForHistory}
        onOpenChange={(open) => !open && setSelectedProductForHistory(null)}
        productId={selectedProductForHistory?.id || null}
        productName={selectedProductForHistory?.name || ""}
      />
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
