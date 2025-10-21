"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormField } from "@/components/ui/form-field"
import { useFormValidation } from "@/hooks/use-form-validation"
import { loginSchema } from "@/lib/validation/schemas"

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [rememberUser, setRememberUser] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const { validateField, validateForm, getFieldError, markFieldTouched } = useFormValidation({
    schema: loginSchema,
    mode: "onBlur",
  })

  useEffect(() => {
    const savedEmail = localStorage.getItem("hohenloher_admin_email")
    const savedRemember = localStorage.getItem("hohenloher_admin_remember") === "true"

    if (savedEmail && savedRemember) {
      setFormData((prev) => ({ ...prev, email: savedEmail }))
      setRememberUser(true)
    }
  }, [])

  const handleFieldChange = useCallback((fieldName: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }))
  }, [])

  const handleFieldBlur = useCallback(
    (fieldName: string) => {
      markFieldTouched(fieldName)
      validateField(fieldName, formData[fieldName as keyof typeof formData], formData)
    },
    [formData, validateField, markFieldTouched],
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] Login form submitted")
    setLoading(true)
    setError("")

    const { isValid } = await validateForm(formData)

    if (!isValid) {
      setError("Bitte korrigieren Sie die Eingaben")
      setLoading(false)
      return
    }

    try {
      console.log("[v0] Attempting Supabase login")
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/admin`,
        },
      })

      if (error) {
        console.log("[v0] Supabase login error:", error.message)
        setError("Ungültige E-Mail-Adresse oder Passwort")
      } else {
        console.log("[v0] Supabase login successful")

        if (rememberUser) {
          localStorage.setItem("hohenloher_admin_email", formData.email)
          localStorage.setItem("hohenloher_admin_remember", "true")
        } else {
          localStorage.removeItem("hohenloher_admin_email")
          localStorage.removeItem("hohenloher_admin_remember")
        }

        await new Promise((resolve) => setTimeout(resolve, 1000))
        console.log("[v0] Redirecting to /admin")
        router.push("/admin")
      }
    } catch (err) {
      console.log("[v0] Unexpected error:", err)
      setError("Ein unerwarteter Fehler ist aufgetreten")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-green-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Hohenloher Gold</CardTitle>
          <CardDescription>Melden Sie sich an, um auf das Admin-System zuzugreifen</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <FormField
              label="E-Mail"
              name="email"
              type="email"
              value={formData.email}
              onChange={(value) => handleFieldChange("email", value)}
              onBlur={() => handleFieldBlur("email")}
              error={getFieldError("email")}
              placeholder="ihre@email.de"
              required
              showValidIcon
            />

            <FormField
              label="Passwort"
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(value) => handleFieldChange("password", value)}
              onBlur={() => handleFieldBlur("password")}
              error={getFieldError("password")}
              placeholder="••••••••"
              required
            />

            <div className="flex items-center space-x-2">
              <Checkbox
                id="showPassword"
                checked={showPassword}
                onCheckedChange={(checked) => setShowPassword(checked as boolean)}
              />
              <Label htmlFor="showPassword" className="text-sm font-normal">
                Passwort anzeigen
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberUser}
                onCheckedChange={(checked) => setRememberUser(checked as boolean)}
              />
              <Label htmlFor="remember" className="text-sm font-normal">
                Benutzer merken
              </Label>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-gold-foreground" disabled={loading}>
              {loading ? "Anmelden..." : "Anmelden"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-primary hover:text-primary/80">
              ← Zurück zur Website
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
