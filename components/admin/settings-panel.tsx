"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { RefreshCw, Loader2, FileText, AlertCircle, Database, Printer } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { ErrorLogsComponent } from "./error-logs-component"

export function SettingsPanel() {
  const [isRegeneratingQR, setIsRegeneratingQR] = useState(false)
  const [testDataModalOpen, setTestDataModalOpen] = useState(false)
  const [errorLogsModalOpen, setErrorLogsModalOpen] = useState(false)

  const handleRegenerateQRCodes = async () => {
    if (!confirm("QR-Codes für alle Bestellungen ohne gültigen QR-Code nachgenerieren?")) {
      return
    }

    setIsRegeneratingQR(true)
    try {
      const response = await fetch("/api/admin/regenerate-qr-codes", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Regenerierung fehlgeschlagen")
      }

      alert(
        `QR-Code Regenerierung abgeschlossen:\n\n` +
          `Gesamt: ${data.total}\n` +
          `Erfolgreich: ${data.success}\n` +
          `Fehler: ${data.errors}` +
          (data.errorDetails ? `\n\nFehlerdetails:\n${data.errorDetails.join("\n")}` : ""),
      )

      window.location.reload()
    } catch (error: any) {
      console.error("[v0] QR regeneration error:", error)
      alert(`Fehler bei der QR-Code Regenerierung: ${error.message}`)
    } finally {
      setIsRegeneratingQR(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">QR-Code Verwaltung</CardTitle>
          <CardDescription className="text-sm">QR-Codes für Bestellungen verwalten</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Generiert QR-Codes für alle Bestellungen, die noch keinen haben oder deren QR-Code abgelaufen ist. Maximal
              100 Bestellungen pro Durchlauf.
            </p>
            <Button
              onClick={handleRegenerateQRCodes}
              disabled={isRegeneratingQR}
              variant="outline"
              className="w-full bg-transparent"
            >
              {isRegeneratingQR ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  QR-Codes werden generiert...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  QR-Codes nachgenerieren
                </>
              )}
            </Button>
          </div>

          <div className="pt-4 border-t">
            <Link href="/admin/print-qr-codes" target="_blank">
              <Button variant="outline" className="w-full bg-transparent">
                <Printer className="h-4 w-4 mr-2" />
                QR-Codes drucken
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground mt-2">Öffnet eine druckbare Übersicht aller QR-Codes</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Entwickler-Tools</CardTitle>
          <CardDescription className="text-sm">Test-Daten und Fehler-Logs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Dialog open={testDataModalOpen} onOpenChange={setTestDataModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full bg-transparent">
                <Database className="h-4 w-4 mr-2" />
                Test-Daten verwalten
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Test-Daten Verwaltung</DialogTitle>
                <DialogDescription>Verwalten Sie Test-Bestellungen und Test-Kunden</DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Diese Daten werden nicht in Statistiken berücksichtigt</AlertDescription>
                </Alert>
                <iframe
                  src="/admin/test-data"
                  className="w-full h-[60vh] border rounded"
                  title="Test-Daten Verwaltung"
                />
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={errorLogsModalOpen} onOpenChange={setErrorLogsModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full bg-transparent">
                <FileText className="h-4 w-4 mr-2" />
                Fehler-Logs anzeigen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Fehler-Logs & Benachrichtigungen</DialogTitle>
                <DialogDescription>Überwachung von Systemfehlern und ausstehenden Aufgaben</DialogDescription>
              </DialogHeader>
              <ErrorLogsComponent />
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </>
  )
}
