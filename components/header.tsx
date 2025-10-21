"use client"

import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { CartHeaderIndicator } from "@/components/cart-header-indicator"

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center justify-center space-x-1 -ml-16">
            <img
              src="/hohenloher-gold-logo.png"
              alt="Hohenloher Gold Logo"
              className="w-45 h-45 rounded-full object-contain"
            />
            <div className="font-serif font-bold text-xl text-foreground text-center">
              <div>Südfrüchte Hohenlohe</div>
            </div>
          </Link>

          <div className="hidden md:flex items-center space-x-8 -mr-4">
            <Link href="/about" className="text-foreground hover:text-primary transition-colors">
              Über uns
            </Link>
            <Link href="/products" className="text-foreground hover:text-primary transition-colors">
              Unsere Produkte
            </Link>
            <Link href="/shop" className="text-foreground hover:text-primary transition-colors">
              Shop
            </Link>
            <Link href="/distributor" className="text-foreground hover:text-primary transition-colors">
              Verteiler werden
            </Link>
            <Link href="/news" className="text-foreground hover:text-primary transition-colors">
              Aktuelles
            </Link>
            <Link href="/contact" className="text-foreground hover:text-primary transition-colors">
              Kontakt
            </Link>

            <CartHeaderIndicator />
          </div>

          <div className="md:hidden flex items-center space-x-2 -mr-4">
            <CartHeaderIndicator />
            <Button variant="ghost" size="sm" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                href="/about"
                className="block px-3 py-2 text-card-foreground hover:text-primary hover:bg-muted rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Über uns
              </Link>
              <Link
                href="/products"
                className="block px-3 py-2 text-card-foreground hover:text-primary hover:bg-muted rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Unsere Produkte
              </Link>
              <Link
                href="/shop"
                className="block px-3 py-2 text-card-foreground hover:text-primary hover:bg-muted rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Shop
              </Link>
              <Link
                href="/distributor"
                className="block px-3 py-2 text-card-foreground hover:text-primary hover:bg-muted rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Verteiler werden
              </Link>
              <Link
                href="/news"
                className="block px-3 py-2 text-card-foreground hover:text-primary hover:bg-muted rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Aktuelles
              </Link>
              <Link
                href="/contact"
                className="block px-3 py-2 text-card-foreground hover:text-primary hover:bg-muted rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Kontakt
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
