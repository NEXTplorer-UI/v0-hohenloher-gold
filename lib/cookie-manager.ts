export type CookieCategory = "essential" | "analytics" | "marketing"

export interface CookiePreferences {
  essential: boolean
  analytics: boolean
  marketing: boolean
}

const CONSENT_KEY = "cookie-consent"

/**
 * Get current cookie consent preferences
 */
export function getCookieConsent(): CookiePreferences | null {
  if (typeof window === "undefined") return null

  const consent = localStorage.getItem(CONSENT_KEY)
  if (!consent) return null

  try {
    return JSON.parse(consent) as CookiePreferences
  } catch {
    return null
  }
}

/**
 * Check if a specific cookie category is allowed
 */
export function isCookieCategoryAllowed(category: CookieCategory): boolean {
  const consent = getCookieConsent()
  if (!consent) return category === "essential" // Only essential cookies by default

  return consent[category] === true
}

/**
 * Save cookie consent preferences
 */
export function saveCookieConsent(preferences: CookiePreferences): void {
  if (typeof window === "undefined") return

  localStorage.setItem(CONSENT_KEY, JSON.stringify(preferences))

  // Trigger custom event for other components to react
  window.dispatchEvent(new CustomEvent("cookieConsentChanged", { detail: preferences }))
}

/**
 * Load analytics scripts only if consent is given
 * This function should be called after user gives consent
 */
export function loadAnalytics(): void {
  if (!isCookieCategoryAllowed("analytics")) return

  // Example: Load Vercel Analytics
  // This will be used when Vercel Analytics is implemented
  if (typeof window !== "undefined" && !(window as any).va) {
    const script = document.createElement("script")
    script.src = "/_vercel/insights/script.js"
    script.defer = true
    document.head.appendChild(script)
  }
}

/**
 * Block cookies before consent
 * This should be called on page load
 */
export function initCookieManager(): void {
  if (typeof window === "undefined") return

  // Listen for consent changes
  window.addEventListener("cookieConsentChanged", (event: any) => {
    const preferences = event.detail as CookiePreferences

    // Load analytics if consent is given
    if (preferences.analytics) {
      loadAnalytics()
    }

    // Reload page if user revokes consent to clear any loaded scripts
    const previousConsent = getCookieConsent()
    if (previousConsent?.analytics && !preferences.analytics) {
      // User revoked analytics consent - reload to clear scripts
      window.location.reload()
    }
  })

  // Check if analytics consent is already given and load scripts
  if (isCookieCategoryAllowed("analytics")) {
    loadAnalytics()
  }
}
