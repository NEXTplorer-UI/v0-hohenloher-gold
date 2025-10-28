import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AGBPage() {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-serif">Allgemeine Geschäftsbedingungen (AGB)</CardTitle>
            <p className="text-sm text-muted-foreground">Gültig ab 28.10.2025</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Geltungsbereich</h2>
              <p>
                Für alle Lieferungen von <strong>Gerlinde Fink / Südfrüchte Hohenlohe</strong> an den Verbraucher gelten
                diese Allgemeinen Geschäftsbedingungen (AGB).
              </p>
              <p>
                Ein Verbraucher ist jede natürliche Person, die ein Rechtsgeschäft zu einem Zwecke abschließt, der
                überwiegend weder ihrer gewerblichen noch ihrer selbständigen beruflichen Tätigkeit zugerechnet werden
                kann.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Vertragspartner</h2>
              <p>
                Der Kaufvertrag wird mit <strong>Gerlinde Fink</strong> abgeschlossen.
              </p>
              <ul className="list-none space-y-1 ml-0">
                <li>
                  <strong>Gerlinde Fink</strong>
                </li>
                <li>Weststraße 28</li>
                <li>74629 Pfedelbach</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Vertragsschluss</h2>
              <p>
                Die Darstellung der Produkte im Online-Shop stellt kein rechtlich bindendes Angebot, sondern nur eine
                Aufforderung zur Bestellung dar.
              </p>
              <p>
                Durch das Anklicken der Kaufbestätigung geben Sie eine verbindliche Bestellung der auf der Bestellseite
                aufgelisteten Waren ab. Ihr Kaufvertrag kommt zustande, wenn wir Ihre Bestellung durch eine
                Auftragsbestätigung per E-Mail unmittelbar nach dem Erhalt Ihrer Bestellung annehmen. Bitte beachten
                Sie, dass Sie beim Bestellvorgang dazu verpflichtet sind, eine E-Mail einzugeben, auf die Sie Zugriff
                haben.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Preise & Verpackung</h2>
              <p>
                Es gelten die Preise, die zum Zeitpunkt der Bestellung im Angebot aufgeführt sind. Diese sind die
                Endpreise und enthalten bereits die in Deutschland gesetzlich geltende Mehrwertsteuer. Bei Artikeln, die
                zum Zeitpunkt des Kaufes im Sonderangebot sind oder für die ein Gutschein eingelöst wurde, ist der
                reduzierte Preis im endgültigen Angebot der Bestellung enthalten.
              </p>
              <p>Die Verpackung ist ab dem Zeitpunkt Eigentum des Kunden.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Zahlung</h2>
              <p>
                Grundsätzlich bieten wir die Zahlungsarten <strong>Vorkasse</strong>, <strong>Kreditkarte</strong>,{" "}
                <strong>PayPal</strong> und <strong>Barzahlung bei Abholung</strong> an. Wir behalten uns bei jeder
                Bestellung das Recht vor, bestimmte Zahlarten nicht anzubieten und auf die von uns angebotenen Zahlarten
                zu verweisen.
              </p>

              <div className="space-y-3 ml-4">
                <div>
                  <strong>Vorkasse:</strong> Bei Auswahl der Zahlungsart Vorkasse nennen wir Ihnen unsere Bankverbindung
                  in separater E-Mail und liefern die Ware nach Zahlungseingang.
                </div>
                <div>
                  <strong>Kreditkarte:</strong> Sie bezahlen direkt im Bestellprozess durch Eingabe Ihrer
                  Kreditkartendaten über unseren Zahlungsdienstleister SumUp. Beim Warenversand wird Ihre Kreditkarte
                  mit dem tatsächlichen Rechnungsbetrag nach Abzug eventueller Rabatte, Gutscheine etc. belastet.
                </div>
                <div>
                  <strong>PayPal:</strong> Sie bezahlen direkt über Ihr PayPal-Konto. Nach Absenden Ihrer Bestellung
                  werden Sie zu PayPal weitergeleitet und geben dort den Bestellwert frei. Die Zahlung wird über unseren
                  Zahlungsdienstleister SumUp abgewickelt.
                </div>
                <div>
                  <strong>Barzahlung bei Abholung:</strong> Sie bezahlen den Rechnungsbetrag bei der Abholung bar.
                </div>
              </div>

              <p className="mt-4">
                <strong>Bitte beachten Sie:</strong> Wir akzeptieren ausschließlich Zahlungen von Konten innerhalb der
                Europäischen Union (EU). Etwaige Kosten einer Geldtransaktion werden von Ihnen getragen.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Gutscheine und Codes</h2>
              <p>Wir bieten momentan keine Gutscheine an.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Widerrufsbelehrung</h2>
              <p>
                Informationen zum Widerrufsrecht finden Sie auf unserer separaten{" "}
                <Link href="/widerruf" className="text-primary hover:underline">
                  Widerrufsbelehrung-Seite
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Freiwilliges Rückgaberecht</h2>
              <p>Wir bieten kein freiwilliges Rückgaberecht an.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Lieferung und Lieferzeit</h2>
              <p>
                Lieferungen sind grundsätzlich nur innerhalb Deutschlands möglich. Die Abgabe von Artikeln erfolgt nur
                in haushaltsüblichen Mengen und nur an Endverbraucher.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Versandkosten</h2>
              <p>
                Bei <strong>Südfrüchte Hohenlohe / Gerlinde Fink</strong> liegen die Versandkosten bei{" "}
                <strong>4,90 EUR</strong> für die Zustellung der Ware.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Gewährleistung</h2>
              <p>
                Sollten gelieferte Artikel offensichtliche Material- oder Herstellungsfehler aufweisen, wozu auch
                Transportschäden zählen, so reklamieren Sie diese Fehler sofort gegenüber uns oder dem Mitarbeiter des
                Transportdienstleisters, der Ihnen die Ware liefert. Sollten Sie dies versäumen, hat dies für Ihre
                gesetzlichen Ansprüche keine Konsequenzen.
              </p>
              <p>
                Für alle während der gesetzlichen Gewährleistungsfrist auftretenden Mängel der Kaufsache gelten nach
                Ihrer Wahl die gesetzlichen Ansprüche auf Nacherfüllung, auf Mangelbeseitigung/Neulieferung sowie – bei
                Vorliegen der gesetzlichen Voraussetzungen – die weitergehenden Ansprüche auf Minderung oder Rücktritt
                sowie daneben auf Schadensersatz, einschließlich des Ersatzes des Schadens statt der Erfüllung sowie des
                Ersatzes Ihrer vergeblichen Aufwendungen.
              </p>
              <p>
                Die Gewährleistungsfrist für Neuware beträgt zwei Jahre. Ausgenommen davon sind Waren, die unter den §
                312g Abs. 2 BGB fallen.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Eigentumsvorbehalt</h2>
              <p>
                Bis zur vollständigen Eingang der Bezahlung bleibt die Ware Eigentum der <strong>Gerlinde Fink</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">13. Haftung</h2>
              <p>
                Wir haften unbeschränkt für Vorsatz und grobe Fahrlässigkeit und nach den Vorgaben des
                Produkthaftungsgesetzes. Bei leichter Fahrlässigkeit haften wir grundsätzlich nur bei Verletzungen des
                Lebens, des Körpers und der Gesundheit von Personen.
              </p>
              <p>
                Sollte dies bei einer leichten Fahrlässigkeit nicht zutreffen, haften wir nur im Falle der Verletzung
                von vertragswesentlichen Pflichten. Als diese werden Pflichten verstanden, welche die Erfüllung der
                ordnungsgemäßen Durchführung des Vertrages erst ermöglichen und auf deren Einhaltung der Vertragspartner
                vertraut. Die Haftung bei der Verletzung einer vertragswesentlichen Pflicht ist auf den für den
                erlittenen Schaden typischen Schadensersatz begrenzt, mit dessen Entstehen wir bei Vertragsabschluss
                aufgrund der zu diesem Zeitpunkt bekannten Umständen rechnen mussten. Die hier vorliegende
                Haftungsbeschränkung gilt ebenfalls zugunsten von unseren Erfüllungsgehilfen.
              </p>
            </section>

            <div className="border-t pt-6 mt-8">
              <p className="text-sm text-muted-foreground">
                Diese Allgemeinen Geschäftsbedingungen gelten ab Dienstag, den 28.10.2025, 21:04 Uhr.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
