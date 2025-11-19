"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, XCircle, Loader2, Users } from 'lucide-react'

export function HelloCashSyncButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleSync = async () => {
    setIsSyncing(true)
    setResult(null)

    try {
      const response = await fetch("/api/admin/hellocash/users/sync-all", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Synchronisation fehlgeschlagen")
      }

      setResult(data)
    } catch (error: any) {
      console.error("[v0] Sync error:", error)
      setResult({
        success: false,
        error: error.message,
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleOpenDialog = () => {
    setIsOpen(true)
    setResult(null)
  }

  return (
    <>
      <Button onClick={handleOpenDialog} variant="outline" size="sm">
        <Users className="h-4 w-4 mr-2" />
        Kunden mit HelloCash synchronisieren
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kunden mit HelloCash synchronisieren</DialogTitle>
            <DialogDescription>
              Alle Kunden ohne HelloCash-ID werden nacheinander in HelloCash angelegt.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!isSyncing && !result && (
              <>
                <Alert>
                  <AlertDescription>
                    Diese Aktion erstellt HelloCash-Kundeneinträge für alle Kunden die noch nicht synchronisiert
                    wurden. Der Vorgang kann einige Minuten dauern.
                  </AlertDescription>
                </Alert>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Abbrechen
                  </Button>
                  <Button onClick={handleSync}>Jetzt synchronisieren</Button>
                </div>
              </>
            )}

            {isSyncing && (
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-2 py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-lg font-medium">Synchronisiere Kunden...</span>
                </div>
                <Alert>
                  <AlertDescription className="text-sm">
                    Bitte warten Sie. Die Kunden werden nacheinander angelegt um Fehler zu vermeiden.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {result.success ? (
                  <>
                    <div className="flex items-center justify-center space-x-2 py-4">
                      <CheckCircle2 className="h-12 w-12 text-green-600" />
                      <div>
                        <div className="text-lg font-semibold">Synchronisation abgeschlossen!</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{result.total}</div>
                        <div className="text-xs text-muted-foreground">Gesamt</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{result.synced}</div>
                        <div className="text-xs text-muted-foreground">Erfolgreich</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{result.errors}</div>
                        <div className="text-xs text-muted-foreground">Fehler</div>
                      </div>
                    </div>

                    {result.errorDetails && result.errorDetails.length > 0 && (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="font-semibold mb-2">Fehler bei folgenden Kunden:</div>
                          <div className="text-xs space-y-1 max-h-40 overflow-y-auto">
                            {result.errorDetails.map((error: string, index: number) => (
                              <div key={index}>{error}</div>
                            ))}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button onClick={() => setIsOpen(false)} className="w-full">
                      Schließen
                    </Button>
                  </>
                ) : (
                  <>
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-semibold">Synchronisation fehlgeschlagen</div>
                        <div className="text-sm mt-1">{result.error}</div>
                      </AlertDescription>
                    </Alert>
                    <Button onClick={() => setIsOpen(false)} className="w-full">
                      Schließen
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
