"use client"

import type React from "react"

import { createContext, useContext, useReducer, useEffect, useMemo, useCallback, type ReactNode } from "react"

export interface InventoryItem {
  id: number
  name: string
  stock: number
  unit: string
  minStock: number
  price: number
  category: string
}

interface InventoryState {
  items: InventoryItem[]
  selectedCategory: string
  editingMinStock: number | null
  tempMinStock: string
  loading: boolean
  sortBy: "name" | "stock" | "price" | "minStock" | "category" | "value"
  sortOrder: "asc" | "desc"
}

type InventoryAction =
  | { type: "SET_ITEMS"; payload: InventoryItem[] }
  | { type: "UPDATE_STOCK"; payload: { id: number; newAmount: number } }
  | { type: "UPDATE_ITEM_STOCK"; payload: { itemId: number; newStock: number } } // Added for optimistic UI updates
  | { type: "UPDATE_MIN_STOCK"; payload: { id: number; minStock: number } }
  | { type: "SET_SELECTED_CATEGORY"; payload: string }
  | { type: "START_EDITING_MIN_STOCK"; payload: { id: number; currentMinStock: number } }
  | { type: "SET_TEMP_MIN_STOCK"; payload: string }
  | { type: "CANCEL_EDITING_MIN_STOCK" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "ADD_ITEM"; payload: InventoryItem }
  | { type: "REMOVE_ITEM"; payload: number }
  | { type: "SET_SORT_BY"; payload: "name" | "stock" | "price" | "minStock" | "category" | "value" }
  | { type: "SET_SORT_ORDER"; payload: "asc" | "desc" }

const InventoryContext = createContext<{
  state: InventoryState
  dispatch: React.Dispatch<InventoryAction>
  updateStock: (id: number, newAmount: number) => void
  startEditingMinStock: (id: number, currentMinStock: number) => void
  saveMinStock: (id: number) => void
  cancelEditingMinStock: () => void
  exportInventory: () => void
  refreshInventory: () => Promise<void>
  filteredInventory: InventoryItem[]
  categories: string[]
  lowStockItems: InventoryItem[]
  setSortBy: (sortBy: "name" | "stock" | "price" | "minStock" | "category" | "value") => void
  setSortOrder: (sortOrder: "asc" | "desc") => void
} | null>(null)

