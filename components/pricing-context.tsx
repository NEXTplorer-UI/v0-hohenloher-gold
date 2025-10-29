"use client"

import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from "react"

type PricingMode = "pickup" | "shipping"

interface PricingContextType {
  pricingMode: PricingMode
  setPricingMode: (mode: PricingMode) => void
  calculatePrice: (basePrice: string | number, category?: string) => number
}

const PricingContext = createContext<PricingContextType | undefined>(undefined)

export function PricingProvider({ children }: { children: ReactNode }) {
  const [pricingMode, setPricingMode] = useState<PricingMode>("pickup")

  const calculatePrice = useCallback(
    (basePrice: string | number, category?: string) => {
      if (basePrice === null || basePrice === undefined) {
        return 0
      }

      let pickupPrice: number
      if (typeof basePrice === "string") {
        if (basePrice.trim() === "") {
          return 0
        }
        try {
          const cleanPrice = basePrice.includes(",") ? basePrice.replace(",", ".") : basePrice
          pickupPrice = Number.parseFloat(cleanPrice) || 0
        } catch (error) {
          return 0
        }
      } else {
        pickupPrice = basePrice
      }

      if (pricingMode === "pickup") {
        return pickupPrice
      } else {
        // Shipping mode - only Südfrüchte get 10% surcharge
        const isSouthernFruit = category === "Südfrüchte"

        if (isSouthernFruit) {
          // Only Südfrüchte get 10% shipping surcharge
          const shippingPrice = Math.round((pickupPrice / 0.9) * 100) / 100
          return shippingPrice
        } else {
          // Other products: same price as pickup
          return pickupPrice
        }
      }
    },
    [pricingMode],
  )

  const contextValue = useMemo(
    () => ({
      pricingMode,
      setPricingMode,
      calculatePrice,
    }),
    [pricingMode, calculatePrice],
  )

  return <PricingContext.Provider value={contextValue}>{children}</PricingContext.Provider>
}

export function usePricing() {
  const context = useContext(PricingContext)
  if (context === undefined) {
    throw new Error("usePricing must be used within a PricingProvider")
  }
  return context
}
