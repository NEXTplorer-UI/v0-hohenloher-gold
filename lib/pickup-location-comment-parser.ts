import { createClient } from "@/lib/supabase/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export interface ParsedPickupLocation {
  found: boolean
  pickupLocationId?: string
  pickupLocationName?: string
  matchedText?: string
  confidence: "high" | "medium" | "low"
}

export async function parsePickupLocationFromComment(
  comment: string
): Promise<ParsedPickupLocation> {
  if (!comment || comment.trim().length === 0) {
    return { found: false, confidence: "low" }
  }

  const supabase = await createClient()

  const { data: pickupLocations } = await supabase
    .from("pickup_locations")
    .select("id, name")
    .eq("is_active", true)

  const { data: mappings } = await supabase
    .from("pickup_location_mappings")
    .select("variant, canonical_location_id, pickup_locations(id, name)")

  if (!pickupLocations || pickupLocations.length === 0) {
    return { found: false, confidence: "low" }
  }

  const commentLower = comment.toLowerCase()

  const pickupKeywords = [
    "abhol",
    "pickup",
    "hol",
    "treffpunkt",
    "standort",
    "ort",
  ]

  const hasPickupKeyword = pickupKeywords.some((keyword) =>
    commentLower.includes(keyword)
  )

  for (const location of pickupLocations) {
    const locationNameLower = location.name.toLowerCase()

    // Exact match (high confidence)
    if (commentLower.includes(locationNameLower)) {
      return {
        found: true,
        pickupLocationId: location.id,
        pickupLocationName: location.name,
        matchedText: location.name,
        confidence: hasPickupKeyword ? "high" : "medium",
      }
    }

    // Partial match (medium confidence) - check for individual words
    const locationWords = locationNameLower.split(" ")
    const allWordsFound = locationWords.every((word) =>
      word.length > 2 ? commentLower.includes(word) : true
    )

    if (allWordsFound && locationWords.length > 1) {
      return {
        found: true,
        pickupLocationId: location.id,
        pickupLocationName: location.name,
        matchedText: location.name,
        confidence: hasPickupKeyword ? "medium" : "low",
      }
    }
  }

  if (mappings && mappings.length > 0) {
    for (const mapping of mappings) {
      const variantLower = mapping.variant.toLowerCase()

      if (commentLower.includes(variantLower)) {
        const location = mapping.pickup_locations as any
        return {
          found: true,
          pickupLocationId: location?.id,
          pickupLocationName: location?.name,
          matchedText: mapping.variant,
          confidence: hasPickupKeyword ? "medium" : "low",
        }
      }
    }
  }

  return { found: false, confidence: "low" }
}

export async function suggestPickupLocationFromComment(
  comment: string
): Promise<ParsedPickupLocation> {
  return parsePickupLocationFromComment(comment)
}
