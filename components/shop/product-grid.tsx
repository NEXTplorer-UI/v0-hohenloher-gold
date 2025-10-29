"use client"

import { memo } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Star } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { usePricing } from "@/components/pricing-context"

const ProductCard = memo(({ product }: { product: any }) => {
  const { addToCart } = useCart()
  const { calculatePrice } = usePricing()

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden">
          <img
            src={product.image || "/placeholder.svg"}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <CardTitle className="text-lg">{product.name}</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{product.category}</Badge>
          {product.organic && <Badge variant="outline">Bio</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
        <div className="flex items-center gap-1 mb-2">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${i < product.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
            />
          ))}
          <span className="text-sm text-muted-foreground ml-1">({product.reviews})</span>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <div className="flex items-center justify-between w-full">
          <div className="text-lg font-bold">€{calculatePrice(product.basePrice, product.category)}</div>
          <Button onClick={() => addToCart(product)} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            In den Warenkorb
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
})

ProductCard.displayName = "ProductCard"

const ProductGrid = memo(() => {
  // Mock products data
  const products = [
    {
      id: 1,
      name: "Sizilianische Orangen",
      category: "Südfrüchte",
      basePrice: 4.5,
      unit: "kg",
      image: "/fresh-oranges.png",
      description: "Saftige Orangen direkt aus Sizilien",
      rating: 5,
      reviews: 23,
      organic: true,
    },
    // Add more products...
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
})

ProductGrid.displayName = "ProductGrid"

export default ProductGrid
