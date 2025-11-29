"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { getBrowserClient } from "@/lib/supabase/browser"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Mail, AlertCircle } from "lucide-react"
import Link from "next/link"
import { FormField } from "@/components/ui/form-field"
import { useFormValidation } from "@/hooks/use-form-validation"
import { registrationSchema } from "@/lib/validation/schemas"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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
  const [errorDetails, setErrorDetails] = useState<{
    emailConfirmed?: boolean
    email?: string
  } | null>(null)
  const [resendingEmail, setResendingEmail] = useState(false)
  const supabase = getBrowserClient()

  const { validateField, validateForm, getFieldError, markFieldTouched } = useFormValidation({
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

  const handleResendConfirmation = async () => {
    if (!errorDetails?.email) return

    setResendingEmail(true)
    try {
      const response = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: errorDetails.email }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage(
          "Bestätigungs-E-Mail wurde erneut versendet. Bitte überprüfen Sie Ihr Postfach und Ihren Spam-Ordner.",
        )
        setErrorDetails(null)
      } else {
        setMessage(`Fehler: ${data.error}`)
      }
    } catch (error) {
      setMessage("Fehler beim Versenden der E-Mail. Bitte versuchen Sie es später erneut.")
    } finally {
      setResendingEmail(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")
    setErrorDetails(null)

    const { isValid } = await validateForm(formData)

    if (!isValid) {
      setMessage("Bitte korrigieren Sie die Fehler im Formular.")
      setLoading(false)
      return
    }

    console.log("[v0] Registration form submitted")

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
        console.log("[v0] Registration error:", error)

        let userMessage = "Ein Fehler ist aufgetreten."

        if (error.message.includes("already registered") || error.message.includes("already exists")) {
          userMessage = "Diese E-Mail-Adresse ist bereits registriert."
          setErrorDetails({ emailConfirmed: true, email: formData.email })
        } else if (error.message.includes("password")) {
          userMessage = "Das Passwort muss mindestens 8 Zeichen lang sein und Buchstaben sowie Zahlen enthalten."
        } else if (error.message.includes("email")) {
          userMessage = "Bitte geben Sie eine gültige E-Mail-Adresse ein."
        } else if (error.message.includes("rate limit") || error.status === 429) {
          userMessage = "Zu viele Versuche. Bitte warten Sie 60 Sekunden und versuchen Sie es erneut."
        } else {
          userMessage = `Fehler: ${error.message}`
        }

        setMessage(userMessage)
      } else if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
        console.log("[v0] User exists but email not confirmed")
        setMessage("Ein Konto mit dieser E-Mail-Adresse existiert bereits, aber die E-Mail wurde noch nicht bestätigt.")
        setErrorDetails({ emailConfirmed: false, email: formData.email })
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
      setMessage("Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.")
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
                {message.includes("erfolgreich") ? <Mail className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{message.includes("erfolgreich") ? "Erfolgreich!" : "Fehler"}</AlertTitle>
                <AlertDescription>
                  {message.includes("erfolgreich") ? (
                    <div className="space-y-2">
                      <p>{message}</p>
                      <p className="text-sm">
                        Der Bestätigungslink ist <strong>1 Stunde</strong> gültig. Bitte überprüfen Sie auch Ihren
                        Spam-Ordner.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p>{message}</p>

                      {/* Show resend button if email not confirmed */}
                      {errorDetails?.emailConfirmed === false && (
                        <div className="flex flex-col gap-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleResendConfirmation}
                            disabled={resendingEmail}
                            className="w-full bg-transparent"
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            {resendingEmail ? "Wird gesendet..." : "Bestätigungs-E-Mail erneut senden"}
                          </Button>
                          <p className="text-xs text-muted-foreground">Tipp: Überprüfen Sie auch Ihren Spam-Ordner</p>
                        </div>
                      )}

                      {/* Show forgot password link if email is confirmed */}
                      {errorDetails?.emailConfirmed === true && (
                        <div className="pt-2">
                          <Link href="/auth/forgot-password">
                            <Button type="button" variant="outline" size="sm" className="w-full bg-transparent">
                              Passwort vergessen?
                            </Button>
                          </Link>
                          <p className="text-xs text-muted-foreground mt-2">
                            Oder{" "}
                            <Link href="/auth/login" className="underline">
                              hier anmelden
                            </Link>
                          </p>
                        </div>
                      )}
                    </div>
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
