import { createServerClient } from "@/lib/supabase/server"

export interface PickupLocationMapping {
  id: string
  variant: string
  canonical_location_id: string
  canonical_location?: {
    id: string
    name: string
  }
}

/**
 * Normalizes a pickup location string to its canonical form
 * Returns the normalized name and ID, or null if no mapping found
 */
export async function normalizePickupLocation(inputLocation: string): Promise<{
  normalized: string | null
  locationId: string | null
} | null> {
  if (!inputLocation || inputLocation.trim() === "") {
    return null
  }

  const supabase = await createServerClient()

  // Case-insensitive lookup
  const trimmedInput = inputLocation.trim()

  // First, try exact match with canonical locations
  const { data: exactMatch } = await supabase
    .from("pickup_locations")
    .select("id, name")
    .ilike("name", trimmedInput)
    .eq("is_active", true)
    .single()

  if (exactMatch) {
    return {
      normalized: exactMatch.name,
      locationId: exactMatch.id,
    }
  }

  // Then, try mapping table (case-insensitive)
  const { data: mapping } = await supabase
    .from("pickup_location_mappings")
    .select(
      `
      id,
      variant,
      canonical_location_id,
      canonical_location:pickup_locations!canonical_location_id(id, name)
    `,
    )
    .ilike("variant", trimmedInput)
    .single()

  if (mapping && mapping.canonical_location) {
    return {
      normalized: (mapping.canonical_location as any).name,
      locationId: (mapping.canonical_location as any).id,
    }
  }

  // No mapping found
  return null
}

/**
 * Gets all unique pickup location variants from orders that are not yet mapped
 */
export async function getUnmappedPickupLocations() {
  const supabase = await createServerClient()

  // Get all unique pickup_location values from orders
  const { data: orders } = await supabase
    .from("orders")
    .select("pickup_location")
    .not("pickup_location", "is", null)
    .not("pickup_location", "eq", "")

  if (!orders) return []

  // Count occurrences
  const locationCounts = new Map<string, number>()
  orders.forEach((order) => {
    const location = order.pickup_location?.trim()
    if (location) {
      locationCounts.set(location, (locationCounts.get(location) || 0) + 1)
    }
  })

  // Get existing mappings
  const { data: existingMappings } = await supabase.from("pickup_location_mappings").select("variant")

  const mappedVariants = new Set(existingMappings?.map((m) => m.variant.toLowerCase()) || [])

  // Get canonical locations
  const { data: canonicalLocations } = await supabase.from("pickup_locations").select("name").eq("is_active", true)

  const canonicalNames = new Set(canonicalLocations?.map((l) => l.name.toLowerCase()) || [])

  // Filter out already mapped variants and canonical names
  const unmapped = Array.from(locationCounts.entries())
    .filter(([variant]) => {
      const lower = variant.toLowerCase()
      return !mappedVariants.has(lower) && !canonicalNames.has(lower)
    })
    .map(([variant, count]) => ({
      variant,
      count,
    }))
    .sort((a, b) => b.count - a.count) // Sort by count descending

  return unmapped
}

/**
 * Batch normalizes all orders with unmapped pickup locations
 */
export async function batchNormalizeOrders(mappingId: string) {
  const supabase = await createServerClient()

  // Get the mapping
  const { data: mapping } = await supabase
    .from("pickup_location_mappings")
    .select(
      `
      variant,
      canonical_location_id,
      canonical_location:pickup_locations!canonical_location_id(id, name)
    `,
    )
    .eq("id", mappingId)
    .single()

  if (!mapping || !mapping.canonical_location) {
    throw new Error("Mapping not found")
  }

  const canonicalLocation = mapping.canonical_location as any

  // Update all orders with this variant
  const { error } = await supabase
    .from("orders")
    .update({
      pickup_location_normalized: canonicalLocation.name,
      pickup_location_id: canonicalLocation.id,
    })
    .ilike("pickup_location", mapping.variant)
    .is("pickup_location_normalized", null)

  if (error) {
    throw error
  }
}
