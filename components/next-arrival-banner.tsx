"use client"

import { Button } from "@/components/ui/button"
import { Clock, Calendar } from "lucide-react"
import Link from "next/link"
import { useDeliverySchedulesSWR } from "@/hooks/use-delivery-schedules-swr"

export function NextArrivalBanner() {
  const { schedules, isLoading, getNextDelivery } = useDeliverySchedulesSWR()
  const nextDelivery = getNextDelivery()

  if (isLoading) {
    return (
      <section className="bg-primary text-primary-foreground py-4">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center space-x-4 text-center">
            <Clock className="w-5 h-5 animate-pulse" />
            <span className="font-medium">Lade Liefertermine...</span>
          </div>
        </div>
      </section>
    )
  }

  if (!nextDelivery) {
    return (
      <section className="bg-primary text-primary-foreground py-4">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center space-x-4 text-center">
            <Clock className="w-5 h-5" />
            <span className="font-medium">Aktuell keine Liefertermine geplant</span>
            <Link href="/shop#seasonal-overview">
              <Button variant="secondary" size="sm" className="ml-2">
                <Calendar className="w-4 h-4 mr-2" />
                Saisonübersicht
              </Button>
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const formattedDate = new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(nextDelivery.delivery_date))

  return (
    <section className="bg-primary text-primary-foreground py-4">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center space-x-4 text-center flex-wrap gap-2">
          <Clock className="w-5 h-5" />
          <span className="font-medium">
            Nächste Ankunft: <strong>{formattedDate}</strong>
          </span>
          <Link href="/shop#seasonal-overview">
            <Button variant="secondary" size="sm" className="ml-2">
              <Calendar className="w-4 h-4 mr-2" />
              Saisonübersicht
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
