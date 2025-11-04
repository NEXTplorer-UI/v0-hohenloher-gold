"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, ShoppingCart, User, Mail, Phone } from "lucide-react"
import Link from "next/link"

export default function AccountConfirmedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 py-16 px-4">
      <div className="container mx-auto max-w-2xl">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <CardTitle className="text-3xl font-bold text-green-700">E-Mail erfolgreich bestätigt!</CardTitle>
              <p className="text-muted-foreground">Ihr Benutzerkonto wurde erfolgreich aktiviert</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Success Message */}
            <div className="text-center space-y-3">
              <p className="text-lg">
                Vielen Dank für Ihre Registrierung bei <strong>Hohenloher Gold</strong>!
              </p>
              <p className="text-muted-foreground">
                Sie können sich jetzt anmelden und Ihre Bestellungen verwalten, Ihren Bestellverlauf einsehen und von
                exklusiven Angeboten profitieren.
              </p>
            </div>

            {/* Next Steps */}
            <div className="border-t pt-6 space-y-4">
              <h3 className="font-semibold text-lg text-center">Was möchten Sie als Nächstes tun?</h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <Link href="/customer/dashboard" className="block">
                  <Button className="w-full gap-2 h-12" size="lg">
                    <User className="w-5 h-5" />
                    Zum Dashboard
                  </Button>
                </Link>

                <Link href="/shop" className="block">
                  <Button variant="outline" className="w-full gap-2 h-12 bg-transparent" size="lg">
                    <ShoppingCart className="w-5 h-5" />
                    Weiter einkaufen
                  </Button>
                </Link>
              </div>
            </div>

            {/* Benefits */}
            <div className="bg-amber-50 rounded-lg p-6 space-y-3">
              <h4 className="font-semibold text-center">Ihre Vorteile als registrierter Kunde:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Bestehende Bestellungen wurden automatisch Ihrem Konto zugeordnet</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Schnellerer Checkout bei zukünftigen Bestellungen</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Übersicht über alle Ihre Bestellungen</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Verwaltung Ihrer persönlichen Daten</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Möglichkeit zur Bewerbung als Verteiler</span>
                </li>
              </ul>
            </div>

            {/* Contact Information */}
            <div className="border-t pt-6 text-center space-y-3">
              <p className="text-sm font-semibold">Haben Sie Fragen?</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
                <a href="tel:015735703864" className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Phone className="w-4 h-4" />
                  <span>0157 357 038 64</span>
                </a>
                <span className="hidden sm:inline">•</span>
                <a
                  href="mailto:kontakt@suedfruechte-hohenlohe.de"
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  <span>kontakt@suedfruechte-hohenlohe.de</span>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
