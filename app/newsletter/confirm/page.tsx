"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import Link from "next/link"

function ConfirmContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const confirmSubscription = async () => {
      if (!token) {
        setStatus("error")
        setMessage("Ungültiger Bestätigungslink")
        return
      }

      try {
        const response = await fetch("/api/newsletter/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })

        const data = await response.json()

        if (response.ok && data.success) {
          setStatus("success")
          setMessage(data.message)
        } else {
          setStatus("error")
          setMessage(data.error || "Bestätigung fehlgeschlagen")
        }
      } catch (error) {
        setStatus("error")
        setMessage("Ein Fehler ist aufgetreten")
      }
    }

    confirmSubscription()
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-amber-50 to-white">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Newsletter-Bestätigung</CardTitle>
          <CardDescription>Hohenloher Gold</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-amber-600 mx-auto" />
              <p className="text-muted-foreground">Ihre Anmeldung wird bestätigt...</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
              <p className="text-lg font-semibold text-green-700">{message}</p>
              <p className="text-muted-foreground">
                Sie erhalten ab sofort unsere Newsletter mit Informationen zu neuen Produkten und Angeboten.
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
              <Button asChild variant="outline" className="mt-4 bg-transparent">
                <Link href="/">Zur Startseite</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function NewsletterConfirmPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfirmContent />
    </Suspense>
  )
}
