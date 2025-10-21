"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ShoppingCart, ArrowRight, Plus, Minus, Trash2 } from "lucide-react"
import Link from "next/link"
import { useCart } from "@/contexts/cart-context"
import { usePricing } from "@/components/pricing-context"
import { useState, useRef, useEffect } from "react"

export function CartHeaderIndicator() {
  const { state, dispatch } = useCart()
  const { pricingMode, calculatePrice } = usePricing()
  const [isHovered, setIsHovered] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    console.log("[v0] CartHeaderIndicator - pricingMode changed:", pricingMode)
    console.log("[v0] CartHeaderIndicator - items:", state.items?.length || 0)
  }, [pricingMode, state.items])

  // Don't show if cart is empty
  if (!state.items || state.itemCount === 0) {
    return null
  }

  const subtotal = state.items.reduce((sum, item) => {
    const itemPrice = calculatePrice(Number.parseFloat(item.price))
    return sum + itemPrice * item.quantity
  }, 0)

  const shippingCost = pricingMode === "shipping" ? 4.9 : 0
  const total = subtotal + shippingCost

  console.log("[v0] CartHeaderIndicator - totals:", {
    subtotal,
    shippingCost,
    total,
    pricingMode,
  })

  const updateQuantity = (id: number, quantity: number) => {
    dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity } })
  }

  const removeItem = (id: number) => {
    dispatch({ type: "REMOVE_ITEM", payload: id })
  }

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false)
    }, 150)
  }

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <Link href="/checkout">
        <Button variant="outline" size="sm" className="relative bg-transparent">
          <ShoppingCart className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Warenkorb</span>
          <Badge variant="secondary" className="ml-2 px-2 py-1 text-xs">
            {state.itemCount}
          </Badge>
        </Button>
      </Link>

      {/* Hover Dropdown */}
      {isHovered && (
        <Card
          className="absolute right-0 top-full mt-2 w-96 z-50 shadow-lg border"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Warenkorb ({state.itemCount} Artikel)</h3>
                <span className="text-sm font-medium">{total.toFixed(2).replace(".", ",")} €</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(state.items || []).slice(0, 3).map((item) => {
                  const itemPrice = calculatePrice(Number.parseFloat(item.price))
                  return (
                    <div
                      key={item.id}
                      className="flex items-center space-x-3 py-2 border-b border-gray-100 last:border-b-0"
                    >
                      <img
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {itemPrice.toFixed(2).replace(".", ",")} € / {item.unit}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault()
                            updateQuantity(item.id, item.quantity - 1)
                          }}
                          className="w-6 h-6 p-0 hover:bg-primary hover:text-primary-foreground"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault()
                            updateQuantity(item.id, item.quantity + 1)
                          }}
                          className="w-6 h-6 p-0 hover:bg-primary hover:text-primary-foreground"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault()
                            removeItem(item.id)
                          }}
                          className="w-6 h-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 ml-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })}

                {state.items && state.items.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    ... und {state.items.length - 3} weitere Artikel
                  </p>
                )}
              </div>

              <div className="space-y-1 pt-2 border-t text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Zwischensumme:</span>
                  <span>{subtotal.toFixed(2).replace(".", ",")} €</span>
                </div>
                {pricingMode === "shipping" && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Versandkosten:</span>
                    <span>{shippingCost.toFixed(2).replace(".", ",")} €</span>
                  </div>
                )}
                {pricingMode === "pickup" && (
                  <div className="flex justify-between text-green-600 text-xs">
                    <span>Abholrabatt (-10%):</span>
                    <span>Bereits angewendet</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold pt-1 border-t">
                  <span>Gesamt:</span>
                  <span>{total.toFixed(2).replace(".", ",")} €</span>
                </div>
              </div>

              <div className="flex space-x-2 pt-2 border-t">
                <Link href="/shop" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    Weiter einkaufen
                  </Button>
                </Link>
                <Link href="/checkout" className="flex-1">
                  <Button size="sm" className="w-full">
                    Zur Kasse
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
