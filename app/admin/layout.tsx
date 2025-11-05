import type React from "react"
import { Suspense } from "react"
import { TestModeToggle } from "@/components/admin/test-mode-toggle"
import Link from "next/link"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/admin" className="text-xl font-bold">
                Admin Dashboard
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/admin" className="text-sm hover:text-primary transition-colors">
                  Dashboard
                </Link>
                <Link href="/admin/test-data" className="text-sm hover:text-primary transition-colors">
                  Test-Daten
                </Link>
                <Link href="/admin/error-logs" className="text-sm hover:text-primary transition-colors">
                  Fehler-Logs
                </Link>
                <Link href="/admin/print-qr-codes" className="text-sm hover:text-primary transition-colors">
                  QR-Codes drucken
                </Link>
              </nav>
            </div>
            <TestModeToggle />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Lädt...</div>}>{children}</Suspense>
      </main>
    </div>
  )
}
