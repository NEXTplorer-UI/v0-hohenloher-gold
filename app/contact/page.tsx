"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Mail, Phone, MapPin, MessageCircle, User, CheckCircle, AlertCircle } from "lucide-react"
import { NextArrivalBanner } from "@/components/next-arrival-banner"
import { useState } from "react"

export default function ContactPage() {
  const [contactForm, setContactForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    subject: "",
    message: "",
  })
  const [contactLoading, setContactLoading] = useState(false)
  const [contactSuccess, setContactSuccess] = useState(false)
  const [contactError, setContactError] = useState("")

  const [complaintForm, setComplaintForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    orderNumber: "",
    description: "",
    image: null as File | null,
  })
  const [complaintLoading, setComplaintLoading] = useState(false)
  const [complaintSuccess, setComplaintSuccess] = useState(false)
  const [complaintError, setComplaintError] = useState("")

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setContactLoading(true)
    setContactError("")
    setContactSuccess(false)

    try {
      console.log("[v0] Submitting contact form")
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Senden der Nachricht")
      }

      console.log("[v0] Contact form submitted successfully")
      setContactSuccess(true)
      setContactForm({
        firstName: "",
        lastName: "",
        email: "",
        subject: "",
        message: "",
      })
    } catch (error) {
      console.error("[v0] Contact form error:", error)
      setContactError(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten")
    } finally {
      setContactLoading(false)
    }
  }

  const handleComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setComplaintLoading(true)
    setComplaintError("")
    setComplaintSuccess(false)

    try {
      console.log("[v0] Submitting complaint form")
      const formData = new FormData()
      formData.append("firstName", complaintForm.firstName)
      formData.append("lastName", complaintForm.lastName)
      formData.append("email", complaintForm.email)
      formData.append("orderNumber", complaintForm.orderNumber)
      formData.append("description", complaintForm.description)
      if (complaintForm.image) {
        formData.append("image", complaintForm.image)
      }

      const response = await fetch("/api/complaint", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Einreichen der Reklamation")
      }

      console.log("[v0] Complaint form submitted successfully")
      setComplaintSuccess(true)
      setComplaintForm({
        firstName: "",
        lastName: "",
        email: "",
        orderNumber: "",
        description: "",
        image: null,
      })
      // Reset file input
      const fileInput = document.getElementById("complaintImage") as HTMLInputElement
      if (fileInput) fileInput.value = ""
    } catch (error) {
      console.error("[v0] Complaint form error:", error)
      setComplaintError(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten")
    } finally {
      setComplaintLoading(false)
    }
  }

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
              Haben Sie weitere Fragen? Wir sind gerne für Sie da.
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
                      kontakt@suedfruechte-hohenlohe.de
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
                    Für besondere Anliegen
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
              {contactSuccess && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Nachricht erfolgreich gesendet!</p>
                    <p className="text-sm text-green-700">
                      Wir haben Ihre Nachricht erhalten und werden uns schnellstmöglich bei Ihnen melden.
                    </p>
                  </div>
                </div>
              )}

              {contactError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">Fehler beim Senden</p>
                    <p className="text-sm text-red-700">{contactError}</p>
                  </div>
                </div>
              )}

              <form className="space-y-6" onSubmit={handleContactSubmit}>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Vorname</Label>
                    <Input
                      id="firstName"
                      placeholder="Ihr Vorname"
                      value={contactForm.firstName}
                      onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nachname</Label>
                    <Input
                      id="lastName"
                      placeholder="Ihr Nachname"
                      value={contactForm.lastName}
                      onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail-Adresse</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ihre.email@beispiel.de"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Betreff</Label>
                  <Input
                    id="subject"
                    placeholder="Worum geht es?"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Nachricht</Label>
                  <Textarea
                    id="message"
                    placeholder="Ihre Nachricht an uns..."
                    className="min-h-[120px]"
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    required
                  />
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={contactLoading}>
                  {contactLoading ? "Wird gesendet..." : "Nachricht senden"}
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
              {complaintSuccess && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Reklamation erfolgreich eingereicht!</p>
                    <p className="text-sm text-green-700">
                      Wir haben Ihre Reklamation erhalten und werden uns innerhalb von 2-3 Werktagen bei Ihnen melden.
                    </p>
                  </div>
                </div>
              )}

              {complaintError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">Fehler beim Einreichen</p>
                    <p className="text-sm text-red-700">{complaintError}</p>
                  </div>
                </div>
              )}

              <form className="space-y-6" onSubmit={handleComplaintSubmit}>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="complaintFirstName">Vorname *</Label>
                    <Input
                      id="complaintFirstName"
                      placeholder="Ihr Vorname"
                      value={complaintForm.firstName}
                      onChange={(e) => setComplaintForm({ ...complaintForm, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="complaintLastName">Nachname *</Label>
                    <Input
                      id="complaintLastName"
                      placeholder="Ihr Nachname"
                      value={complaintForm.lastName}
                      onChange={(e) => setComplaintForm({ ...complaintForm, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complaintEmail">E-Mail-Adresse *</Label>
                  <Input
                    id="complaintEmail"
                    type="email"
                    placeholder="ihre.email@beispiel.de"
                    value={complaintForm.email}
                    onChange={(e) => setComplaintForm({ ...complaintForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orderNumber">Bestellnummer *</Label>
                  <Input
                    id="orderNumber"
                    placeholder="z.B. HG-2025-001234"
                    value={complaintForm.orderNumber}
                    onChange={(e) => setComplaintForm({ ...complaintForm, orderNumber: e.target.value })}
                    required
                  />
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
                    value={complaintForm.description}
                    onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complaintImage">Foto der betroffenen Ware * (erforderlich)</Label>
                  <Input
                    id="complaintImage"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setComplaintForm({ ...complaintForm, image: e.target.files?.[0] || null })}
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

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-red-600 hover:bg-red-700"
                  disabled={complaintLoading}
                >
                  {complaintLoading ? "Wird eingereicht..." : "Reklamation einreichen"}
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
                    <p>Gerlinde Fink</p>
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
