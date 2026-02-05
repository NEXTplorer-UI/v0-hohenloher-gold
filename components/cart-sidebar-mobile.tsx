"use client"

import { memo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/contexts/cart-context"
import { ShoppingCart, Plus, Minus, Trash2, RefreshCw } from "lucide-react"
import Link from "next/link"

const CartSidebarMobile = memo(() => {
  const { state, updateQuantity, removeFromCart } = useCart()
  const [open, setOpen] = useState(false)
  const items = state.items || []
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="relative bg-transparent">
          <ShoppingCart className="text-gold w-6 h-6" strokeWidth={1.5} />
          {itemCount > 0 && (
            <Badge
              variant="default"
              className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 flex items-center justify-center bg-gold text-gold-foreground font-semibold text-xs"
            >
              {itemCount}
            </Badge>
          )}
          <span className="sr-only">Warenkorb ({itemCount} Artikel)</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-background max-w-lg p-0" showCloseButton={true}>
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Warenkorb ({itemCount} {itemCount === 1 ? "Artikel" : "Artikel"})
            </DialogTitle>
          </DialogHeader>

          <div className="mt-6 flex flex-col gap-4">
            <div className="max-h-[50vh] overflow-y-auto space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-background">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {item.price.toFixed(2)} € / {item.unit}
                    </p>
                    <p className="text-xs text-muted-foreground">Menge: {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                    >
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

              {items.length === 0 && <p className="text-center text-muted-foreground py-8">Ihr Warenkorb ist leer</p>}
            </div>

            {items.length > 0 && (
              <>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-lg">Gesamt:</span>
                    <span className="font-bold text-lg">{totalPrice.toFixed(2)} €</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 bg-transparent" size="lg" onClick={() => setOpen(false)}>
                    Weiter einkaufen
                  </Button>
                  <Link href="/checkout" className="flex-1">
                    <Button className="w-full bg-primary" size="lg">
                      Zur Kasse
                    </Button>
                  </Link>
                </div>

                <div className="border-t pt-3 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Möchten Sie den Warenkorb wirklich zurücksetzen? Alle Produkte werden entfernt.")) {
                        try {
                          localStorage.removeItem("hohenloher-gold-cart")
                          window.location.reload()
                        } catch (e) {
                          window.location.reload()
                        }
                      }
                    }}
                    className="w-full text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center gap-1.5 py-2"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Probleme? Warenkorb zurücksetzen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})

CartSidebarMobile.displayName = "CartSidebarMobile"

export { CartSidebarMobile }