function inventoryReducer(state: InventoryState, action: InventoryAction): InventoryState {
  switch (action.type) {
    case "SET_ITEMS":
      return { ...state, items: action.payload }
    case "UPDATE_STOCK":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id ? { ...item, stock: action.payload.newAmount } : item,
        ),
      }
    case "UPDATE_ITEM_STOCK":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.itemId ? { ...item, stock: action.payload.newStock } : item,
        ),
      }
    case "UPDATE_MIN_STOCK":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id ? { ...item, minStock: action.payload.minStock } : item,
        ),
      }
    case "SET_SELECTED_CATEGORY":
      return { ...state, selectedCategory: action.payload }
    case "START_EDITING_MIN_STOCK":
      return {
        ...state,
        editingMinStock: action.payload.id,
        tempMinStock: action.payload.currentMinStock.toString(),
      }
    case "SET_TEMP_MIN_STOCK":
      return { ...state, tempMinStock: action.payload }
    case "CANCEL_EDITING_MIN_STOCK":
      return { ...state, editingMinStock: null, tempMinStock: "" }
    case "SET_LOADING":
      return { ...state, loading: action.payload }
    case "ADD_ITEM":
      return { ...state, items: [...state.items, action.payload] }
    case "REMOVE_ITEM":
      return { ...state, items: state.items.filter((item) => item.id !== action.payload) }
    case "SET_SORT_BY":
      return { ...state, sortBy: action.payload }
    case "SET_SORT_ORDER":
      return { ...state, sortOrder: action.payload }
    default:
      return state
  }
}

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(inventoryReducer, {
    items: [],
    selectedCategory: "Alle",
    editingMinStock: null,
    tempMinStock: "",
    loading: false,
    sortBy: "name",
    sortOrder: "asc",
  })

  const refreshInventory = useCallback(async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })
      console.log("[v0] Loading inventory from database...")

      console.log("[v0] Fetching products from /api/admin/products")
      const productsResponse = await fetch("/api/admin/products", { cache: "no-store" })
      console.log("[v0] Products response status:", productsResponse.status)

      console.log("[v0] Fetching stock from /api/admin/inventory/current-stock")
      const stockResponse = await fetch("/api/admin/inventory/current-stock", { cache: "no-store" })
      console.log("[v0] Stock response status:", stockResponse.status)

      if (!productsResponse.ok) {
        const errorText = await productsResponse.text()
        console.error("[v0] Products API error:", errorText)
        throw new Error(`Failed to fetch products: ${productsResponse.status}`)
      }

      if (!stockResponse.ok) {
        const errorText = await stockResponse.text()
        console.error("[v0] Stock API error:", errorText)
        throw new Error(`Failed to fetch stock: ${stockResponse.status}`)
      }

      console.log("[v0] Parsing products response...")
      const products = await productsResponse.json()
      console.log("[v0] Parsed products:", products?.length || 0)

      console.log("[v0] Parsing stock response...")
      const stockResult = await stockResponse.json()
      console.log("[v0] Parsed stock result:", stockResult?.data?.length || 0)

      if (!stockResult.success) {
        console.error("[v0] Stock result error:", stockResult.error)
        throw new Error(stockResult.error || "Failed to load stock data")
      }

      const mergedInventory: InventoryItem[] = products.map((product: any) => {
        const stockItem = stockResult.data.find((item: any) => item.id === product.id)
        return {
          id: product.id,
          name: product.name,
          stock: stockItem ? stockItem.stock : 0,
          unit: product.unit,
          minStock: product.min_stock,
          price: product.price,
          category: product.category,
        }
      })

      dispatch({ type: "SET_ITEMS", payload: mergedInventory })
      console.log(`[v0] Loaded inventory with ${mergedInventory.length} products`)
    } catch (error) {
      console.error("[v0] Error loading inventory:", error)
      console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
      // Keep existing data on error
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }, [])

  useEffect(() => {
    refreshInventory()
  }, [refreshInventory])

  const updateStock = useCallback((id: number, newAmount: number) => {
    dispatch({ type: "UPDATE_STOCK", payload: { id, newAmount: Number.parseInt(newAmount.toString()) || 0 } })
  }, [])

  const startEditingMinStock = useCallback((id: number, currentMinStock: number) => {
    dispatch({ type: "START_EDITING_MIN_STOCK", payload: { id, currentMinStock } })
  }, [])

  const saveMinStock = useCallback(
    (id: number) => {
      const minStock = Number.parseInt(state.tempMinStock) || 0
      dispatch({ type: "UPDATE_MIN_STOCK", payload: { id, minStock } })
      dispatch({ type: "CANCEL_EDITING_MIN_STOCK" })
    },
    [state.tempMinStock],
  )

  const cancelEditingMinStock = useCallback(() => {
    dispatch({ type: "CANCEL_EDITING_MIN_STOCK" })
  }, [])

  const exportInventory = useCallback(() => {
    const timestamp = new Date().toISOString().split("T")[0]
    const BOM = "\uFEFF"

    const headers = [
      "Artikel-ID",
      "Artikelname",
      "Kategorie",
      "Aktueller Bestand",
      "Einheit",
      "Mindestbestand",
      "Preis pro Einheit",
      "Status",
      "Wert Gesamt",
    ]

    const csvRows = state.items.map((item) => {
      const totalValue = (item.stock * item.price).toFixed(2).replace(".", ",")
      const price = item.price.toFixed(2).replace(".", ",")
      const status = item.stock <= item.minStock ? "Niedrig" : "Normal"

      return [
        item.id.toString(),
        `"${item.name.replace(/"/g, '""')}"`,
        `"${item.category.replace(/"/g, '""')}"`,
        item.stock.toString(),
        `"${item.unit.replace(/"/g, '""')}"`,
        item.minStock.toString(),
        `"${price} €"`,
        status,
        `"${totalValue} €"`,
      ].join(";")
    })

    const totalItems = state.items.length
    const totalValue = state.items.reduce((sum, item) => sum + item.stock * item.price, 0)
    const lowStockCount = state.items.filter((item) => item.stock <= item.minStock).length

    const summaryRows = [
      "",
      "ZUSAMMENFASSUNG;;;;;;;;;",
      "",
      `Gesamtanzahl Artikel;${totalItems};;;;;;;;`,
      `Gesamtwert Lager;"${totalValue.toFixed(2).replace(".", ",")} €";;;;;;;;`,
      `Artikel mit niedrigem Bestand;${lowStockCount};;;;;;;;`,
    ]

    const csv = BOM + headers.join(";") + "\n" + csvRows.join("\n") + "\n" + summaryRows.join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `lagerbestand-${timestamp}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [state.items])

  const filteredInventory = useMemo(() => {
    const filtered =
      state.selectedCategory === "Alle"
        ? state.items
        : state.items.filter((item) => item.category === state.selectedCategory)

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0

      switch (state.sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name, "de")
          break
        case "stock":
          comparison = a.stock - b.stock
          break
        case "price":
          comparison = a.price - b.price
          break
        case "minStock":
          comparison = a.minStock - b.minStock
          break
        case "category":
          comparison = a.category.localeCompare(b.category, "de")
          break
        case "value":
          const valueA = a.stock * a.price
          const valueB = b.stock * b.price
          comparison = valueA - valueB
          break
      }

      return state.sortOrder === "asc" ? comparison : -comparison
    })

    return sorted
  }, [state.items, state.selectedCategory, state.sortBy, state.sortOrder])

  const categories = useMemo(() => {
    return [...new Set(state.items.map((item) => item.category))]
  }, [state.items])

  const lowStockItems = useMemo(() => {
    return state.items.filter((item) => item.stock <= item.minStock)
  }, [state.items])

  const setSortBy = useCallback((sortBy: "name" | "stock" | "price" | "minStock" | "category" | "value") => {
    dispatch({ type: "SET_SORT_BY", payload: sortBy })
  }, [])

  const setSortOrder = useCallback((sortOrder: "asc" | "desc") => {
    dispatch({ type: "SET_SORT_ORDER", payload: sortOrder })
  }, [])

  const contextValue = useMemo(
    () => ({
      state,
      dispatch,
      updateStock,
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
    }),
    [
      state,
      updateStock,
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
    ],
  )

  return <InventoryContext.Provider value={contextValue}>{children}</InventoryContext.Provider>
}

export function useInventory() {
  const context = useContext(InventoryContext)
  if (!context) {
    throw new Error("useInventory must be used within an InventoryProvider")
  }
  return context
}
