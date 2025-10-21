"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Mail } from "lucide-react"

export default function TestEmailPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const sendTestEmail = async () => {
    if (!email) {
      setResult({ success: false, message: "Bitte geben Sie eine E-Mail-Adresse ein" })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to: email }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: data.message })
      } else {
        setResult({ success: false, message: data.error || "Unbekannter Fehler" })
      }
    } catch (error) {
      setResult({ success: false, message: "Netzwerkfehler beim Senden der E-Mail" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4">
      <div className="max-w-2xl mx-auto pt-20">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-600 to-orange-600 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">E-Mail Test</CardTitle>
            <CardDescription>Testen Sie die Resend API-Integration mit der neuen Sender-Adresse</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Test-E-Mail-Adresse
              </label>
              <Input
                id="email"
                type="email"
                placeholder="ihre.email@beispiel.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <Button
              onClick={sendTestEmail}
              disabled={loading || !email}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
            >
              {loading ? "Sende Test-E-Mail..." : "Test-E-Mail senden"}
            </Button>

            {result && (
              <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                    {result.message}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <h3 className="font-semibold text-amber-800 mb-2">Konfiguration:</h3>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>
                  <strong>Sender:</strong> kontakt@suedfruechte-hohenlohe.de
                </li>
                <li>
                  <strong>Service:</strong> Resend API
                </li>
                <li>
                  <strong>Domain:</strong> suedfruechte-hohenlohe.de (muss in Resend verifiziert sein)
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
