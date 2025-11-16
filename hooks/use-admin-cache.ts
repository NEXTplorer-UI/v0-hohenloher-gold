'use client'

import useSWR, { mutate } from 'swr'
import { useCallback } from 'react'

/**
 * Zentraler Caching-Hook für Admin-Daten
 * 
 * Features:
 * - Lazy Loading: Daten werden nur geladen wenn Key gesetzt ist
 * - Auto-Cache: Daten bleiben cached zwischen Tab-Wechseln
 * - Manual Refresh: Explizite Kontrolle über Aktualisierungen
 * - Optimistic Updates: Cache sofort updaten, dann API
 */

interface UseAdminCacheOptions<T> {
  // Optional: Initiale Daten (z.B. von Server-Side Props)
  fallbackData?: T
  // Optional: Auto-Revalidate nach X Sekunden (default: nie)
  refreshInterval?: number
  // Optional: Custom Error Handler
  onError?: (error: Error) => void
}

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  
  if (!res.ok) {
    const error = new Error('API request failed')
    throw error
  }
  
  return res.json()
}

export function useAdminCache<T>(
  key: string | null,
  options?: UseAdminCacheOptions<T>
) {
  const { data, error, isLoading, isValidating, mutate: mutateSWR } = useSWR<T>(
    key, // Wenn null: nicht laden (Lazy Loading)
    fetcher,
    {
      // Cache-Konfiguration
      revalidateOnFocus: false,     // Nicht bei Tab-Wechsel
      revalidateOnReconnect: false, // Nicht bei Reconnect
      revalidateIfStale: false,     // Nicht wenn "stale"
      dedupingInterval: 60000,      // 1 Minute Dedup
      refreshInterval: options?.refreshInterval,
      fallbackData: options?.fallbackData,
      ...(typeof options?.onError === 'function' && { onError: options.onError }),
      // Persistence über Session
      keepPreviousData: true,
    }
  )

  // Manueller Refresh
  const refresh = useCallback(async () => {
    if (!key) return
    await mutateSWR()
  }, [key, mutateSWR])

  // Optimistic Update (Cache sofort updaten, dann API)
  const updateCache = useCallback(
    async (
      updater: T | Promise<T> | ((current?: T) => T | Promise<T>),
      shouldRevalidate = true
    ) => {
      if (!key) return
      await mutateSWR(updater, { revalidate: shouldRevalidate })
    },
    [key, mutateSWR]
  )

  // Cache invalidieren (löschen)
  const invalidate = useCallback(async () => {
    if (!key) return
    await mutate(key, undefined, { revalidate: false })
  }, [key])

  return {
    data,
    error,
    isLoading,
    isValidating,
    refresh,
    updateCache,
    invalidate,
  }
}

/**
 * Hook für mehrere Keys gleichzeitig (z.B. für Tabs mit mehreren API-Calls)
 */
export function useAdminMultiCache<T extends Record<string, any>>(
  keys: Record<keyof T, string | null>,
  options?: UseAdminCacheOptions<any>
) {
  const results = Object.entries(keys).reduce((acc, [name, key]) => {
    const result = useAdminCache(key, options)
    acc[name as keyof T] = result
    return acc
  }, {} as Record<keyof T, ReturnType<typeof useAdminCache>>)

  const refreshAll = useCallback(async () => {
    await Promise.all(
      Object.values(results).map((result) => result.refresh())
    )
  }, [results])

  const isLoadingAny = Object.values(results).some((r) => r.isLoading)
  const hasErrorAny = Object.values(results).some((r) => r.error)

  return {
    results,
    refreshAll,
    isLoadingAny,
    hasErrorAny,
  }
}

/**
 * Helper: Globale Cache-Invalidierung (z.B. nach Logout)
 */
export function clearAdminCache() {
  mutate(() => true, undefined, { revalidate: false })
}
