'use client'

import { useState, useCallback } from 'react'

/**
 * Hook für Lazy-Loading Tabs
 * Tabs werden erst geladen wenn sie aktiviert werden
 */

interface UseLazyTabsOptions {
  defaultTab: string
  // Optional: Tabs die pre-loaded werden sollen
  preloadTabs?: string[]
}

export function useLazyTabs(options: UseLazyTabsOptions) {
  const { defaultTab, preloadTabs = [] } = options
  
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(
    new Set([defaultTab, ...preloadTabs])
  )

  const switchTab = useCallback((tab: string) => {
    setActiveTab(tab)
    setLoadedTabs((prev) => new Set([...prev, tab]))
  }, [])

  const isTabLoaded = useCallback(
    (tab: string) => loadedTabs.has(tab),
    [loadedTabs]
  )

  return {
    activeTab,
    switchTab,
    isTabLoaded,
  }
}
