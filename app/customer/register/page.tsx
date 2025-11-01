"use client"

import type React from "react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, User, Mail, Lock, MapPin } from "lucide-react"

export default function CustomerRegisterPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Die Passwörter stimmen nicht überein")
      setLoading(false)
      return
    }

    try {
      console.log("[v0] Customer registration attempt:", formData.email)

      const isLocalhost =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")

      const redirectUrl = isLocalhost
        ? process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
        : process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "")

      // Register user with Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${redirectUrl}/customer/dashboard`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            postal_code: formData.postalCode,
            user_type: "customer",
          },
        },
      })

      if (authError) {
        console.log("[v0] Registration error:", authError.message)
        setError(authError.message)
      } else {
        console.log("[v0] Registration successful:", data)
        setSuccess("Registrierung erfolgreich! Bitte prüfen Sie Ihre E-Mails zur Bestätigung.")

        // Clear form
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          confirmPassword: "",
          phone: "",
          address: "",
          city: "",
          postalCode: "",
        })
      }
    } catch (err) {
      console.log("[v0] Registration exception:", err)
      setError("Ein unerwarteter Fehler ist aufgetreten")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Zurück zur Website
          </Link>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-primary">Kundenkonto erstellen</CardTitle>
            <CardDescription className="text-lg">
              Erstellen Sie Ihr persönliches Konto bei Hohenloher Gold
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Persönliche Daten
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Vorname *</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      placeholder="Max"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nachname *</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      placeholder="Mustermann"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Kontaktdaten
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail-Adresse *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="max@beispiel.de"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefonnummer</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+49 123 456789"
                  />
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Adresse
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="address">Straße und Hausnummer</Label>
                  <Input
                    id="address"
                    name="address"
                    type="text"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Musterstraße 123"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postleitzahl</Label>
                    <Input
                      id="postalCode"
                      name="postalCode"
                      type="text"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      placeholder="12345"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Stadt</Label>
                    <Input
                      id="city"
                      name="city"
                      type="text"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Musterstadt"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Passwort
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Passwort *</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Passwort bestätigen *</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-200 bg-green-50">
                  <AlertDescription className="text-green-800">
                    <div className="space-y-2">
                      <p className="font-semibold">{success}</p>
                      <p className="text-sm">
                        Der Bestätigungslink ist <strong>1 Stunde</strong> gültig. Bitte überprüfen Sie auch Ihren
                        Spam-Ordner.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3"
                disabled={loading}
              >
                {loading ? "Konto wird erstellt..." : "Konto erstellen"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Bereits ein Konto?{" "}
                <Link href="/customer/login" className="text-primary hover:underline font-medium">
                  Hier anmelden
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
