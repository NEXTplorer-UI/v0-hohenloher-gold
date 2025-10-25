"use client"

import useSWR from "swr"
import { rankLocations, type PickupLocation, type RankedLocation } from "@/lib/geo"
import { useMemo } from "react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export interface UseNearbyPickupsOptions {
  userPlz?: string
  userLat?: number
  userLon?: number
  radiusKm?: number
  maxPlzDelta?: number
  take?: number
  useGeo?: boolean
}

export function useNearbyPickups(options: UseNearbyPickupsOptions = {}) {
  const { userPlz = "", userLat, userLon, radiusKm = 30, maxPlzDelta = 300, take = 5, useGeo = true } = options

  // Fetch all pickup locations with SWR caching
  const { data, error, isLoading, isValidating, mutate } = useSWR<PickupLocation[]>("/api/pickup-locations", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 10_000, // 10 seconds deduplication
    keepPreviousData: true,
  })

  // Rank locations based on user input
  const rankedLocations = useMemo<RankedLocation[]>(() => {
    if (!data || data.length === 0) return []
    if (!userPlz || userPlz.trim().length < 4) {
      return data
        .map((loc) => ({
          ...loc,
          score: 0,
          reason: "plz" as const,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    }

    const ranked = rankLocations(data, userPlz, {
      userLat,
      userLon,
      radiusKm,
      maxPlzDelta,
      take,
      useGeo,
    })

    if (ranked.length === 0) {
      return data
        .map((loc) => ({
          ...loc,
          score: 999,
          reason: "plz" as const,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    }

    return ranked
  }, [data, userPlz, userLat, userLon, radiusKm, maxPlzDelta, take, useGeo])

  return {
    locations: rankedLocations,
    allLocations: data || [],
    isLoading,
    isValidating,
    isError: !!error,
    error,
    refresh: mutate,
  }
}

/**
 * Debounce hook for search inputs
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useSWR(["debounce", value], () => value, {
    dedupingInterval: delay,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })

  return debouncedValue.data ?? value
}
