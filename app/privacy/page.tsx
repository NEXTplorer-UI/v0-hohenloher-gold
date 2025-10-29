import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Mail, Database, Cookie, Eye, Lock, Server, CreditCard, Cloud } from "lucide-react"
import Link from "next/link"
import { DataProtectionContactForm } from "@/components/data-protection-contact-form"

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
                  <Server className="w-5 h-5" />
                  <span>Eingesetzte Dienstleister</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Supabase (Datenbank & Authentifizierung)
                  </h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    Wir nutzen Supabase Inc. für die Speicherung Ihrer Bestelldaten, Kundenkontoinformationen und
                    Authentifizierung.
                  </p>
                  <ul className="text-muted-foreground text-sm space-y-1 ml-4 list-disc">
                    <li>
                      <strong>Verarbeitete Daten:</strong> Name, E-Mail, Telefon, Bestellhistorie, Login-Daten
                    </li>
                    <li>
                      <strong>Zweck:</strong> Vertragserfüllung, Kundenkontoverwaltung (Art. 6 Abs. 1 lit. b DSGVO)
                    </li>
                    <li>
                      <strong>Speicherort:</strong> EU-Rechenzentrum Frankfurt, Deutschland
                    </li>
                    <li>
                      <strong>Aufbewahrung:</strong> Dauer der Geschäftsbeziehung + gesetzliche Aufbewahrungsfristen
                    </li>
                    <li>
                      <strong>Datenschutz:</strong>{" "}
                      <a
                        href="https://supabase.com/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        supabase.com/privacy
                      </a>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    SumUp (Zahlungsabwicklung)
                  </h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    Für Online-Kartenzahlungen und PayPal-Zahlungen nutzen wir SumUp Payments Limited als
                    Zahlungsdienstleister.
                  </p>
                  <ul className="text-muted-foreground text-sm space-y-1 ml-4 list-disc">
                    <li>
                      <strong>Verarbeitete Daten:</strong> Zahlungsdaten (Karteninformationen, PayPal-Transaktionsdaten)
                    </li>
                    <li>
                      <strong>Zweck:</strong> Zahlungsabwicklung (Art. 6 Abs. 1 lit. b DSGVO)
                    </li>
                    <li>
                      <strong>Speicherort:</strong> EU (SumUp ist PCI-DSS zertifiziert)
                    </li>
                    <li>
                      <strong>Aufbewahrung:</strong> Gemäß gesetzlicher Vorgaben für Zahlungstransaktionen
                    </li>
                    <li>
                      <strong>Datenschutz:</strong>{" "}
                      <a
                        href="https://sumup.de/datenschutz/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        sumup.de/datenschutz
                      </a>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    PayPal (Zahlungsabwicklung)
                  </h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    Bei Auswahl von PayPal als Zahlungsmethode wird die Zahlung über PayPal (Europe) S.à r.l. et Cie,
                    S.C.A. abgewickelt.
                  </p>
                  <ul className="text-muted-foreground text-sm space-y-1 ml-4 list-disc">
                    <li>
                      <strong>Verarbeitete Daten:</strong> PayPal-Kontodaten, Transaktionsdaten, E-Mail-Adresse
                    </li>
                    <li>
                      <strong>Zweck:</strong> Zahlungsabwicklung (Art. 6 Abs. 1 lit. b DSGVO)
                    </li>
                    <li>
                      <strong>Speicherort:</strong> EU (PayPal Europe mit Sitz in Luxemburg)
                    </li>
                    <li>
                      <strong>Aufbewahrung:</strong> Gemäß PayPal-Richtlinien und gesetzlicher Vorgaben
                    </li>
                    <li>
                      <strong>Cookies:</strong> PayPal setzt während des Zahlungsvorgangs eigene Cookies (siehe
                      Cookie-Richtlinie)
                    </li>
                    <li>
                      <strong>Datenschutz:</strong>{" "}
                      <a
                        href="https://www.paypal.com/de/webapps/mpp/ua/privacy-full"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        paypal.com/de/datenschutz
                      </a>
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Hinweis: PayPal wird über SumUp als Zahlungsoption bereitgestellt. Die Datenverarbeitung erfolgt
                    direkt durch PayPal gemäß deren Datenschutzbestimmungen.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Resend (E-Mail-Versand)
                  </h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    Für den Versand von Bestellbestätigungen, Rechnungen und Newsletter nutzen wir Resend Inc.
                  </p>
                  <ul className="text-muted-foreground text-sm space-y-1 ml-4 list-disc">
                    <li>
                      <strong>Verarbeitete Daten:</strong> E-Mail-Adresse, Name, Bestellinformationen
                    </li>
                    <li>
                      <strong>Zweck:</strong> Vertragserfüllung, Kommunikation (Art. 6 Abs. 1 lit. b DSGVO)
                    </li>
                    <li>
                      <strong>Speicherort:</strong> USA (Standardvertragsklauseln gemäß Art. 46 DSGVO)
                    </li>
                    <li>
                      <strong>Aufbewahrung:</strong> E-Mails werden nach Zustellung nicht dauerhaft gespeichert
                    </li>
                    <li>
                      <strong>E-Mail-Tracking:</strong> Wir nutzen Resends integriertes Tracking um zu erfassen, ob
                      Newsletter-E-Mails geöffnet und Links geklickt wurden. Dies dient der Verbesserung unserer
                      Kommunikation und erfolgt auf Grundlage Ihrer Newsletter-Einwilligung (Art. 6 Abs. 1 lit. a
                      DSGVO). Erfasst werden: Öffnungszeitpunkt, geklickte Links, IP-Adresse (anonymisiert). Sie können
                      dem Tracking widersprechen, indem Sie den Newsletter abbestellen.
                    </li>
                    <li>
                      <strong>Datenschutz:</strong>{" "}
                      <a
                        href="https://resend.com/legal/privacy-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        resend.com/legal/privacy-policy
                      </a>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Cloud className="w-4 h-4" />
                    Vercel (Hosting & Dateispeicherung)
                  </h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    Unsere Website wird auf der Vercel-Plattform gehostet. Dateien (z.B. Newsletter-Anhänge) werden über
                    Vercel Blob Storage gespeichert.
                  </p>
                  <ul className="text-muted-foreground text-sm space-y-1 ml-4 list-disc">
                    <li>
                      <strong>Verarbeitete Daten:</strong> IP-Adresse (temporär), hochgeladene Dateien
                      (Newsletter-Anhänge wie PDFs, Bilder), technische Logs
                    </li>
                    <li>
                      <strong>Zweck:</strong> Bereitstellung der Website, technischer Betrieb, Newsletter-Versand (Art.
                      6 Abs. 1 lit. f DSGVO)
                    </li>
                    <li>
                      <strong>Speicherort:</strong> EU-Rechenzentren (Frankfurt)
                    </li>
                    <li>
                      <strong>Aufbewahrung:</strong> Logs 30 Tage, Newsletter-Anhänge bis zur manuellen Löschung
                    </li>
                    <li>
                      <strong>Datenschutz:</strong>{" "}
                      <a
                        href="https://vercel.com/legal/privacy-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        vercel.com/legal/privacy-policy
                      </a>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Auftragsverarbeitung:</strong> Mit allen genannten Dienstleistern haben wir
                    Auftragsverarbeitungsverträge (AVV) gemäß Art. 28 DSGVO abgeschlossen, die die datenschutzkonforme
                    Verarbeitung Ihrer Daten sicherstellen.
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
                <div>
                  <h3 className="font-semibold mb-2">Newsletter-Tracking</h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    Um die Qualität unserer Newsletter zu verbessern, erfassen wir mit Ihrer Einwilligung folgende
                    Daten:
                  </p>
                  <ul className="text-muted-foreground text-sm space-y-1 ml-4 list-disc">
                    <li>Ob und wann Sie den Newsletter geöffnet haben</li>
                    <li>Welche Links Sie im Newsletter angeklickt haben</li>
                    <li>Technische Daten (IP-Adresse anonymisiert, Geräteinformationen)</li>
                  </ul>
                  <p className="text-muted-foreground text-sm mt-2">
                    <strong>Rechtsgrundlage:</strong> Ihre Einwilligung beim Newsletter-Abonnement (Art. 6 Abs. 1 lit. a
                    DSGVO)
                  </p>
                  <p className="text-muted-foreground text-sm mt-2">
                    <strong>Widerruf:</strong> Sie können dem Tracking jederzeit widersprechen, indem Sie den Newsletter
                    abbestellen oder uns kontaktieren.
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
                    Alle Datenübertragungen erfolgen verschlüsselt über HTTPS. Ihre Daten werden ausschließlich in
                    EU-Rechenzentren (Frankfurt, Deutschland) gespeichert und unterliegen der DSGVO. Wir nutzen Supabase
                    als Datenbank-Provider mit EU-Hosting.
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

            <DataProtectionContactForm />

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
