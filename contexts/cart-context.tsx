"use client"

import type React from "react"
import { createContext, useContext, useReducer, useEffect, useMemo, useCallback, useState } from "react"
import { toast } from "sonner"

export interface CartItem {
  id: number
  name: string
  price: string
  unit: string
  image: string
  quantity: number
  origin: string
  category: string
  weight_kg?: number
}

interface CartState {
  items: CartItem[]
  total: number
  itemCount: number
  deliveryMethod: "pickup" | "delivery"
}

type CartAction =
  | { type: "ADD_ITEM"; payload: Omit<CartItem, "quantity"> }
  | { type: "REMOVE_ITEM"; payload: number }
  | { type: "UPDATE_QUANTITY"; payload: { id: number; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "LOAD_CART"; payload: CartItem[] }
  | { type: "SET_DELIVERY_METHOD"; payload: "pickup" | "delivery" }

const CartContext = createContext<{
  state: CartState
  dispatch: React.Dispatch<CartAction>
  addToCart: (product: Omit<CartItem, "quantity">, quantity?: number) => Promise<boolean>
  removeItem: (id: number) => void
  updateQuantity: (id: number, quantity: number) => Promise<void>
  clearCart: () => void
  forceResetCart: () => void
  isEmpty: boolean
  hasItems: boolean
  totalItems: number
  totalPrice: number
  calculateTotalWeight: () => number
  checkWeightLimit: (
    newItem?: Omit<CartItem, "quantity">,
    newQuantity?: number,
  ) => { isOverLimit: boolean; totalWeight: number }
  setDeliveryMethod: (method: "pickup" | "delivery") => void
  isCheckingStock: boolean
} | null>(null)

const parsePrice = (priceValue: any): number => {
  if (priceValue == null || priceValue === "") {
    return 0
  }

  const priceStr = String(priceValue).trim()
  if (!priceStr) {
    return 0
  }

  try {
    const cleanPrice = priceStr.replace(",", ".")
    const parsed = Number.parseFloat(cleanPrice)
    return isNaN(parsed) ? 0 : parsed
  } catch (error) {
    console.error("Error parsing price:", priceValue, error)
    return 0
  }
}

const calculateTotalsWithDiscount = (state: CartState): CartState => {
  const items = state.items || []

  const total = items.reduce((sum, item) => {
    const price = parsePrice(item.price)
    return sum + price * item.quantity
  }, 0)

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return {
    ...state,
    items,
    total: Math.round(total * 100) / 100,
    itemCount,
  }
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existingItem = state.items.find((item) => item.id === action.payload.id)

      if (existingItem) {
        const updatedItems = state.items.map((item) =>
          item.id === action.payload.id ? { ...item, quantity: item.quantity + 1 } : item,
        )
        return calculateTotalsWithDiscount({ ...state, items: updatedItems })
      } else {
        const newItems = [...state.items, { ...action.payload, quantity: 1 }]
        return calculateTotalsWithDiscount({ ...state, items: newItems })
      }
    }

    case "REMOVE_ITEM": {
      const newItems = state.items.filter((item) => item.id !== action.payload)
      return calculateTotalsWithDiscount({ ...state, items: newItems })
    }

    case "UPDATE_QUANTITY": {
      if (action.payload.quantity <= 0) {
        const newItems = state.items.filter((item) => item.id !== action.payload.id)
        return calculateTotalsWithDiscount({ ...state, items: newItems })
      }

      const updatedItems = state.items.map((item) =>
        item.id === action.payload.id ? { ...item, quantity: action.payload.quantity } : item,
      )
      return calculateTotalsWithDiscount({ ...state, items: updatedItems })
    }

    case "CLEAR_CART": {
      return { items: [], total: 0, itemCount: 0, deliveryMethod: "pickup" }
    }

    case "LOAD_CART": {
      return calculateTotalsWithDiscount({ ...state, items: action.payload })
    }

    case "SET_DELIVERY_METHOD": {
      return { ...state, deliveryMethod: action.payload }
    }

    default:
      return state
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    total: 0,
    itemCount: 0,
    deliveryMethod: "pickup",
  })

  const [wasOverWeightLimit, setWasOverWeightLimit] = useState(false)
  const [weightWarningShown, setWeightWarningShown] = useState(false)
  const [isCheckingStock, setIsCheckingStock] = useState(false)

  const loadCartFromStorage = () => {
    const savedCart = localStorage.getItem("hohenloher-gold-cart")
    if (savedCart) {
      try {
        const cartItems = JSON.parse(savedCart)
        dispatch({ type: "LOAD_CART", payload: cartItems })
      } catch (error) {
        console.error("Error loading cart from localStorage:", error)
      }
    }
  }

  useEffect(() => {
    loadCartFromStorage()
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem("hohenloher-gold-cart", JSON.stringify(state.items))
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [state.items])

  const calculateTotalWeight = useCallback(() => {
    return state.items.reduce((total, item) => {
      const itemWeight = item.weight_kg || 1.0
      return total + itemWeight * item.quantity
    }, 0)
  }, [state.items])

  const checkWeightLimit = useCallback(
    (newItemWeight = 0, newQuantity = 1) => {
      let totalWeight = calculateTotalWeight()

      totalWeight += newItemWeight * newQuantity

      return {
        isOverLimit: totalWeight > 10,
        totalWeight,
      }
    },
    [calculateTotalWeight],
  )

  const checkStockAvailability = async (productId: number, quantity: number): Promise<boolean> => {
    console.log("[v0] checkStockAvailability called - productId:", productId, "quantity:", quantity)

    try {
      const allItems = [
        // All existing cart items
        ...state.items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
        // The new item being added with ONLY the new quantity (not totalQuantity)
        // If item already exists in cart, this represents the additional quantity
        { productId, quantity },
      ]

      console.log("[v0] Sending all cart items to API:", allItems)

      const response = await fetch("/api/inventory/check-availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: allItems,
        }),
      })

      console.log("[v0] API response status:", response.status)

      const data = await response.json()
      console.log("[v0] API response data:", data)

      return data.available
    } catch (error) {
      console.error("[v0] Error checking stock availability:", error)
      return true
    }
  }

  const addToCart = async (product: Omit<CartItem, "quantity">, quantity = 1): Promise<boolean> => {
    console.log("[v0] addToCart called - product:", product.name, "id:", product.id, "quantity:", quantity)
    console.log("[v0] Current cart items:", state.items)

    const currentWeight = calculateTotalWeight()
    const productWeight = typeof product.weight_kg === "number" ? product.weight_kg : 0
    const weightCheck = checkWeightLimit(productWeight, quantity)

    if (weightCheck.isOverLimit && !weightWarningShown && state.deliveryMethod === "delivery") {
      alert(
        `⚠️ Hinweis: Gewichtslimit überschritten\n\n` +
          `Das Hinzufügen von ${quantity}x ${product.name} erhöht das Gesamtgewicht auf ${weightCheck.totalWeight.toFixed(1)}kg.\n\n` +
          `Maximales Versandgewicht: 10kg\n` +
          `Aktuelles Gewicht im Warenkorb: ${currentWeight.toFixed(1)}kg\n\n` +
          `Für Bestellungen über 10kg ist nur Abholung möglich. Die Lieferart wird automatisch auf Abholung umgestellt.`,
      )
      setWeightWarningShown(true)
    }

    const isSeasonalProduct = product.category === "Südfrüchte"
    console.log("[v0] isSeasonalProduct:", isSeasonalProduct, "category:", product.category)

    if (!isSeasonalProduct) {
      const existingItem = state.items.find((item) => item.id === product.id)
      const totalQuantity = (existingItem?.quantity || 0) + quantity

      console.log(
        "[v0] Stock check - existingItem:",
        existingItem?.quantity || 0,
        "new quantity:",
        quantity,
        "total:",
        totalQuantity,
      )

      const isAvailable = await checkStockAvailability(product.id, quantity)

      console.log("[v0] checkStockAvailability result:", isAvailable)

      if (!isAvailable) {
        console.log("[v0] BLOCKED - Not enough stock available")
        alert(
          `❌ Nicht genügend Lagerbestand\n\n` +
            `Leider ist ${product.name} nicht in der gewünschten Menge verfügbar.\n\n` +
            `Bitte versuchen Sie es mit einer geringeren Menge oder kontaktieren Sie uns für weitere Informationen.`,
        )
        return false
      }
    }

    console.log("[v0] Adding to cart - dispatching", quantity, "times")
    for (let i = 0; i < quantity; i++) {
      dispatch({ type: "ADD_ITEM", payload: product })
    }

    return true
  }

  const removeItem = (id: number) => {
    dispatch({ type: "REMOVE_ITEM", payload: id })
  }

  const updateQuantity = async (id: number, quantity: number) => {
    console.log("[v0] updateQuantity called - id:", id, "new quantity:", quantity)

    // Find the current item
    const currentItem = state.items.find((item) => item.id === id)
    if (!currentItem) {
      console.log("[v0] updateQuantity - item not found")
      return
    }

    console.log("[v0] updateQuantity - current quantity:", currentItem.quantity, "requested quantity:", quantity)

    // If decreasing quantity, allow it immediately
    if (quantity <= currentItem.quantity) {
      console.log("[v0] updateQuantity - decreasing quantity, no validation needed")
      dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity } })
      return
    }

    // If increasing quantity, validate stock availability
    const quantityIncrease = quantity - currentItem.quantity
    console.log("[v0] updateQuantity - quantity increase:", quantityIncrease)

    // Build product object for validation
    const product = {
      id: currentItem.id,
      name: currentItem.name,
      category: currentItem.category,
    }

    // Check if seasonal product (skip validation for Südfrüchte)
    const isSeasonalProduct = product.category === "Südfrüchte"
    console.log("[v0] updateQuantity - isSeasonalProduct:", isSeasonalProduct)

    if (!isSeasonalProduct) {
      // Validate stock availability for the increase
      const isAvailable = await checkStockAvailability(product.id, quantityIncrease)

      if (!isAvailable) {
        console.log("[v0] updateQuantity BLOCKED - Not enough stock available")
        toast({
          title: "Nicht genügend Vorrat",
          description: `Es sind nicht genügend ${product.name} verfügbar.`,
          variant: "destructive",
        })
        return
      }

      console.log("[v0] updateQuantity - stock available, updating quantity")
    }

    // Update the quantity
    dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity } })
  }

  const clearCart = () => {
    dispatch({ type: "CLEAR_CART" })
  }

  // Force reset - löscht localStorage direkt und lädt Seite neu
  const forceResetCart = () => {
    try {
      localStorage.removeItem("hohenloher-gold-cart")
      dispatch({ type: "CLEAR_CART" })
      window.location.reload()
    } catch (error) {
      console.error("Error force resetting cart:", error)
      // Fallback: Trotzdem versuchen die Seite neu zu laden
      window.location.reload()
    }
  }

  useEffect(() => {
    const currentWeight = calculateTotalWeight()
    if (currentWeight <= 10 && weightWarningShown) {
      setWeightWarningShown(false)
    }
  }, [calculateTotalWeight, weightWarningShown])

  const setDeliveryMethod = (method: "pickup" | "delivery") => {
    dispatch({ type: "SET_DELIVERY_METHOD", payload: method })
  }

  const contextValue = useMemo(
    () => ({
      state,
      dispatch,
      addToCart,
      removeItem,
      updateQuantity,
      clearCart,
      forceResetCart,
      isEmpty: (state.items || []).length === 0,
      hasItems: (state.items || []).length > 0,
      totalItems: state.itemCount,
      totalPrice: state.total,
      calculateTotalWeight,
      checkWeightLimit,
      setDeliveryMethod,
      isCheckingStock,
    }),
    [state, calculateTotalWeight, checkWeightLimit, isCheckingStock],
  )

  return <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
