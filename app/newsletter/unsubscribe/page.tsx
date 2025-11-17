"use client"

import type React from "react"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import Link from "next/link"

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const emailParam = searchParams.get("email")
  const [email, setEmail] = useState(emailParam || "")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleUnsubscribe = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!email) {
      setStatus("error")
      setMessage("Bitte geben Sie Ihre E-Mail-Adresse ein")
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setStatus("error")
      setMessage("Ungültige E-Mail-Adresse. Bitte überprüfen Sie Ihre Eingabe.")
      return
    }

    setStatus("loading")

    try {
      const response = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setStatus("success")
        setMessage(data.message)
      } else {
        setStatus("error")
        setMessage(data.error || "Abmeldung fehlgeschlagen")
      }
    } catch (error) {
      setStatus("error")
      setMessage("Ein Fehler ist aufgetreten")
    }
  }

  useEffect(() => {
    if (emailParam) {
      handleUnsubscribe()
    }
  }, [emailParam])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-amber-50 to-white">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Newsletter-Abmeldung</CardTitle>
          <CardDescription>Südfrüchte Hohenlohe</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "idle" && (
            <>
              <p className="text-muted-foreground mb-4">
                Geben Sie Ihre E-Mail-Adresse ein, um sich vom Newsletter abzumelden.
              </p>
              <form onSubmit={handleUnsubscribe} className="space-y-4">
                <Input
                  type="email"
                  placeholder="ihre@email.de"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="text-center"
                />
                <Button type="submit" className="w-full">
                  Vom Newsletter abmelden
                </Button>
              </form>
            </>
          )}

          {status === "loading" && (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-amber-600 mx-auto" />
              <p className="text-muted-foreground">Ihre Abmeldung wird verarbeitet...</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
              <p className="text-lg font-semibold text-green-700">{message}</p>
              <p className="text-muted-foreground">
                Schade, dass Sie gehen! Sie können sich jederzeit wieder anmelden.
              </p>
              <Button asChild className="mt-4">
                <Link href="/">Zur Startseite</Link>
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-16 w-16 text-red-600 mx-auto" />
              <p className="text-lg font-semibold text-red-700">{message}</p>
              <p className="text-muted-foreground">
                Bitte versuchen Sie es erneut oder kontaktieren Sie uns bei weiteren Problemen.
              </p>
              <Button
                onClick={() => {
                  setStatus("idle")
                  setMessage("")
                }}
                variant="outline"
                className="mt-4"
              >
                Erneut versuchen
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function NewsletterUnsubscribePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UnsubscribeContent />
    </Suspense>
  )
}
