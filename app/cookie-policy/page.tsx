"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Cookie, Shield, Settings, Info } from "lucide-react"
import Link from "next/link"

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <div className="w-6 h-6 bg-primary-foreground rounded-full" />
              </div>
              <span className="font-serif font-bold text-xl text-foreground">Hohenloher Gold</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Cookie className="w-16 h-16 text-primary mx-auto mb-6" />
            <h1 className="font-serif font-bold text-4xl text-foreground mb-4">Cookie-Richtlinie</h1>
            <p className="text-lg text-muted-foreground">
              Informationen über die Verwendung von Cookies auf unserer Website
            </p>
          </div>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Info className="w-5 h-5" />
                  <span>Was sind Cookies?</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  Cookies sind kleine Textdateien, die auf Ihrem Gerät gespeichert werden, wenn Sie eine Website
                  besuchen. Sie helfen uns, die Website funktionsfähig zu machen, die Benutzererfahrung zu verbessern
                  und Informationen über die Nutzung der Website zu sammeln.
                </p>
                <p className="text-muted-foreground text-sm">
                  Wir verwenden Cookies nur mit Ihrer ausdrücklichen Einwilligung, mit Ausnahme von technisch
                  notwendigen Cookies, die für den Betrieb der Website erforderlich sind.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Technisch notwendige Cookies</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  Diese Cookies sind für die Grundfunktionen unserer Website erforderlich und können nicht deaktiviert
                  werden. Sie werden nur als Reaktion auf von Ihnen getätigte Aktionen gesetzt, wie z.B. das Festlegen
                  Ihrer Datenschutzeinstellungen, das Anmelden oder das Ausfüllen von Formularen.
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">Verwendete Cookies:</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium text-sm">cart-data</p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Zweck:</strong> Speichert Ihren Warenkorb zwischen Seitenaufrufen
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Speicherdauer:</strong> 7 Tage
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-sm">session-id</p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Zweck:</strong> Identifiziert Ihre Sitzung für Sicherheitszwecke
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Speicherdauer:</strong> Bis zum Ende der Browser-Sitzung
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-sm">cookie-consent</p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Zweck:</strong> Speichert Ihre Cookie-Einstellungen
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Speicherdauer:</strong> 1 Jahr
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-sm">sb-*-auth-token</p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Zweck:</strong> Authentifizierung für Ihr Kundenkonto (Supabase)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Speicherdauer:</strong> 1 Jahr oder bis zur Abmeldung
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>Analyse-Cookies</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  Diese Cookies helfen uns zu verstehen, wie Besucher mit unserer Website interagieren, indem sie
                  Informationen anonym sammeln und melden. Alle Daten werden anonymisiert und DSGVO-konform verarbeitet.
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">Vercel Analytics (optional):</h3>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      <strong>Anbieter:</strong> Vercel Inc.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Zweck:</strong> Anonymisierte Besucherstatistiken, Seitenaufrufe, Verweildauer
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Datenverarbeitung:</strong> Keine IP-Speicherung, keine personenbezogenen Daten
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Speicherort:</strong> EU-Rechenzentren (Frankfurt, Deutschland)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Speicherdauer:</strong> 90 Tage
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Datenschutz:</strong>{" "}
                      <a
                        href="https://vercel.com/legal/privacy-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        vercel.com/legal/privacy-policy
                      </a>
                    </p>
                  </div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    <strong>Wichtig:</strong> Analyse-Cookies werden nur gesetzt, wenn Sie ausdrücklich zustimmen. Sie
                    können Ihre Einwilligung jederzeit widerrufen.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Cookie className="w-5 h-5" />
                  <span>Zahlungsdienstleister-Cookies</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  Wenn Sie eine Online-Zahlung durchführen, setzen unsere Zahlungsdienstleister eigene Cookies, um die
                  Transaktion sicher abzuwickeln.
                </p>
                <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                  <div>
                    <h3 className="font-semibold mb-3">SumUp Cookies:</h3>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        <strong>Anbieter:</strong> SumUp Payments Limited
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Zweck:</strong> Sichere Abwicklung von Kartenzahlungen, Betrugsprävention
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Speicherdauer:</strong> Session-basiert (bis zum Abschluss der Zahlung)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Datenschutz:</strong>{" "}
                        <a
                          href="https://sumup.de/datenschutz/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          sumup.de/datenschutz
                        </a>
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">PayPal Cookies:</h3>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        <strong>Anbieter:</strong> PayPal (Europe) S.à r.l. et Cie, S.C.A.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Zweck:</strong> Authentifizierung, Betrugsprävention, Transaktionssicherheit
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Cookies:</strong> LANG, ts_c, ts, tsrce, x-pp-s, enforce_policy, l7_az, nsid, und
                        weitere
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Speicherdauer:</strong> Variiert je nach Cookie (Session bis 3 Jahre)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Datenschutz:</strong>{" "}
                        <a
                          href="https://www.paypal.com/de/webapps/mpp/ua/privacy-full"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          paypal.com/de/datenschutz
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>Wichtig:</strong> Diese Cookies werden nur gesetzt, wenn Sie eine Zahlung durchführen und
                    sind für die sichere Abwicklung der Transaktion erforderlich. Sie werden nicht für Tracking oder
                    Werbezwecke verwendet.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Cookie className="w-5 h-5" />
                  <span>Marketing-Cookies</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  Marketing-Cookies werden verwendet, um Ihnen relevante Werbung zu zeigen und die Wirksamkeit unserer
                  Werbekampagnen zu messen.
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">Verwendete Cookies:</h3>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      <strong>newsletter-preferences:</strong> Speichert Ihre Newsletter-Präferenzen
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>product-recommendations:</strong> Produktempfehlungen basierend auf Ihren Interessen
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Speicherdauer:</strong> 1 Jahr
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ihre Cookie-Einstellungen verwalten</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  Sie können Ihre Cookie-Einstellungen jederzeit ändern. Klicken Sie auf den Link unten, um Ihre
                  Präferenzen anzupassen.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        ;(window as any).showCookieSettings?.()
                      }
                    }}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Cookie-Einstellungen öffnen
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sie können Cookies auch über Ihre Browser-Einstellungen verwalten oder löschen. Beachten Sie jedoch,
                  dass das Deaktivieren von Cookies die Funktionalität unserer Website beeinträchtigen kann.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weitere Informationen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  Weitere Informationen zum Datenschutz und zur Verarbeitung Ihrer Daten finden Sie in unserer{" "}
                  <Link href="/privacy" className="underline hover:no-underline">
                    Datenschutzerklärung
                  </Link>
                  .
                </p>
                <p className="text-muted-foreground text-sm">
                  Bei Fragen zu unserer Cookie-Richtlinie können Sie uns jederzeit kontaktieren:
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="font-medium text-sm">Gerlinde Fink</p>
                  <p className="text-xs text-muted-foreground">Weststraße 28</p>
                  <p className="text-xs text-muted-foreground">74629 Pfedelbach</p>
                  <p className="text-xs text-muted-foreground">
                    E-Mail:{" "}
                    <a href="mailto:suedfruechte-hohenlohe@outlook.de" className="underline">
                      suedfruechte-hohenlohe@outlook.de
                    </a>
                  </p>
                  <p className="text-xs text-muted-foreground">Telefon: 0157 357 038 64</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
