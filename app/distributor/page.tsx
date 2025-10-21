"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Search, MapPin, Users, Clock, Phone, Mail, ArrowRight, Heart, ChevronDown } from "lucide-react"
import { useState } from "react"
import { NextArrivalBanner } from "@/components/next-arrival-banner"

// Mock data for pickup locations
const pickupLocations = [
  {
    id: 1,
    name: "Beispiel Abholort",
    address: "Musterstraße 1, 74653 Künzelsau",
    plz: "74653",
    contact: "Max Mustermann",
    phone: "0123 456789",
    email: "max@example.com",
    hours: "Mo-Fr 14-18 Uhr",
    distance: "5 km",
  },
]

const centralWarehouse = {
  id: 999,
  name: "Zentrallager Südfrüchte Hohenlohe",
  address: "Weststraße 28, 74629 Pfedelbach",
  plz: "74629",
  contact: "Südfrüchte Hohenlohe Team",
  phone: "+49 1573 5703864",
  email: "kontakt@suedfruechte-hohenlohe.de",
  hours: "Siehe Abholtermine",
  distance: "Zentrallager",
  isWarehouse: true,
}

export default function DistributorPage() {
  const [searchPlz, setSearchPlz] = useState("")
  const [searchResults, setSearchResults] = useState<typeof pickupLocations>([])
  const [showResults, setShowResults] = useState(false)
  const [personalMessageLength, setPersonalMessageLength] = useState(0)
  const [newsletter, setNewsletter] = useState(false)
  const [selectedStation, setSelectedStation] = useState<(typeof pickupLocations)[0] | typeof centralWarehouse | null>(
    null,
  )

  const handlePlzSearch = () => {
    if (searchPlz.length >= 4) {
      // Simple mock search - in real app would use proper distance calculation
      const results = pickupLocations.filter((location) => location.plz.startsWith(searchPlz.substring(0, 3)))
      setSearchResults(results)
      setShowResults(true)
    }
  }

  const allLocations = [...pickupLocations, centralWarehouse].sort((a, b) => a.plz.localeCompare(b.plz))

  const handleBecomeDistributor = async () => {
    const formData = {
      firstName: (document.getElementById("firstName") as HTMLInputElement)?.value,
      lastName: (document.getElementById("lastName") as HTMLInputElement)?.value,
      email: (document.getElementById("email") as HTMLInputElement)?.value,
      phone: (document.getElementById("phone") as HTMLInputElement)?.value,
      plz: (document.getElementById("plz") as HTMLInputElement)?.value,
      city: (document.getElementById("city") as HTMLInputElement)?.value,
      businessType: (document.getElementById("businessType") as HTMLInputElement)?.value,
      motivation: (document.getElementById("motivation") as HTMLTextAreaElement)?.value,
      availability: (document.getElementById("availability") as HTMLTextAreaElement)?.value,
      personalMessage: (document.getElementById("personalMessage") as HTMLTextAreaElement)?.value,
      newsletter,
    }

    try {
      const response = await fetch("/api/distributor-application", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        alert(
          "Vielen Dank für Ihr Interesse! Ihre Anfrage wurde an unser Team gesendet. Wir werden uns in Kürze bei Ihnen melden.",
        )
        // Reset form
        const form = document.querySelector("form")
        if (form) form.reset()
      } else {
        alert("Es gab einen Fehler beim Versenden Ihrer Anfrage. Bitte versuchen Sie es später erneut.")
      }
    } catch (error) {
      console.error("Error submitting application:", error)
      alert("Es gab einen Fehler beim Versenden Ihrer Anfrage. Bitte versuchen Sie es später erneut.")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}

      <NextArrivalBanner />

      {/* Hero Section */}
      <section className="bg-card py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-6 max-w-3xl mx-auto">
            <h1 className="font-serif font-bold text-4xl lg:text-5xl text-card-foreground">
              Werden Sie Teil unseres Netzwerks
            </h1>
            <p className="text-lg text-muted-foreground">
              Unser dezentrales Vertriebssystem bringt hochwertige Lebensmittel direkt in Ihre Region. Werden Sie
              Verteiler oder finden Sie Ihren nächsten Abholort.
            </p>
          </div>
        </div>
      </section>

      {/* PLZ Search Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center space-x-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span>Abholort finden</span>
                </CardTitle>
                <p className="text-muted-foreground">
                  Geben Sie Ihre Postleitzahl ein, um den nächstgelegenen Abholort zu finden
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="PLZ eingeben (z.B. 74653)"
                    value={searchPlz}
                    onChange={(e) => setSearchPlz(e.target.value)}
                    maxLength={5}
                  />
                  <Button onClick={handlePlzSearch} disabled={searchPlz.length < 4}>
                    <Search className="w-4 h-4 mr-2" />
                    Suchen
                  </Button>
                </div>

                {showResults && (
                  <div className="space-y-4 mt-6">
                    <h3 className="font-semibold text-lg">Abholorte in Ihrer Nähe:</h3>
                    {searchResults.length > 0 ? (
                      <div className="space-y-3">
                        {searchResults.map((location) => (
                          <Card key={location.id} className="p-4">
                            <div className="space-y-2">
                              <div className="flex justify-between items-start">
                                <h4 className="font-semibold">{location.name}</h4>
                                <Badge variant="outline">{location.distance}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{location.address}</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center space-x-2">
                                  <Clock className="w-4 h-4 text-primary" />
                                  <span>{location.hours}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Phone className="w-4 h-4 text-primary" />
                                  <span>{location.phone}</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 text-sm">
                                <Mail className="w-4 h-4 text-primary" />
                                <span>{location.email}</span>
                              </div>
                              <p className="text-sm">
                                <strong>Ansprechpartner:</strong> {location.contact}
                              </p>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-center py-4">
                          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground mb-4">
                            Leider haben wir noch keinen Abholort in Ihrer Nähe.
                          </p>
                          <p className="text-sm text-muted-foreground mb-6">
                            Sie können Ihre Bestellung aber gerne direkt in unserem Zentrallager abholen:
                          </p>
                        </div>

                        <Card className="p-4 border-primary/20">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <h4 className="font-semibold text-primary">Zentrallager Hohenloher Gold</h4>
                              <Badge variant="secondary">Zentrallager</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">Gartenbühlstraße 33 / Setze, 74613 Öhringen</p>
                            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                              <strong>Hinweis:</strong> Das Lager befindet sich auf der Rückseite des Gebäudes
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mt-3">
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4 text-primary" />
                                <span>Siehe Abholtermine</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Phone className="w-4 h-4 text-primary" />
                                <span>07940 123456</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 text-sm">
                              <Mail className="w-4 h-4 text-primary" />
                              <span>kontakt@suedfruechte-hohenlohe.de</span>
                            </div>
                          </div>
                        </Card>

                        <div className="text-center pt-4">
                          <p className="text-sm text-muted-foreground mb-4">
                            Möchten Sie selbst Verteiler werden oder haben Sie einen Vorschlag für einen Abholort?
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => {
                              const formSection = document.querySelector("[data-form-section]")
                              if (formSection) {
                                formSection.scrollIntoView({ behavior: "smooth" })
                              }
                            }}
                          >
                            Kontakt aufnehmen
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alle verfügbaren Abholorte</CardTitle>
                <p className="text-sm text-muted-foreground">Wählen Sie einen Standort für Details</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Compact scrollable list */}
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {allLocations.map((location) => (
                      <button
                        key={location.id}
                        onClick={() => setSelectedStation(location)}
                        className={`w-full text-left p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors ${
                          selectedStation?.id === location.id ? "bg-primary/5 border-primary/20" : ""
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-sm">{location.name}</h4>
                              {"isWarehouse" in location && location.isWarehouse && (
                                <Badge variant="secondary" className="text-xs">
                                  Zentrallager
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {location.address.split(",")[1]?.trim() || location.address.split(",")[0]}
                            </p>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 text-muted-foreground transition-transform ${
                              selectedStation?.id === location.id ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Detailed information for selected station */}
                  {selectedStation && (
                    <Card
                      className={`p-4 ${
                        "isWarehouse" in selectedStation && selectedStation.isWarehouse
                          ? "border-primary/20 bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <h4
                            className={`font-semibold ${
                              "isWarehouse" in selectedStation && selectedStation.isWarehouse
                                ? "text-primary"
                                : "text-foreground"
                            }`}
                          >
                            {selectedStation.name}
                          </h4>
                          {"isWarehouse" in selectedStation && selectedStation.isWarehouse ? (
                            <Badge variant="secondary">Zentrallager</Badge>
                          ) : (
                            <Badge variant="outline">{selectedStation.distance}</Badge>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground">{selectedStation.address}</p>

                        {"isWarehouse" in selectedStation && selectedStation.isWarehouse && (
                          <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                            <strong>Hinweis:</strong> Abholung nach telefonischer Vereinbarung
                          </p>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                            <span>{selectedStation.hours}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                            <span>{selectedStation.phone}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 text-sm">
                          <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                          <span>{selectedStation.email}</span>
                        </div>

                        <p className="text-sm">
                          <strong>Ansprechpartner:</strong> {selectedStation.contact}
                        </p>
                      </div>
                    </Card>
                  )}

                  {!selectedStation && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Wählen Sie einen Abholort aus der Liste für Details</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-12">
            <h2 className="font-serif font-bold text-3xl lg:text-4xl text-card-foreground">
              So funktioniert unser Verteilersystem
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ein nachhaltiges und gemeinschaftliches Konzept für den Vertrieb hochwertiger Lebensmittel
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center p-6">
              <CardContent className="space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-serif font-bold text-xl">1. Verteiler werden</h3>
                <p className="text-muted-foreground">
                  Melden Sie sich als Verteiler an und werden Sie Teil unseres Netzwerks. Ideal für Hofläden, Bioläden
                  oder engagierte Privatpersonen.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-6">
              <CardContent className="space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <MapPin className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-serif font-bold text-xl">2. Abholort einrichten</h3>
                <p className="text-muted-foreground">
                  Wir richten gemeinsam einen Abholort in Ihrer Region ein. Kunden können dort ihre bestellten Produkte
                  abholen.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-6">
              <CardContent className="space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Heart className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-serif font-bold text-xl">3. Netzwerk stärken</h3>
                <p className="text-muted-foreground">
                  Fördern Sie regionale Kreisläufe und bringen Sie hochwertige Lebensmittel direkt zu den Menschen in
                  Ihrer Nachbarschaft.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className="py-16 bg-background" data-form-section>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-serif">Jetzt Verteiler werden</CardTitle>
                <p className="text-muted-foreground">
                  Füllen Sie das Formular aus und wir melden uns bei Ihnen für ein persönliches Gespräch.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Vorname *</Label>
                    <Input id="firstName" placeholder="Max" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nachname *</Label>
                    <Input id="lastName" placeholder="Mustermann" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail *</Label>
                  <Input id="email" type="email" placeholder="max@example.com" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon *</Label>
                  <Input id="phone" placeholder="+49 123 456789" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="plz">PLZ *</Label>
                    <Input id="plz" placeholder="74653" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Ort *</Label>
                    <Input id="city" placeholder="Künzelsau" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessType">Art des Geschäfts/Standorts</Label>
                  <Input id="businessType" placeholder="z.B. Hofladen, Bioladen, Privatperson" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motivation">Warum möchten Sie Verteiler werden?</Label>
                  <Textarea
                    id="motivation"
                    placeholder="Was motiviert Sie, Teil unseres Verteiler-Netzwerks zu werden?"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="availability">Verfügbarkeit</Label>
                  <Textarea
                    id="availability"
                    placeholder="Wann könnten Sie als Abholort zur Verfügung stehen? (z.B. Öffnungszeiten, bestimmte Wochentage)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="personalMessage">Persönliche Nachricht</Label>
                  <Textarea
                    id="personalMessage"
                    placeholder="Möchten Sie uns noch etwas mitteilen? Hier ist Platz für Ihre persönliche Nachricht..."
                    maxLength={2000}
                    className="min-h-[120px]"
                    onChange={(e) => setPersonalMessageLength(e.target.value.length)}
                  />
                  <p className="text-xs text-muted-foreground">{personalMessageLength}/2000 Zeichen</p>
                </div>

                <Separator />

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="newsletter"
                    className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                    checked={newsletter}
                    onChange={() => setNewsletter(!newsletter)}
                  />
                  <Label htmlFor="newsletter" className="text-sm">
                    Newsletter abonnieren (Bleiben Sie über neue Produkte und Aktionen informiert)
                  </Label>
                </div>

                <Button onClick={handleBecomeDistributor} className="w-full text-lg py-6">
                  <ArrowRight className="w-5 h-5 mr-2" />
                  Anfrage abschicken
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  * Pflichtfelder. Mit dem Absenden stimmen Sie unserer Datenschutzerklärung zu.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="font-serif font-bold text-3xl lg:text-4xl">Haben Sie Fragen?</h2>
            <p className="text-lg opacity-90">
              Unser Team steht Ihnen gerne für alle Fragen rund um das Verteiler-Programm zur Verfügung.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="secondary" size="lg" className="text-lg px-8">
                <Phone className="w-5 h-5 mr-2" />
                07940 123456
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary bg-transparent"
              >
                <Mail className="w-5 h-5 mr-2" />
                kontakt@suedfruechte-hohenlohe.de
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
