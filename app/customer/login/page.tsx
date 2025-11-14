"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { getBrowserClient } from "@/lib/supabase/browser"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Mail, Lock, RefreshCw } from "lucide-react"

export default function CustomerLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showResendOption, setShowResendOption] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState("")
  const [resendError, setResendError] = useState("")
  const router = useRouter()
  const supabase = getBrowserClient()

  useEffect(() => {
    const savedEmail = localStorage.getItem("hohenloher_customer_email")
    const savedRemember = localStorage.getItem("hohenloher_customer_remember") === "true"

    if (savedEmail && savedRemember) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setShowResendOption(false)
    setResendSuccess("")
    setResendError("")

    try {
      console.log("[v0] Customer login attempt:", email)

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/customer/dashboard`,
        },
      })

      if (authError) {
        console.log("[v0] Login error:", authError.message)

        if (authError.message.includes("Email not confirmed") || authError.message.includes("not confirmed")) {
          setError("Ihre E-Mail-Adresse wurde noch nicht bestätigt. Bitte überprüfen Sie Ihr Postfach.")
          setShowResendOption(true)
        } else {
          setError("Ungültige E-Mail-Adresse oder Passwort")
        }
      } else {
        console.log("[v0] Login successful")

        if (rememberMe) {
          localStorage.setItem("hohenloher_customer_email", email)
          localStorage.setItem("hohenloher_customer_remember", "true")
        } else {
          localStorage.removeItem("hohenloher_customer_email")
          localStorage.removeItem("hohenloher_customer_remember")
        }

        router.push("/customer/dashboard")
      }
    } catch (err) {
      console.log("[v0] Login exception:", err)
      setError("Ein unerwarteter Fehler ist aufgetreten")
    } finally {
      setLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (!email) {
      setResendError("Bitte geben Sie Ihre E-Mail-Adresse ein")
      return
    }

    setResendLoading(true)
    setResendError("")
    setResendSuccess("")

    try {
      const response = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (!response.ok) {
        setResendError(result.error || "Fehler beim Versenden der E-Mail")
      } else {
        setResendSuccess(result.message)
        setShowResendOption(false)
      }
    } catch (error) {
      console.error("[v0] Error resending confirmation:", error)
      setResendError("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.")
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
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
            <CardTitle className="text-2xl font-bold text-primary">Hohenloher Gold</CardTitle>
            <CardDescription>Melden Sie sich in Ihrem Kundenkonto an</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  E-Mail-Adresse
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="ihre@email.de"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Passwort
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label htmlFor="remember" className="text-sm font-normal">
                    Angemeldet bleiben
                  </Label>
                </div>
                <Link href="/customer/forgot-password" className="text-sm text-primary hover:underline">
                  Passwort vergessen?
                </Link>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {showResendOption && (
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertDescription className="space-y-2">
                    <p className="text-blue-800 text-sm">
                      Der Bestätigungslink ist möglicherweise abgelaufen. Möchten Sie eine neue Bestätigungs-E-Mail
                      erhalten?
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResendConfirmation}
                      disabled={resendLoading}
                      className="w-full gap-2 bg-transparent"
                    >
                      <RefreshCw className={`w-4 h-4 ${resendLoading ? "animate-spin" : ""}`} />
                      {resendLoading ? "Wird gesendet..." : "Bestätigungs-E-Mail erneut senden"}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {resendSuccess && (
                <Alert className="border-green-200 bg-green-50">
                  <AlertDescription className="text-green-800">{resendSuccess}</AlertDescription>
                </Alert>
              )}

              {resendError && (
                <Alert variant="destructive">
                  <AlertDescription>{resendError}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={loading}
              >
                {loading ? "Anmelden..." : "Anmelden"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Noch kein Konto?{" "}
                <Link href="/customer/register" className="text-primary hover:underline font-medium">
                  Jetzt registrieren
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
