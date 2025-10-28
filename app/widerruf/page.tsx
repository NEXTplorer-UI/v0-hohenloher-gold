import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function WiderrufPage() {
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
            <CardTitle className="text-3xl font-serif">Widerrufsbelehrung</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">Widerrufsrecht</h2>
              <p>
                Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die
                Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem Sie oder ein von Ihnen benannter Dritter, der
                nicht der Beförderer ist, die Waren in Besitz genommen haben bzw. hat.
              </p>
              <p className="mt-4">Um Ihr Widerrufsrecht auszuüben, müssen Sie uns</p>
              <p className="font-medium">(Kontaktdaten des Unternehmers):</p>
              <div className="bg-muted p-4 rounded-lg my-4">
                <p>Südfrüchte Hohenlohe</p>
                <p>Inhaberin: Gerlinde Fink</p>
                <p>Weststraße 28</p>
                <p>74629 Pfedelbach</p>
                <p>Deutschland</p>
                <p>E-Mail: kontakt@suedfruechte-hohenlohe.de</p>
              </div>
              <p>
                mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder eine E-Mail) über
                Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte
                Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.
              </p>
              <p className="mt-4">
                Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des
                Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Folgen des Widerrufs</h2>
              <p>
                Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben,
                einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie
                eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben),
                unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über
                Ihren Widerruf dieses Vertrags bei uns eingegangen ist.
              </p>
              <p className="mt-4">
                Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion
                eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall
                werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.
              </p>
              <p className="mt-4">
                Wir können die Rückzahlung verweigern, bis wir die Waren wieder zurückerhalten haben oder bis Sie den
                Nachweis erbracht haben, dass Sie die Waren zurückgesandt haben, je nachdem, welches der frühere
                Zeitpunkt ist.
              </p>
              <p className="mt-4">
                Sie haben die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem Tag, an dem
                Sie uns über den Widerruf dieses Vertrags unterrichten, an uns zurückzusenden oder zu übergeben. Die
                Frist ist gewahrt, wenn Sie die Waren vor Ablauf der Frist von vierzehn Tagen absenden.
              </p>
              <p className="mt-4">Sie tragen die unmittelbaren Kosten der Rücksendung der Waren.</p>
              <p className="mt-4">
                Sie müssen für einen etwaigen Wertverlust der Waren nur aufkommen, wenn dieser Wertverlust auf einen zur
                Prüfung der Beschaffenheit, Eigenschaften und Funktionsweise der Waren nicht notwendigen Umgang mit
                ihnen zurückzuführen ist.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Ausschluss bzw. vorzeitiges Erlöschen des Widerrufsrechts</h2>
              <p>Das Widerrufsrecht besteht nicht bei Verträgen zur Lieferung</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>von Waren, die schnell verderben können oder deren Verfallsdatum schnell überschritten würde,</li>
                <li>
                  von versiegelten Waren, die aus Gründen des Gesundheitsschutzes oder der Hygiene nicht zur Rückgabe
                  geeignet sind, wenn ihre Versiegelung nach der Lieferung entfernt wurde,
                </li>
                <li>
                  von individuell zusammengestellten Geschenkboxen oder Mischungen, die nach Kundenspezifikation
                  angefertigt wurden.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Muster-Widerrufsformular</h2>
              <div className="bg-muted p-6 rounded-lg border">
                <p className="font-medium mb-4">
                  (Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden es
                  zurück.)
                </p>
                <div className="space-y-3 text-sm">
                  <p>
                    <strong>An:</strong>
                  </p>
                  <div className="pl-4">
                    <p>Südfrüchte Hohenlohe</p>
                    <p>Inhaberin: Gerlinde Fink</p>
                    <p>Weststraße 28</p>
                    <p>74629 Pfedelbach</p>
                    <p>Deutschland</p>
                    <p>E-Mail: kontakt@suedfruechte-hohenlohe.de</p>
                  </div>
                  <p className="mt-4">
                    Hiermit widerrufe(n) ich/wir den von mir/uns abgeschlossenen Vertrag über den Kauf der folgenden
                    Waren:
                  </p>
                  <p>.......................................................................</p>
                  <p className="mt-3">Bestellt am: …… / erhalten am: ……</p>
                  <p>Name des/der Verbraucher(s): ……………………………………</p>
                  <p>Anschrift des/der Verbraucher(s): ……………………………………</p>
                  <p>Unterschrift des/der Verbraucher(s): (nur bei Mitteilung auf Papier)</p>
                  <p>Datum: …………………………</p>
                </div>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
