"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import Image from "next/image"

export function WelcomePopup() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Check if user has seen the popup before
    const hasSeenPopup = localStorage.getItem("welcome-popup-seen")

    if (!hasSeenPopup) {
      // Small delay for better UX
      setTimeout(() => {
        setIsOpen(true)
      }, 500)
    }
  }, [])

  const handleClose = () => {
    setIsOpen(false)
    localStorage.setItem("welcome-popup-seen", "true")
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground bg-background/80 backdrop-blur-sm p-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Schließen</span>
        </button>

        {/* Image - full width, scaled to fit */}
        <div className="relative w-full h-64 sm:h-80 bg-muted">
          <Image
            src="/images/design-mode/orangensonnenuntergang.jpg"
            alt="Orangen bei Sonnenuntergang"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-primary text-center">
            Willkommen bei Südfrüchte Hohenlohe
          </h2>

          <DialogDescription className="space-y-3 text-base leading-relaxed text-foreground">
            <p>
              Allem Anfang wohnt ein Zauber inne...
              <br />
              Und vielleicht auch der ein oder andere kleine Stolperstein.
            </p>

            <p>Auch bei uns in Hohenlohe weht nun ein frischer digitaler Wind 🌬️🍊</p>

            <p>
              Unsere neue Website ist frisch online – wir bitten um Verständnis, falls noch nicht alles perfekt läuft.
            </p>

            <p>
              Wir freuen uns über Rückmeldung jeglicher Art an unsere E-Mail-Adresse{" "}
              <a href="mailto:kontakt@suedfruechte-hohenlohe.de" className="text-primary hover:underline font-medium">
                kontakt@suedfruechte-hohenlohe.de
              </a>
            </p>

            <p>Schön, dass Sie da sind!</p>

            <p>Genießen Sie den Besuch und lassen Sie sich von der Sonne des Südens verzaubern ☀️</p>
          </DialogDescription>

          {/* Button with gold color */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={handleClose}
              size="lg"
              className="bg-[#F59E0B] hover:bg-[#D97706] text-white font-semibold px-8"
            >
              Jetzt erkunden →
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
