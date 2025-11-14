"use client"

import { useState, useEffect, useCallback } from "react"

interface PersistedStateOptions {
  key: string
  defaultValue: any
  expirationHours?: number
}

interface StoredValue<T> {
  value: T
  timestamp: number
}

export function usePersistedState<T>({ key, defaultValue, expirationHours = 12 }: PersistedStateOptions) {
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue

    try {
      const item = localStorage.getItem(key)
      if (!item) return defaultValue

      const stored: StoredValue<T> = JSON.parse(item)
      const now = Date.now()
      const expirationMs = expirationHours * 60 * 60 * 1000

      if (now - stored.timestamp > expirationMs) {
        localStorage.removeItem(key)
        return defaultValue
      }

      return stored.value
    } catch (error) {
      console.error(`[usePersistedState] Error loading ${key}:`, error)
      return defaultValue
    }
  })

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const stored: StoredValue<T> = {
        value: state,
        timestamp: Date.now(),
      }
      localStorage.setItem(key, JSON.stringify(stored))
    } catch (error) {
      console.error(`[usePersistedState] Error saving ${key}:`, error)
    }
  }, [key, state])

  const clearPersistedState = useCallback(() => {
    if (typeof window === "undefined") return
    localStorage.removeItem(key)
    setState(defaultValue)
  }, [key, defaultValue])

  return [state, setState, clearPersistedState] as const
}

export default usePersistedState
