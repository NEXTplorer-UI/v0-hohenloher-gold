"use client"

import { useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trash2, AlertTriangle, CheckCircle2, Package, Users } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function TestDataManagement() {
  const { data: stats, mutate } = useSWR("/api/admin/test-data/stats", fetcher)
  const [deleting, setDeleting] = useState(false)
  const [deleteResult, setDeleteResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleDeleteTestData = async () => {
    setDeleting(true)
    setDeleteResult(null)

    try {
      const response = await fetch("/api/admin/test-data", {
        method: "DELETE",
      })

      const result = await response.json()

      if (response.ok) {
        setDeleteResult({
          success: true,
          message: `Erfolgreich gelöscht: ${result.deletedOrders} Bestellungen, ${result.deletedCustomers} Kunden`,
        })
        mutate()
      } else {
        setDeleteResult({
          success: false,
          message: result.error || "Fehler beim Löschen der Test-Daten",
        })
      }
    } catch (error) {
      setDeleteResult({
        success: false,
        message: "Netzwerkfehler beim Löschen der Test-Daten",
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Test-Bestellungen</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.testOrders ?? "..."}</div>
            <p className="text-xs text-muted-foreground">Bestellungen mit TEST-Präfix</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Test-Kunden</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.testCustomers ?? "..."}</div>
            <p className="text-xs text-muted-foreground">Kunden mit Test-Markierung</p>
          </CardContent>
        </Card>
      </div>

      {/* Delete Result Alert */}
      {deleteResult && (
        <Alert variant={deleteResult.success ? "default" : "destructive"}>
          {deleteResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <AlertDescription>{deleteResult.message}</AlertDescription>
        </Alert>
      )}

      {/* Delete Action Card */}
      <Card>
        <CardHeader>
          <CardTitle>Test-Daten löschen</CardTitle>
          <CardDescription>
            Löschen Sie alle Test-Bestellungen und Test-Kunden aus der Datenbank. Diese Aktion kann nicht rückgängig
            gemacht werden.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={deleting || (stats?.testOrders === 0 && stats?.testCustomers === 0)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Alle Test-Daten löschen
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                <AlertDialogDescription>
                  Diese Aktion löscht unwiderruflich:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>{stats?.testOrders ?? 0} Test-Bestellungen</li>
                    <li>{stats?.testCustomers ?? 0} Test-Kunden</li>
                  </ul>
                  <p className="mt-2 font-semibold">Diese Aktion kann nicht rückgängig gemacht werden!</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteTestData}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Ja, alle Test-Daten löschen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Über Test-Daten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Test-Bestellungen</strong> haben Bestellnummern im Format TEST-YYYY-MM-NNNN und werden automatisch
            von allen Statistiken ausgeschlossen.
          </p>
          <p>
            <strong>Test-Modus aktivieren:</strong> Verwenden Sie den Test-Modus-Schalter im Admin-Header, um alle neuen
            Bestellungen automatisch als Test zu markieren.
          </p>
          <p>
            <strong>Produktions-Bestellnummern:</strong> Bleiben fortlaufend ohne Lücken, da Test-Bestellungen eine
            separate Nummerierung verwenden.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
