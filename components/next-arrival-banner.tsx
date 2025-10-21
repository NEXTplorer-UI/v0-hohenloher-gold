"use client"

import { Button } from "@/components/ui/button"
import { Clock, Download, Calendar } from "lucide-react"
import Link from "next/link"

const NEXT_PICKUP_DATE = "15. Januar 2025"

export function NextArrivalBanner() {
  const downloadCalendarEvent = () => {
    const event = {
      title: "Südfrüchte Ankunft - Hohenloher Gold",
      start: "2025-01-15T10:00:00",
      end: "2025-01-15T18:00:00",
      description: "Frische Südfrüchte zur Abholung im Zentrallager verfügbar",
      location: "Gartenbühlstraße 33 / Setze, 74613 Öhringen",
    }

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Hohenloher Gold//Südfrüchte Termine//DE",
      "BEGIN:VEVENT",
      `DTSTART:${(event.start || "").replace(/[-:]/g, "").replace("T", "T")}Z`,
      `DTEND:${(event.end || "").replace(/[-:]/g, "").replace("T", "T")}Z`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description}`,
      `LOCATION:${event.location}`,
      `UID:suedfruechteankunft-${Date.now()}@hohenloher-gold.de`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n")

    const blob = new Blob([icsContent], { type: "text/calendar" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `suedfruechteankunft-${NEXT_PICKUP_DATE.replace(/\s+/g, "-").toLowerCase()}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <section className="bg-primary text-primary-foreground py-4">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center space-x-4 text-center">
          <Clock className="w-5 h-5" />
          <span className="font-medium">
            Nächste Südfrüchte-Ankunft: <strong>{NEXT_PICKUP_DATE}</strong>
          </span>
          <Link href="/shop#seasonal-overview">
            <Button variant="secondary" size="sm" className="ml-2">
              <Calendar className="w-4 h-4 mr-2" />
              Saisonübersicht
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={downloadCalendarEvent} className="ml-2">
            <Download className="w-4 h-4 mr-2" />
            Termin speichern
          </Button>
        </div>
      </div>
    </section>
  )
}
