"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Minus } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { usePricing } from "@/components/pricing-context"
import { useState } from "react"

export const AddToCartButton = ({ product }: { product: any }) => {
  const { addToCart } = useCart()
  const [quantity, setQuantity] = useState(1)
  const { calculatePrice } = usePricing()

  const handleAddToCart = () => {
    console.log("[v0] Adding to cart:", {
      name: product.name,
      weight_kg: product.weight_kg,
      quantity: quantity,
      totalWeight: (product.weight_kg || 1.0) * quantity,
    })
    addToCart(product, quantity)
    setQuantity(1)
  }

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          disabled={quantity <= 1}
          className="h-10 w-10"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value) || 1))}
          className="h-10 w-16 text-center"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={() => setQuantity(quantity + 1)}
          disabled={product.limitPerPerson && quantity >= product.limitPerPerson}
          className="h-10 w-10"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <Button onClick={handleAddToCart} className="flex-1 h-10">
        <Plus className="h-4 w-4 mr-2" />
        {quantity > 1 ? `${quantity}x ` : ""}In den Warenkorb
      </Button>
    </div>
  )
}
