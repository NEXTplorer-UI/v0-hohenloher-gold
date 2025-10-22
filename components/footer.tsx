import Link from "next/link"
import { CookieSettingsLink } from "@/components/cookie-consent"

export function Footer() {
  return (
    <footer className="bg-sidebar border-t border-sidebar-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center space-x-2">
              <img
                src="/hohenloher-gold-logo-original.png"
                alt="Hohenloher Gold Logo"
                className="w-10 h-10 rounded-full"
              />
              <span className="font-serif font-bold text-lg text-sidebar-foreground">{"Hohenloher Gold"}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Natürliche Qualität aus Hohenlohe und frische Südfrüchte direkt aus Sizilien.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-sidebar-foreground">Navigation</h4>
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
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-sidebar-foreground">Service</h4>
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
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-sidebar-foreground">Kontakt</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Gerlinde Fink</p>
              <p>Weststraße 28</p>
              <p> 74629 Pfedelbach </p>
              <p>kontakt@suedfruechte-hohenlohe.de</p>
            </div>
          </div>
        </div>
        <div className="border-t border-sidebar-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6 mb-4">
            <Link href="/privacy" className="hover:text-sidebar-primary transition-colors">
              Datenschutz
            </Link>
            <CookieSettingsLink />
            <Link href="/impressum" className="hover:text-sidebar-primary transition-colors">
              Impressum
            </Link>
          </div>
          <p>&copy; 2024 Hohenloher Gold. Alle Rechte vorbehalten.</p>
        </div>
      </div>
    </footer>
  )
}
