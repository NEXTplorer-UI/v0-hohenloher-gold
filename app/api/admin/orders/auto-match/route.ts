import { NextResponse } from "next"
import { createClient } from "@/lib/supabase/server"

// Simple string similarity using Levenshtein distance
function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2
  const shorter = s1.length > s2.length ? s2 : s1
  
  if (longer.length === 0) return 1.0
  
  const editDistance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase())
  return (longer.length - editDistance) / longer.length
}

function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = []
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j
      } else if (j > 0) {
        let newValue = costs[j - 1]
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
        }
        costs[j - 1] = lastValue
        lastValue = newValue
      }
    }
    if (i > 0) costs[s2.length] = lastValue
  }
  return costs[s2.length]
}

export async function POST() {
  try {
    const supabase = await createClient()

    // Get all orders that need normalization
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, pickup_location")
      .is("pickup_location_normalized", null)
      .not("pickup_location", "is", null)
      .neq("status", "cancelled")
      .or("mapping_ignored.is.null,mapping_ignored.is.false")

    if (ordersError) throw ordersError

    // Get all pickup locations
    const { data: locations, error: locationsError } = await supabase
      .from("pickup_locations")
      .select("id, name, address")
      .order("name")

    if (locationsError) throw locationsError

    // Match each unique pickup_location text to best location
    const uniqueLocations = [...new Set(orders?.map(o => o.pickup_location) || [])]
    
    const matches = uniqueLocations.map(pickupText => {
      if (!pickupText) return null

      let bestMatch = null
      let bestScore = 0

      locations?.forEach(loc => {
        const fullAddress = `${loc.name}, ${loc.address}`
        const nameScore = similarity(pickupText, loc.name)
        const addressScore = similarity(pickupText, fullAddress)
        const score = Math.max(nameScore, addressScore)

        if (score > bestScore) {
          bestScore = score
          bestMatch = {
            originalText: pickupText,
            matchedLocationId: loc.id,
            matchedLocationName: loc.name,
            matchedLocationAddress: loc.address,
            confidence: score,
            orderIds: orders?.filter(o => o.pickup_location === pickupText).map(o => o.id) || [],
          }
        }
      })

      return bestMatch
    }).filter(Boolean)

    // Sort by confidence (highest first)
    matches.sort((a, b) => (b?.confidence || 0) - (a?.confidence || 0))

    return NextResponse.json({ matches })
  } catch (error) {
    console.error("[auto-match] Error:", error)
    return NextResponse.json(
      { error: "Failed to auto-match orders" },
      { status: 500 }
    )
  }
}
