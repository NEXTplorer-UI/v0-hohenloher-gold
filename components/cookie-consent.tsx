"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { X, Cookie, Settings } from "lucide-react"
import Link from "next/link"

interface CookiePreferences {
  essential: boolean
  analytics: boolean
  marketing: boolean
}

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
  })

  useEffect(() => {
    const timer = setTimeout(() => {
      const consent = localStorage.getItem("cookie-consent")
      if (!consent) {
        setShowBanner(true)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  const showCookieSettings = useCallback(() => {
    setShowBanner(true)
    setShowSettings(true)
  }, [])

  const resetCookieConsent = useCallback(() => {
    localStorage.removeItem("cookie-consent")
    setShowBanner(true)
    setShowSettings(false)
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      ;(window as any).showCookieSettings = showCookieSettings
      ;(window as any).resetCookieConsent = resetCookieConsent
    }
  }, [showCookieSettings, resetCookieConsent])

  const handleAcceptAll = useCallback(() => {
    const allAccepted = {
      essential: true,
      analytics: true,
      marketing: true,
    }
    localStorage.setItem("cookie-consent", JSON.stringify(allAccepted))
    setShowBanner(false)
    setShowSettings(false)
  }, [])

  const handleRejectAll = useCallback(() => {
    const essentialOnly = {
      essential: true,
      analytics: false,
      marketing: false,
    }
    localStorage.setItem("cookie-consent", JSON.stringify(essentialOnly))
    setShowBanner(false)
    setShowSettings(false)
  }, [])

  const handleSavePreferences = useCallback(() => {
    localStorage.setItem("cookie-consent", JSON.stringify(preferences))
    setShowBanner(false)
    setShowSettings(false)
  }, [preferences])

  const handleClose = useCallback(() => {
    setShowBanner(false)
    setShowSettings(false)
  }, [])

  const updatePreferences = useCallback((key: keyof CookiePreferences, value: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: value }))
  }, [])

  const bannerContent = useMemo(
    () => (
      <>
        <p className="text-sm text-muted-foreground">
          Wir verwenden Cookies, um Ihnen die bestmögliche Erfahrung auf unserer Website zu bieten. Standardmäßig
          verwenden wir nur technisch notwendige Cookies für die Grundfunktionen unserer Website.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" onClick={handleRejectAll} className="flex-1 bg-background hover:bg-muted">
            Alle ablehnen
          </Button>
          <Button variant="outline" onClick={() => setShowSettings(true)} className="flex-1">
            <Settings className="w-4 h-4 mr-2" />
            Einstellungen
          </Button>
          <Button onClick={handleAcceptAll} className="flex-1">
            Alle akzeptieren
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Weitere Informationen finden Sie in unserer{" "}
          <Link href="/privacy" className="underline hover:no-underline">
            Datenschutzerklärung
          </Link>
        </p>
      </>
    ),
    [handleRejectAll, handleAcceptAll],
  )

  if (!showBanner) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center p-4 z-50">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Cookie className="w-5 h-5" />
              <span>Cookie-Einstellungen</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showSettings ? (
            bannerContent
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex-1 pr-4">
                      <Label className="font-medium">Technisch notwendige Cookies</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Diese Cookies sind für die Grundfunktionen der Website erforderlich und können nicht deaktiviert
                        werden.
                      </p>
                      <div className="mt-2 text-xs text-muted-foreground">
                        <strong>Verwendete Cookies:</strong>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>Warenkorb-Speicherung (cart-data)</li>
                          <li>Session-Management (session-id)</li>
                          <li>Cookie-Einstellungen (cookie-consent)</li>
                        </ul>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Checkbox
                        checked={true}
                        disabled
                        className="w-4 h-4 rounded-full border-2 border-primary bg-transparent data-[state=checked]:bg-primary data-[state=checked]:border-primary [&>span]:hidden"
                      />
                      <span className="text-sm font-medium text-green-600">Erforderlich</span>
                    </div>
                  </div>

                  <div className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex-1 pr-4">
                      <Label className="font-medium">Analyse-Cookies</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Helfen uns zu verstehen, wie Besucher unsere Website nutzen, um die Benutzererfahrung zu
                        verbessern.
                      </p>
                      <div className="mt-2 text-xs text-muted-foreground">
                        <strong>Verwendete Cookies:</strong>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>Google Analytics (_ga, _ga_*) - Besucherstatistiken</li>
                          <li>Seitenaufrufe und Verweildauer</li>
                          <li>Beliebte Produkte und Suchbegriffe</li>
                          <li>Geräte- und Browserinformationen</li>
                        </ul>
                        <p className="mt-2">
                          <strong>Speicherdauer:</strong> 2 Jahre
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Checkbox
                        checked={preferences.analytics}
                        onCheckedChange={(checked) => updatePreferences("analytics", !!checked)}
                        className="w-4 h-4 rounded-full border-2 border-primary bg-transparent data-[state=checked]:bg-primary data-[state=checked]:border-primary [&>span]:hidden"
                      />
                      <span className="text-sm font-medium">{preferences.analytics ? "Aktiviert" : "Deaktiviert"}</span>
                    </div>
                  </div>

                  <div className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex-1 pr-4">
                      <Label className="font-medium">Marketing-Cookies</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Werden verwendet, um Ihnen relevante Werbung zu zeigen und die Wirksamkeit unserer
                        Werbekampagnen zu messen.
                      </p>
                      <div className="mt-2 text-xs text-muted-foreground">
                        <strong>Verwendete Cookies:</strong>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>Facebook Pixel (_fbp, _fbc) - Werbeanzeigen</li>
                          <li>Google Ads (conversion tracking)</li>
                          <li>Newsletter-Präferenzen</li>
                          <li>Produktempfehlungen basierend auf Ihren Interessen</li>
                        </ul>
                        <p className="mt-2">
                          <strong>Speicherdauer:</strong> 1 Jahr
                        </p>
                        <p className="mt-1">
                          <strong>Datenübertragung:</strong> USA (angemessenes Schutzniveau)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Checkbox
                        checked={preferences.marketing}
                        onCheckedChange={(checked) => updatePreferences("marketing", !!checked)}
                        className="w-4 h-4 rounded-full border-2 border-primary bg-transparent data-[state=checked]:bg-primary data-[state=checked]:border-primary [&>span]:hidden"
                      />
                      <span className="text-sm font-medium">{preferences.marketing ? "Aktiviert" : "Deaktiviert"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={handleRejectAll} className="flex-1 bg-transparent">
                  Alle ablehnen
                </Button>
                <Button onClick={handleSavePreferences} className="flex-1">
                  Auswahl speichern
                </Button>
                <Button onClick={handleAcceptAll} className="flex-1">
                  Alle akzeptieren
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function CookieSettingsLink() {
  const handleClick = useCallback(() => {
    if (typeof window !== "undefined") {
      ;(window as any).showCookieSettings?.()
    }
  }, [])

  return (
    <button
      onClick={handleClick}
      className="text-muted-foreground hover:text-sidebar-primary transition-colors text-left"
    >
      Cookie-Einstellungen
    </button>
  )
}
