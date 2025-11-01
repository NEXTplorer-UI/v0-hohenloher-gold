import { Suspense } from "react"
import { TestDataManagement } from "@/components/admin/test-data-management"

export const metadata = {
  title: "Test-Daten Verwaltung | Admin",
  description: "Verwalten und löschen Sie Test-Bestellungen und Test-Kunden",
}

export default function TestDataPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Test-Daten Verwaltung</h1>
        <p className="text-muted-foreground">
          Verwalten Sie Test-Bestellungen und Test-Kunden. Diese Daten werden nicht in Statistiken berücksichtigt.
        </p>
      </div>

      <Suspense fallback={<div>Lädt...</div>}>
        <TestDataManagement />
      </Suspense>
    </div>
  )
}
