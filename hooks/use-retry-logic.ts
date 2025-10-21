"use client"

import { useState, useCallback } from "react"

interface RetryOptions {
  maxAttempts?: number
  baseDelay?: number
  maxDelay?: number
  backoffFactor?: number
}

interface RetryState {
  attempts: number
  isRetrying: boolean
  lastError: Error | null
}

export function useRetryLogic(options: RetryOptions = {}) {
  const { maxAttempts = 3, baseDelay = 1000, maxDelay = 10000, backoffFactor = 2 } = options

  const [retryState, setRetryState] = useState<RetryState>({
    attempts: 0,
    isRetrying: false,
    lastError: null,
  })

  const calculateDelay = useCallback(
    (attempt: number) => {
      const delay = baseDelay * Math.pow(backoffFactor, attempt)
      return Math.min(delay, maxDelay)
    },
    [baseDelay, backoffFactor, maxDelay],
  )

  const executeWithRetry = useCallback(
    async (operation: () => Promise<any>): Promise<any> => {
      setRetryState((prev) => ({ ...prev, isRetrying: true }))

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const result = await operation()
          setRetryState({
            attempts: attempt + 1,
            isRetrying: false,
            lastError: null,
          })
          return result
        } catch (error) {
          const isLastAttempt = attempt === maxAttempts - 1

          setRetryState({
            attempts: attempt + 1,
            isRetrying: !isLastAttempt,
            lastError: error as Error,
          })

          if (isLastAttempt) {
            throw error
          }

          // Wait before retrying
          const delay = calculateDelay(attempt)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }

      throw new Error("Max retry attempts reached")
    },
    [maxAttempts, calculateDelay],
  )

  const reset = useCallback(() => {
    setRetryState({
      attempts: 0,
      isRetrying: false,
      lastError: null,
    })
  }, [])

  return {
    executeWithRetry,
    reset,
    ...retryState,
  }
}
