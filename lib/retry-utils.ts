/**
 * Retry utility with exponential backoff
 * Retries a function multiple times with increasing delays between attempts
 */

export interface RetryOptions {
  maxAttempts?: number
  initialDelay?: number // milliseconds
  maxDelay?: number // milliseconds
  backoffMultiplier?: number
  onRetry?: (attempt: number, error: Error) => void
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  onRetry: () => {},
}

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param options Retry configuration
 * @returns Result of the function
 * @throws Last error if all attempts fail
 */
export async function retryWithBackoff<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: Error

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // If this was the last attempt, throw the error
      if (attempt === opts.maxAttempts) {
        throw lastError
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt - 1), opts.maxDelay)

      console.log(`[v0] Retry attempt ${attempt}/${opts.maxAttempts} after ${delay}ms. Error:`, lastError.message)

      // Call onRetry callback
      opts.onRetry(attempt, lastError)

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

/**
 * Retry a function with a simple retry count (no backoff)
 * Useful for quick retries without delays
 */
export async function retrySimple<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  return retryWithBackoff(fn, {
    maxAttempts,
    initialDelay: 0,
    maxDelay: 0,
  })
}
