"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ShoppingCart, ArrowRight, Plus, Minus, Trash2 } from "lucide-react"
import Link from "next/link"
import { useCart } from "@/contexts/cart-context"
import { usePricing } from "@/components/pricing-context"
import { useState, useRef } from "react"
import { useIsMobile } from "@/hooks/use-mobile"

export function CartHeaderIndicator() {
  const { state, dispatch } = useCart()
  const { pricingMode, calculatePrice } = usePricing()
  const [isHovered, setIsHovered] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMobile = useIsMobile()

  const itemCount = state.itemCount || 0
  const hasItems = itemCount > 0

  const subtotal = hasItems
    ? state.items.reduce((sum, item) => {
        const itemPrice = calculatePrice(item.price, item.category)
        return sum + itemPrice * item.quantity
      }, 0)
    : 0

  const shippingCost = pricingMode === "shipping" ? 4.9 : 0
  const total = subtotal + shippingCost

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
    if (hasItems) {
      setIsHovered(true)
    }
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false)
    }, 150)
  }

  const handleCheckoutClick = () => {
    setIsHovered(false)
  }

  if (isMobile) {
    return (
      <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <Link href="/checkout">
          <Button variant="ghost" size="sm" className="relative p-2" aria-label={`Warenkorb (${itemCount} Artikel)`}>
            <ShoppingCart className="text-gold w-8 h-8" strokeWidth={1.5} />
            <Badge
              variant="default"
              className="absolute -top-0.5 -right-0.5 h-5 min-w-[1.25rem] px-1.5 flex items-center justify-center bg-gold text-gold-foreground font-semibold text-xs border-2 border-background"
            >
              {itemCount}
            </Badge>
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <Link href="/checkout">
        <div
          className="relative p-1.5 hover:bg-gold/10 transition-colors rounded-md cursor-pointer inline-flex items-center justify-center"
          aria-label={`Warenkorb (${itemCount} Artikel)`}
        >
          <ShoppingCart className="text-gold w-8 h-8" strokeWidth={1.5} />
          <Badge
            variant="default"
            className="absolute -top-0.5 -right-0.5 h-5 min-w-[1.25rem] px-1.5 flex items-center justify-center bg-gold text-gold-foreground font-semibold text-xs border-2 border-background"
          >
            {itemCount}
          </Badge>
        </div>
      </Link>

      {/* Hover Dropdown - only show if cart has items */}
      {isHovered && hasItems && (
        <Card
          className="absolute right-0 top-full mt-2 w-96 z-50 shadow-lg border"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Warenkorb ({itemCount} Artikel)</h3>
                <span className="text-sm font-medium">{total.toFixed(2).replace(".", ",")} €</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(state.items || []).map((item) => {
                  const itemPrice = calculatePrice(item.price, item.category)
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
                <Link href="/checkout" className="flex-1" onClick={handleCheckoutClick}>
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
