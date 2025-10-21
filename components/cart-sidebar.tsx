"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ShoppingCart, Plus, Minus, Trash2 } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { usePricing } from "@/components/pricing-context"
import Link from "next/link"
import { useState, useEffect } from "react"

export function CartSidebar() {
  const { state, dispatch } = useCart()
  const { pricingMode, setPricingMode, calculatePrice } = usePricing()
  const [isOpen, setIsOpen] = useState(false)

  const handleDeliveryMethodChange = (method: "pickup" | "shipping") => {
    console.log("[v0] CartSidebar - handleDeliveryMethodChange called:", {
      method,
      currentMethod: pricingMode,
    })
    setPricingMode(method)
    console.log("[v0] CartSidebar - setPricingMode called, waiting for state update...")
  }

  const updateQuantity = (id: number, quantity: number) => {
    dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity } })
  }

  const removeItem = (id: number) => {
    dispatch({ type: "REMOVE_ITEM", payload: id })
  }

  const subtotal = state.items.reduce((sum, item) => {
    if (item.isFreeBonus) return sum
    const itemPrice = calculatePrice(item.price)
    return sum + itemPrice * item.quantity
  }, 0)

  const shippingCost = pricingMode === "shipping" ? 4.9 : 0
  const total = subtotal + shippingCost

  useEffect(() => {
    console.log("[v0] CartSidebar - pricingMode changed:", pricingMode)
  }, [pricingMode])

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative bg-transparent">
          <ShoppingCart className="w-4 h-4" />
          {state.itemCount > 0 && (
            <Badge className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center text-xs">
              {state.itemCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5" />
            <span>Warenkorb ({state.itemCount})</span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {!state.items || state.items.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Ihr Warenkorb ist leer</p>
              <Link href="/shop">
                <Button className="mt-4" onClick={() => setIsOpen(false)}>
                  Jetzt einkaufen
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {(state.items || []).map((item) => {
                  const itemPrice = calculatePrice(item.price)

                  return (
                    <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <img
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1 space-y-1">
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">{item.origin}</p>
                        <p className="font-semibold text-primary">
                          €{itemPrice.toFixed(2).replace(".", ",")} / {item.unit}
                          {item.isFreeBonus && <span className="text-xs ml-1">(Gratis)</span>}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 p-0 hover:bg-primary hover:text-primary-foreground"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 p-0 hover:bg-primary hover:text-primary-foreground"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="w-8 h-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
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

              <div className="border-t pt-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Lieferart:</label>
                  <div className="flex gap-2">
                    <Button
                      variant={pricingMode === "pickup" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        console.log("[v0] CartSidebar - Abholung button clicked")
                        handleDeliveryMethodChange("pickup")
                      }}
                      className="flex-1"
                    >
                      Abholung (-10%)
                    </Button>
                    <Button
                      variant={pricingMode === "shipping" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        console.log("[v0] CartSidebar - Versand button clicked")
                        handleDeliveryMethodChange("shipping")
                      }}
                      className="flex-1"
                    >
                      Versand
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Zwischensumme:</span>
                    <span>€{subtotal.toFixed(2).replace(".", ",")}</span>
                  </div>
                  {pricingMode === "shipping" && (
                    <div className="flex justify-between">
                      <span>Versandkosten:</span>
                      <span>€{shippingCost.toFixed(2).replace(".", ",")}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-lg font-semibold border-t pt-2">
                    <span>Gesamt:</span>
                    <span className="text-primary">€{total.toFixed(2).replace(".", ",")}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Link href="/checkout" className="w-full">
                    <Button className="w-full" onClick={() => setIsOpen(false)}>
                      Zur Kasse
                    </Button>
                  </Link>
                  <Link href="/shop" className="w-full">
                    <Button variant="outline" className="w-full bg-transparent" onClick={() => setIsOpen(false)}>
                      Weiter einkaufen
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
