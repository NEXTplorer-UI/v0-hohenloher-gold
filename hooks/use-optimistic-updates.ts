"use client"

import { useCallback, useState } from "react"

interface OptimisticUpdate<T> {
  id: string
  data: T
  timestamp: number
}

export function useOptimisticUpdates<T>() {
  const [pendingUpdates, setPendingUpdates] = useState<OptimisticUpdate<T>[]>([])

  const addOptimisticUpdate = useCallback((id: string, data: T) => {
    const update: OptimisticUpdate<T> = {
      id,
      data,
      timestamp: Date.now(),
    }

    setPendingUpdates((prev) => [...prev.filter((u) => u.id !== id), update])

    // Auto-remove after 5 seconds if not manually removed
    setTimeout(() => {
      setPendingUpdates((prev) => prev.filter((u) => u.id !== id))
    }, 5000)
  }, [])

  const removeOptimisticUpdate = useCallback((id: string) => {
    setPendingUpdates((prev) => prev.filter((u) => u.id !== id))
  }, [])

  const clearAllUpdates = useCallback(() => {
    setPendingUpdates([])
  }, [])

  return {
    pendingUpdates,
    addOptimisticUpdate,
    removeOptimisticUpdate,
    clearAllUpdates,
  }
}
