import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Mail, Phone, MapPin, MessageCircle, User } from "lucide-react"
import { NextArrivalBanner } from "@/components/next-arrival-banner"

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}

      <NextArrivalBanner />

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-card to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-6 max-w-3xl mx-auto">
            <h1 className="font-serif font-bold text-4xl lg:text-5xl text-foreground">Kontakt</h1>
            <p className="text-lg text-muted-foreground">
              Haben Sie Fragen zu unseren Produkten oder möchten Sie direkten Kontakt aufnehmen? Wir sind gerne für Sie
              da.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
              <p className="text-sm text-amber-800 text-center">
                <strong>Hinweis zu frischen Naturprodukten:</strong>
                <br />
                Unsere Südfrüchte sind frische, natürliche Ware. Trotz sorgfältiger Kontrollen kann es vorkommen, dass
                einzelne Früchte verderben. Bei übermäßig viel verdorbener Ware nutzen Sie bitte unser{" "}
                <a href="#complaint-form" className="text-amber-900 underline hover:text-amber-700">
                  Reklamationsformular
                </a>
                .<br />
                <strong>Reklamationen müssen spätestens 3 Tage nach Erhalt der Ware eingereicht werden.</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Bestellungen & Allgemeine Fragen */}
            <Card className="p-8">
              <CardHeader className="text-center pb-6">
                <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-gold" />
                </div>
                <CardTitle className="text-2xl font-serif">Bestellungen & Fragen</CardTitle>
                <p className="text-muted-foreground">Für Fragen zu Bestellungen, Produkten und allgemeine Anfragen</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gold" />
                  <div>
                    <p className="font-medium">E-Mail</p>
                    <a href="mailto:suedfruechte-hohenlohe@outlook.de" className="text-gold hover:underline">
                      suedfruechte-hohenlohe@outlook.de
                    </a>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gold" />
                  <div>
                    <p className="font-medium">Telefon</p>
                    <a href="tel:015735703864" className="text-gold hover:underline">
                      0157 357 038 64
                    </a>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-gold mt-1" />
                  <div>
                    <p className="font-medium">Adresse</p>
                    <p className="text-muted-foreground">
                      Gerlinde Fink
                      <br />
                      Weststraße 28
                      <br />
                      74629 Pfedelbach
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Direkter Kontakt zur Chefin */}
            <Card className="p-8">
              <CardHeader className="text-center pb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl font-serif">Direkter Kontakt</CardTitle>
                <p className="text-muted-foreground">
                  Für persönliche Anliegen und direkten Kontakt zur Geschäftsführung
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">E-Mail</p>
                    <a href="mailto:gerlinde.fink@hohenloher-gold.de" className="text-primary hover:underline">
                      gerlinde.fink@hohenloher-gold.de
                    </a>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Mobil</p>
                    <a href="tel:015735703864" className="text-primary hover:underline">
                      0157 357 038 64
                    </a>
                  </div>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Gerlinde Fink</strong> - Geschäftsführerin
                    <br />
                    Für Partnerschaften, Verteilerprogramm und besondere Anliegen
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center space-y-4 mb-12">
              <h2 className="font-serif font-bold text-3xl text-card-foreground">Nachricht senden</h2>
              <p className="text-muted-foreground">
                Schreiben Sie uns eine Nachricht und wir melden uns schnellstmöglich bei Ihnen zurück.
              </p>
            </div>

            <Card className="p-8">
              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Vorname</Label>
                    <Input id="firstName" placeholder="Ihr Vorname" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nachname</Label>
                    <Input id="lastName" placeholder="Ihr Nachname" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail-Adresse</Label>
                  <Input id="email" type="email" placeholder="ihre.email@beispiel.de" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Betreff</Label>
                  <Input id="subject" placeholder="Worum geht es?" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Nachricht</Label>
                  <Textarea id="message" placeholder="Ihre Nachricht an uns..." className="min-h-[120px]" />
                </div>

                <Button type="submit" size="lg" className="w-full">
                  Nachricht senden
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </section>

      {/* Complaint Form */}
      <section className="py-16 bg-background" id="complaint-form">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center space-y-4 mb-12">
              <h2 className="font-serif font-bold text-3xl text-foreground">Reklamationsformular</h2>
              <p className="text-muted-foreground">
                Melden Sie uns übermäßig viel verdorbene Ware. Bitte fügen Sie ein Foto bei und geben Sie Ihre
                Bestellnummer an.
              </p>
            </div>

            <Card className="p-8 border-red-200">
              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="complaintFirstName">Vorname *</Label>
                    <Input id="complaintFirstName" placeholder="Ihr Vorname" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="complaintLastName">Nachname *</Label>
                    <Input id="complaintLastName" placeholder="Ihr Nachname" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complaintEmail">E-Mail-Adresse *</Label>
                  <Input id="complaintEmail" type="email" placeholder="ihre.email@beispiel.de" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orderNumber">Bestellnummer *</Label>
                  <Input id="orderNumber" placeholder="z.B. HG-2025-001234" required />
                  <p className="text-xs text-muted-foreground">
                    Alternativ können Sie sich anmelden, um aus Ihrer Bestellhistorie zu wählen
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complaintDescription">Beschreibung der Reklamation *</Label>
                  <Textarea
                    id="complaintDescription"
                    placeholder="Beschreiben Sie bitte, welche Produkte betroffen sind und in welchem Zustand sie waren..."
                    className="min-h-[100px]"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complaintImage">Foto der betroffenen Ware * (erforderlich)</Label>
                  <Input
                    id="complaintImage"
                    type="file"
                    accept="image/*"
                    required
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  <p className="text-xs text-muted-foreground">
                    Bitte fügen Sie ein deutliches Foto der verdorbenen Ware bei. Ohne Foto kann die Reklamation nicht
                    bearbeitet werden.
                  </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    <strong>Wichtiger Hinweis:</strong>
                    <br />
                    Reklamationen können nur mit einem Foto der betroffenen Ware bearbeitet werden und müssen spätestens
                    3 Tage nach Erhalt eingereicht werden.
                  </p>
                </div>

                <Button type="submit" size="lg" className="w-full bg-red-600 hover:bg-red-700">
                  Reklamation einreichen
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </section>

      {/* Business Info */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Card className="p-8">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-serif">Geschäftsinformationen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8 text-sm text-muted-foreground">
                  <div className="space-y-2">
                    <p>
                      <strong>Bankverbindung:</strong>
                    </p>
                    <p>Sparkasse Hohenlohekreis</p>
                    <p>IBAN: DE35 6225 1550 1000 5154 15</p>
                  </div>
                  <div className="space-y-2">
                    <p>
                      <strong>Steuerliche Angaben:</strong>
                    </p>
                    <p>Ust-Id.-Nr.: DE 244 622 911</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
