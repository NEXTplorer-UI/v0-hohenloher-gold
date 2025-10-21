import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const metadata = {
  title: "Impressum - Hohenloher Gold",
  description: "Rechtliche Angaben und Impressum von Hohenloher Gold - Natürliche Qualität aus Hohenlohe und Sizilien.",
}

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">
                Rechtliche Angaben
              </Badge>
              <h1 className="font-serif font-bold text-4xl lg:text-5xl text-foreground mb-6">Impressum</h1>
              <p className="text-xl text-muted-foreground">Angaben gemäß § 5 TMG</p>
            </div>

            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Anbieter</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Hohenloher Gold GmbH</h3>
                    <p className="text-muted-foreground">
                      Weststraße 28
                      <br />
                      74629 Pfedelbach
                      <br />
                      Deutschland
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Kontakt</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-1">Telefon</h4>
                      <p className="text-muted-foreground">0157 357 038 64</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">E-Mail</h4>
                      <p className="text-muted-foreground">kontakt@suedfruechte-hohenlohe.de</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Handelsregister</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-1">Registergericht</h4>
                      <p className="text-muted-foreground">Amtsgericht Stuttgart</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Registernummer</h4>
                      <p className="text-muted-foreground">HRB 123456</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Umsatzsteuer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <h4 className="font-medium mb-1">Umsatzsteuer-Identifikationsnummer</h4>
                    <p className="text-muted-foreground">DE123456789</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Geschäftsführung</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Max Mustermann</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Max Mustermann
                    <br />
                    Weststraße 28
                    <br />
                    74629 Pfedelbach
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Streitschlichtung</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
                    <a
                      href="https://ec.europa.eu/consumers/odr/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline ml-1"
                    >
                      https://ec.europa.eu/consumers/odr/
                    </a>
                  </p>
                  <p className="text-muted-foreground">Unsere E-Mail-Adresse finden Sie oben im Impressum.</p>
                  <p className="text-muted-foreground">
                    Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
                    Verbraucherschlichtungsstelle teilzunehmen.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Haftung für Inhalte</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den
                    allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht
                    unter der Verpflichtung, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach
                    Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
                  </p>
                  <p className="text-muted-foreground">
                    Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen
                    Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der
                    Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden
                    Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Haftung für Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss
                    haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte
                    der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
                  </p>
                  <p className="text-muted-foreground">
                    Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft.
                    Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente
                    inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer
                    Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links
                    umgehend entfernen.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Urheberrecht</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem
                    deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung
                    außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors
                    bzw. Erstellers.
                  </p>
                  <p className="text-muted-foreground">
                    Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.
                    Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte
                    Dritter beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie
                    trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden
                    Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
