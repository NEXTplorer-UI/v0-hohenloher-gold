"use client"

import { memo } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { useCart } from "@/contexts/cart-context"
import { ShoppingCart, Plus, Minus, Trash2 } from "lucide-react"

const CartSidebar = memo(() => {
  const { items = [], isOpen, setIsOpen, updateQuantity, removeFromCart, getTotalPrice } = useCart()

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Warenkorb ({(items || []).length})
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {(items || []).map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium">{item.name}</h4>
                <p className="text-sm text-muted-foreground">€{item.price.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-8 text-center">{item.quantity}</span>
                <Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                  <Plus className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => removeFromCart(item.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}

          {(!items || items.length === 0) && (
            <p className="text-center text-muted-foreground py-8">Ihr Warenkorb ist leer</p>
          )}

          {items && items.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold">Gesamt: €{getTotalPrice().toFixed(2)}</span>
              </div>
              <Button className="w-full" size="lg">
                Zur Kasse
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
})

CartSidebar.displayName = "CartSidebar"

export default CartSidebar
