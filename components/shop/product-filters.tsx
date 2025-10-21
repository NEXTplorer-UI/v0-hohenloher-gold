"use client"

import { memo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

const ProductFilters = memo(() => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Kategorien</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {["Südfrüchte", "Trockenfrüchte", "Nüsse", "Spezialitäten"].map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox id={category} />
              <Label htmlFor={category}>{category}</Label>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preis</CardTitle>
        </CardHeader>
        <CardContent>
          <Slider defaultValue={[0, 50]} max={100} step={1} className="w-full" />
          <div className="flex justify-between text-sm text-muted-foreground mt-2">
            <span>€0</span>
            <span>€50+</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

ProductFilters.displayName = "ProductFilters"

export default ProductFilters
