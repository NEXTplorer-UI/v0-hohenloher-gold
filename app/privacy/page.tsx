import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Mail, Database, Cookie, Eye, Lock } from "lucide-react"
import Link from "next/link"

export default function PrivacyPage() {
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
            <Shield className="w-16 h-16 text-primary mx-auto mb-6" />
            <h1 className="font-serif font-bold text-4xl text-foreground mb-4">Datenschutzerklärung</h1>
            <p className="text-lg text-muted-foreground">
              Ihre Privatsphäre ist uns wichtig. Hier erfahren Sie, wie wir Ihre Daten schützen.
            </p>
          </div>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="w-5 h-5" />
                  <span>Datenerhebung und -verwendung</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Bestelldaten</h3>
                  <p className="text-muted-foreground text-sm">
                    Wir erheben nur die für die Bestellabwicklung notwendigen Daten: Name, E-Mail-Adresse, Telefonnummer
                    und optional Ihre Adresse für die interne Kundenzuordnung. Diese Daten werden ausschließlich zur
                    Bestellabwicklung und Kommunikation verwendet.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Verteilerprogramm</h3>
                  <p className="text-muted-foreground text-sm">
                    Bei Teilnahme am Verteilerprogramm speichern wir zusätzlich Ihre Bankdaten für
                    Provisionsauszahlungen und Ihre Verkaufsstatistiken.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Cookie className="w-5 h-5" />
                  <span>Cookie-Verwendung</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Technisch notwendige Cookies</h3>
                  <p className="text-muted-foreground text-sm">
                    Diese Cookies sind für die Grundfunktionen unserer Website erforderlich, wie z.B. der Warenkorb,
                    Sitzungsverwaltung und Sicherheitsfunktionen.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Optionale Cookies</h3>
                  <p className="text-muted-foreground text-sm">
                    Analyse- und Marketing-Cookies werden nur mit Ihrer ausdrücklichen Zustimmung verwendet. Sie können
                    Ihre Einstellungen jederzeit ändern.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="w-5 h-5" />
                  <span>E-Mail-Kommunikation</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Bestellbestätigungen</h3>
                  <p className="text-muted-foreground text-sm">
                    Wir senden Ihnen automatisch Bestellbestätigungen und Rechnungen per E-Mail. Diese sind für die
                    Vertragsabwicklung erforderlich.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Newsletter und Updates</h3>
                  <p className="text-muted-foreground text-sm">
                    Marketing-E-Mails senden wir nur mit Ihrer ausdrücklichen Einwilligung. Sie können sich jederzeit
                    abmelden.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="w-5 h-5" />
                  <span>Datensicherheit</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Verschlüsselung</h3>
                  <p className="text-muted-foreground text-sm">
                    Alle Datenübertragungen erfolgen verschlüsselt über HTTPS. Ihre Daten werden sicher in deutschen
                    Rechenzentren gespeichert.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Zugriffsbeschränkung</h3>
                  <p className="text-muted-foreground text-sm">
                    Nur autorisierte Mitarbeiter haben Zugriff auf Ihre Daten und nur soweit dies für die
                    Bestellabwicklung erforderlich ist.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="w-5 h-5" />
                  <span>Ihre Rechte</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Auskunftsrecht</h3>
                    <p className="text-muted-foreground text-sm">
                      Sie haben das Recht zu erfahren, welche Daten wir über Sie gespeichert haben.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Löschungsrecht</h3>
                    <p className="text-muted-foreground text-sm">
                      Sie können die Löschung Ihrer Daten verlangen, soweit keine gesetzlichen Aufbewahrungspflichten
                      bestehen.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Berichtigungsrecht</h3>
                    <p className="text-muted-foreground text-sm">
                      Falsche oder unvollständige Daten können Sie jederzeit korrigieren lassen.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Widerspruchsrecht</h3>
                    <p className="text-muted-foreground text-sm">
                      Sie können der Verarbeitung Ihrer Daten für Marketingzwecke widersprechen.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Kontakt</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">Gerlinde Fink</p>
                  <p className="text-muted-foreground text-sm">Weststraße 28</p>
                  <p className="text-muted-foreground text-sm">74629 Pfedelbach</p>
                  <p className="text-muted-foreground text-sm">
                    E-Mail:{" "}
                    <a href="mailto:suedfruechte-hohenlohe@outlook.de" className="underline">
                      suedfruechte-hohenlohe@outlook.de
                    </a>
                  </p>
                  <p className="text-muted-foreground text-sm">Telefon: 0157 357 038 64</p>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Bei Fragen zum Datenschutz können Sie sich jederzeit an uns wenden.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
