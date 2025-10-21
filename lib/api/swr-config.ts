import type { SWRConfiguration } from "swr"

export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 2000,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  fetcher: async (url: string) => {
    const res = await fetch(url)
    if (!res.ok) {
      const error = new Error("API request failed")
      throw error
    }
    return res.json()
  },
}
