"use client"

import { useState, useEffect, useCallback } from "react"

export function useDebouncedState<T>(initialValue: T, delay = 300) {
  const [value, setValue] = useState<T>(initialValue)
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue(newValue)
  }, [])

  return [debouncedValue, updateValue, value] as const
}
