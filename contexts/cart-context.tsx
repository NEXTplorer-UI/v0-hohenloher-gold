"use client"

import type React from "react"
import { createContext, useContext, useReducer, useEffect, useMemo, useCallback, useState } from "react"

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
  updateQuantity: (id: number, quantity: number) => void
  clearCart: () => void
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
    try {
      setIsCheckingStock(true)

      const response = await fetch("/api/inventory/check-availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [{ productId, quantity }],
        }),
      })

      if (!response.ok) {
        console.error("Stock check failed:", response.statusText)
        return true
      }

      const result = await response.json()

      return result.available
    } catch (error) {
      console.error("Error checking stock:", error)
      return true
    } finally {
      setIsCheckingStock(false)
    }
  }

  const addToCart = async (product: Omit<CartItem, "quantity">, quantity = 1): Promise<boolean> => {
    const currentWeight = calculateTotalWeight()
    const productWeight = typeof product.weight_kg === "number" ? product.weight_kg : 0
    const weightCheck = checkWeightLimit(productWeight, quantity)

    if (weightCheck.isOverLimit && !weightWarningShown) {
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

    if (!isSeasonalProduct) {
      const existingItem = state.items.find((item) => item.id === product.id)
      const totalQuantity = (existingItem?.quantity || 0) + quantity

      const isAvailable = await checkStockAvailability(product.id, totalQuantity)

      if (!isAvailable) {
        alert(
          `❌ Nicht genügend Lagerbestand\n\n` +
            `Leider ist ${product.name} nicht in der gewünschten Menge verfügbar.\n\n` +
            `Bitte versuchen Sie es mit einer geringeren Menge oder kontaktieren Sie uns für weitere Informationen.`,
        )
        return false
      }
    }

    for (let i = 0; i < quantity; i++) {
      dispatch({ type: "ADD_ITEM", payload: product })
    }

    return true
  }

  const removeItem = (id: number) => {
    dispatch({ type: "REMOVE_ITEM", payload: id })
  }

  const updateQuantity = (id: number, quantity: number) => {
    dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity } })
  }

  const clearCart = () => {
    dispatch({ type: "CLEAR_CART" })
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
