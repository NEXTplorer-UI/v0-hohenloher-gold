"use client"

import { Button } from "@/components/ui/button"
import { Menu, X } from 'lucide-react'
import Link from "next/link"
import { useState } from "react"
import { CartHeaderIndicator } from "@/components/cart-header-indicator"
import { CartSidebarMobile } from "@/components/cart-sidebar-mobile"
import { UserAccountDropdown } from "@/components/user-account-dropdown"

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="mx-auto">
        
        {/* Mobile layout (< md) */}
        <div className="flex md:hidden items-center h-16 relative">
          <div className="flex-1 flex justify-center">
            <Link href="/" className="font-serif font-bold text-xl text-foreground text-center">
              Südfrüchte Hohenlohe
            </Link>
          </div>

          <div className="flex items-center space-x-2 ml-auto pr-4">
            <UserAccountDropdown />
            <CartSidebarMobile />
            <Button variant="ghost" size="sm" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
              {isMobileMenuOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
            </Button>
          </div>
        </div>

        {/* Tablet layout (md-lg): Two rows */}
        <div className="hidden md:block lg:hidden">
          {/* First row: Logo + Brand (centered) + Icons */}
          <div className="flex items-center justify-between h-16 px-4 relative">
            <Link href="/" className="flex items-center space-x-1">
              <img
                src="/hohenloher-gold-logo.png"
                alt="Hohenloher Gold Logo"
                className="w-48 h-48 rounded-full object-contain"
              />
            </Link>
            
            <div className="absolute left-1/2 -translate-x-1/2">
              <span className="font-serif font-bold text-xl text-foreground whitespace-nowrap">
                Südfrüchte Hohenlohe
              </span>
            </div>
            
            {/* Icons on the right */}
            <div className="flex items-center space-x-2">
              <UserAccountDropdown />
              <CartHeaderIndicator />
            </div>
          </div>
          
          {/* Second row: Centered navigation */}
          <div className="flex items-center justify-center space-x-6 py-3 border-t border-border/50">
            <Link href="/about" className="text-foreground hover:text-primary transition-colors text-base">
              Über uns
            </Link>
            <Link href="/products" className="text-foreground hover:text-primary transition-colors text-base">
              Unsere Produkte
            </Link>
            <Link href="/shop" className="text-foreground hover:text-primary transition-colors text-base">
              Shop
            </Link>
            <Link href="/distributor" className="text-foreground hover:text-primary transition-colors text-base">
              Verteiler werden
            </Link>
            <Link href="/news" className="text-foreground hover:text-primary transition-colors text-base">
              Aktuelles
            </Link>
            <Link href="/contact" className="text-foreground hover:text-primary transition-colors text-base">
              Kontakt
            </Link>
          </div>
        </div>

        {/* Desktop layout (lg+): Single row */}
        <div className="hidden lg:flex items-center h-16">
          <div className="flex items-center space-x-1">
            <Link href="/" className="flex items-center space-x-1">
              <img
                src="/hohenloher-gold-logo.png"
                alt="Hohenloher Gold Logo"
                className="w-48 h-48 rounded-full object-contain"
              />
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center space-x-6">
            <Link href="/about" className="text-foreground hover:text-primary transition-colors text-lg">
              Über uns
            </Link>
            <Link href="/products" className="text-foreground hover:text-primary transition-colors text-lg">
              Unsere Produkte
            </Link>
            <Link href="/shop" className="text-foreground hover:text-primary transition-colors text-lg">
              Shop
            </Link>
            <Link href="/distributor" className="text-foreground hover:text-primary transition-colors text-lg">
              Verteiler werden
            </Link>
            <Link href="/news" className="text-foreground hover:text-primary transition-colors text-lg">
              Aktuelles
            </Link>
            <Link href="/contact" className="text-foreground hover:text-primary transition-colors text-lg">
              Kontakt
            </Link>
          </div>

          <div className="flex items-center space-x-2 pr-8">
            <UserAccountDropdown />
            <CartHeaderIndicator />
          </div>
        </div>

        {/* Mobile Menu */}
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
