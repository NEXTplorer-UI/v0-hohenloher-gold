/**
 * Geo utilities for pickup location ranking
 * Supports both real geo-coordinates (Haversine) and PLZ-based approximation
 */

export interface PickupLocation {
  id: string
  name: string
  address: string
  postal_code: string
  latitude?: number | null
  longitude?: number | null
  [key: string]: any
}

export interface RankedLocation extends PickupLocation {
  distanceKm?: number
  approxPlzDelta?: number
  score: number
  reason: "geo" | "plz"
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Normalize postal code (remove non-digits)
 */
export function normalizePlz(plz: string | number): string {
  return String(plz).replace(/\D/g, "")
}

/**
 * Convert PLZ to number for distance calculation
 */
export function plzToNumber(plz: string | number): number {
  const normalized = normalizePlz(plz)
  return Number.parseInt(normalized, 10)
}

/**
 * Calculate PLZ prefix match score
 * Higher score = better match (same first 2-3 digits)
 */
export function plzPrefixMatchScore(userPlz: string, locationPlz: string): number {
  const up = normalizePlz(userPlz)
  const lp = normalizePlz(locationPlz)

  if (up.slice(0, 3) === lp.slice(0, 3)) return 2 // 746xx = 746xx
  if (up.slice(0, 2) === lp.slice(0, 2)) return 1 // 74xxx = 74xxx
  return 0
}

/**
 * Calculate PLZ distance score (numeric difference)
 */
export function plzDistanceScore(userPlz: string, locationPlz: string): number {
  const up = plzToNumber(userPlz)
  const lp = plzToNumber(locationPlz)
  return Math.abs(up - lp)
}

/**
 * Rank pickup locations by distance or PLZ approximation
 */
export function rankLocations(
  locations: PickupLocation[],
  userPlz: string,
  options: {
    userLat?: number
    userLon?: number
    radiusKm?: number
    maxPlzDelta?: number
    take?: number
    useGeo?: boolean
  } = {},
): RankedLocation[] {
  const { userLat, userLon, radiusKm = 30, maxPlzDelta = 300, take = 5, useGeo = true } = options

  const hasUserGeo = typeof userLat === "number" && typeof userLon === "number"

  const ranked: RankedLocation[] = []

  for (const loc of locations) {
    const locHasGeo = typeof loc.latitude === "number" && typeof loc.longitude === "number"

    if (useGeo && hasUserGeo && locHasGeo) {
      // Use real geo distance
      const distanceKm = haversineKm(userLat, userLon, loc.latitude!, loc.longitude!)

      if (distanceKm <= radiusKm) {
        ranked.push({
          ...loc,
          distanceKm,
          score: distanceKm,
          reason: "geo",
        })
      }
    } else {
      // Fallback to PLZ approximation
      const delta = plzDistanceScore(userPlz, loc.postal_code)
      const prefixBonus = plzPrefixMatchScore(userPlz, loc.postal_code)

      if (delta <= maxPlzDelta) {
        ranked.push({
          ...loc,
          approxPlzDelta: delta,
          score: delta - prefixBonus * 50, // Bonus reduces score (better ranking)
          reason: "plz",
        })
      }
    }
  }

  // Sort by score (lower = better)
  ranked.sort((a, b) => a.score - b.score)

  return ranked.slice(0, take)
}
