"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { FormField } from "@/components/ui/form-field"
import { useFormValidation } from "@/hooks/use-form-validation"
import { registrationSchema } from "@/lib/validation/schemas"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const supabase = createClient()

  const { validateField, validateForm, getFieldError, hasFieldError, markFieldTouched } = useFormValidation({
    schema: registrationSchema,
    mode: "onChange",
    debounceMs: 500,
  })

  const handleFieldChange = useCallback(
    (fieldName: string, value: string) => {
      const newFormData = { ...formData, [fieldName]: value }
      setFormData(newFormData)

      const timeoutId = setTimeout(() => {
        validateField(fieldName, value, newFormData)
      }, 500)

      return () => clearTimeout(timeoutId)
    },
    [formData, validateField],
  )

  const handleFieldBlur = useCallback(
    (fieldName: string) => {
      markFieldTouched(fieldName)
      validateField(fieldName, formData[fieldName as keyof typeof formData], formData)
    },
    [formData, validateField, markFieldTouched],
  )

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const { isValid, errors } = await validateForm(formData)

    if (!isValid) {
      setMessage("Bitte korrigieren Sie die Fehler im Formular")
      setLoading(false)
      return
    }

    console.log("[v0] Registration form submitted")
    console.log("[v0] Email:", formData.email)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          },
        },
      })

      if (error) {
        console.log("[v0] Registration error:", error.message)
        setMessage(`Fehler: ${error.message}`)
      } else {
        console.log("[v0] Registration successful:", data)
        setMessage("Registrierung erfolgreich! Bitte prüfen Sie Ihre E-Mails zur Bestätigung.")
        // Clear form on success
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          confirmPassword: "",
        })
      }
    } catch (error) {
      console.log("[v0] Registration exception:", error)
      setMessage("Ein unerwarteter Fehler ist aufgetreten.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-amber-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Admin Registrierung</CardTitle>
          <CardDescription>Erstellen Sie ein Admin-Konto für das CRM-System</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <FormField
              label="Vorname"
              name="firstName"
              value={formData.firstName}
              onChange={(value) => handleFieldChange("firstName", value)}
              onBlur={() => handleFieldBlur("firstName")}
              error={getFieldError("firstName")}
              placeholder="Max"
              required
              showValidIcon
            />

            <FormField
              label="Nachname"
              name="lastName"
              value={formData.lastName}
              onChange={(value) => handleFieldChange("lastName", value)}
              onBlur={() => handleFieldBlur("lastName")}
              error={getFieldError("lastName")}
              placeholder="Mustermann"
              required
              showValidIcon
            />

            <FormField
              label="E-Mail"
              name="email"
              type="email"
              value={formData.email}
              onChange={(value) => handleFieldChange("email", value)}
              onBlur={() => handleFieldBlur("email")}
              error={getFieldError("email")}
              placeholder="kontakt@suedfruechte-hohenlohe.de"
              required
              showValidIcon
            />

            <FormField
              label="Passwort"
              name="password"
              type="password"
              value={formData.password}
              onChange={(value) => handleFieldChange("password", value)}
              onBlur={() => handleFieldBlur("password")}
              error={getFieldError("password")}
              placeholder="Mindestens 8 Zeichen, Groß-/Kleinbuchstaben und Zahlen"
              required
              showValidIcon
            />

            <FormField
              label="Passwort bestätigen"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(value) => handleFieldChange("confirmPassword", value)}
              onBlur={() => handleFieldBlur("confirmPassword")}
              error={getFieldError("confirmPassword")}
              placeholder="Passwort wiederholen"
              required
              showValidIcon
            />

            {message && (
              <Alert variant={message.includes("erfolgreich") ? "default" : "destructive"}>
                <AlertDescription>
                  {message.includes("erfolgreich") ? (
                    <div className="space-y-2">
                      <p className="font-semibold">{message}</p>
                      <p className="text-sm">
                        Der Bestätigungslink ist <strong>1 Stunde</strong> gültig. Bitte überprüfen Sie auch Ihren
                        Spam-Ordner.
                      </p>
                    </div>
                  ) : (
                    message
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-black" disabled={loading}>
              {loading ? "Registrierung läuft..." : "Registrieren"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Link href="/auth/login" className="inline-flex items-center text-sm text-primary hover:underline">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Zurück zur Anmeldung
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
