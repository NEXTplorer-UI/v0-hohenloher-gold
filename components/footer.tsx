"use client"

import type React from "react"

import Link from "next/link"
import { CookieSettingsLink } from "@/components/cookie-consent"
import { ChevronDown } from "lucide-react"
import { useState } from "react"

function FooterSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-sidebar-border lg:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-4 lg:cursor-default lg:pointer-events-none"
      >
        <h4 className="font-semibold text-sidebar-foreground">{title}</h4>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground transition-transform lg:hidden ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      <div className={`pb-4 lg:pb-0 ${isOpen ? "block" : "hidden"} lg:block`}>{children}</div>
    </div>
  )
}

export function Footer() {
  return (
    <footer className="bg-sidebar border-t border-sidebar-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 lg:gap-8">
          <div className="space-y-3 pb-6 lg:pb-0">
            <div className="flex items-center space-x-2">
              <img
                src="/hohenloher-gold-logo-original.png"
                alt="Hohenloher Gold Logo"
                className="w-10 h-10 rounded-full"
              />
              <span className="font-serif font-bold text-lg text-sidebar-foreground">Hohenloher Gold</span>
            </div>
            <p className="text-sm text-muted-foreground">ursprünglich, echt, gesellig</p>
          </div>

          <FooterSection title="Navigation">
            <div className="space-y-2 text-sm">
              <Link href="/about" className="block text-muted-foreground hover:text-sidebar-primary transition-colors">
                Über uns
              </Link>
              <Link
                href="/products"
                className="block text-muted-foreground hover:text-sidebar-primary transition-colors"
              >
                Unsere Produkte
              </Link>
              <Link href="/shop" className="block text-muted-foreground hover:text-sidebar-primary transition-colors">
                Shop
              </Link>
              <Link href="/news" className="block text-muted-foreground hover:text-sidebar-primary transition-colors">
                Aktuelles
              </Link>
            </div>
          </FooterSection>

          <FooterSection title="Service">
            <div className="space-y-2 text-sm">
              <Link
                href="/distributor"
                className="block text-muted-foreground hover:text-sidebar-primary transition-colors"
              >
                Verteiler werden
              </Link>
              <Link
                href="/contact"
                className="block text-muted-foreground hover:text-sidebar-primary transition-colors"
              >
                Kontakt
              </Link>
            </div>
          </FooterSection>

          <FooterSection title="Kontakt">
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Gerlinde Fink</p>
              <p>Weststraße 28</p>
              <p>74629 Pfedelbach</p>
              <p className="break-all">kontakt@suedfruechte-hohenlohe.de</p>
            </div>
          </FooterSection>
        </div>

        <div className="border-t border-sidebar-border mt-6 lg:mt-8 pt-6 lg:pt-8 text-center text-sm text-muted-foreground">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-row sm:items-center sm:justify-center sm:space-x-6 sm:gap-0 mb-4">
            <Link href="/agb" className="hover:text-sidebar-primary transition-colors text-left sm:text-center">
              AGB
            </Link>
            <Link href="/widerruf" className="hover:text-sidebar-primary transition-colors text-left sm:text-center">
              Widerrufsbelehrung
            </Link>
            <Link href="/privacy" className="hover:text-sidebar-primary transition-colors text-left sm:text-center">
              Datenschutz
            </Link>
            <Link
              href="/cookie-policy"
              className="hover:text-sidebar-primary transition-colors text-left sm:text-center"
            >
              Cookie-Richtlinie
            </Link>
            <CookieSettingsLink />
            <Link href="/impressum" className="hover:text-sidebar-primary transition-colors text-left sm:text-center">
              Impressum
            </Link>
          </div>
          <p className="text-xs sm:text-sm">&copy; 2025 Hohenloher Gold. Alle Rechte vorbehalten.</p>
        </div>
      </div>
    </footer>
  )
}
