"use client"

import useSWR from "swr"
import { useEffect, useState } from "react"

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((res) => res.json())

export function useProducts(category?: string) {
  const params = category ? `?category=${encodeURIComponent(category)}` : ""
  const url = `/api/products${params}`

  const { data, error, isLoading, mutate, isValidating } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 10000, // 10 seconds deduplication
    keepPreviousData: true, // Keep UI stable during refresh
  })

  return {
    products: data?.products ?? [],
    isLoading,
    isValidating,
    isError: error,
    refresh: mutate,
  }
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}
