/**
 * Parse volume in liters from a unit string
 * @param unit - The unit string (e.g., "1l", "500ml", "1 liter")
 * @returns Volume in liters or 0 if not parseable
 */
function parseVolumeFromUnit(unit: string): number {
  const lowerUnit = unit.toLowerCase().trim()

  // Match liter patterns: "1l", "1 l", "1 liter", "1.5l"
  const literMatch = lowerUnit.match(/(\d+(?:[.,]\d+)?)\s*l(?:iter)?(?:\s|$)/)
  if (literMatch) {
    return Number.parseFloat(literMatch[1].replace(",", "."))
  }

  // Match milliliter patterns: "500ml", "500 ml", "750ml"
  const mlMatch = lowerUnit.match(/(\d+(?:[.,]\d+)?)\s*ml/)
  if (mlMatch) {
    return Number.parseFloat(mlMatch[1].replace(",", ".")) / 1000
  }

  return 0
}

/**
 * Calculate the base price per kilogram or liter for a product
 * Automatically detects whether to use kg or liter based on the unit
 * @param price - The product price
 * @param weightKg - The product weight in kilograms (optional for liter products)
 * @param unit - The product unit string (e.g., "500g", "1l", "500ml")
 * @returns Formatted base price string (e.g., "€9.00/kg" or "€8.50/l") or null if calculation not possible
 */
export function calculateBasePrice(
  price: number | string,
  weightKg: number | null | undefined,
  unit?: string,
): string | null {
  const priceNum = typeof price === "string" ? Number.parseFloat(price) : price

  if (isNaN(priceNum) || priceNum <= 0) {
    return null
  }

  if (unit) {
    const volume = parseVolumeFromUnit(unit)
    if (volume > 0) {
      const pricePerLiter = priceNum / volume
      return `€${pricePerLiter.toFixed(2)}/l`
    }
  }

  if (!weightKg || weightKg <= 0) {
    return null
  }

  const pricePerKg = priceNum / weightKg
  return `€${pricePerKg.toFixed(2)}/kg`
}
