import type React from "react"
import { Suspense } from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Lädt...</div>}>{children}</Suspense>
      </main>
    </div>
  )
}
