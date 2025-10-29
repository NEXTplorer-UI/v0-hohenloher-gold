import type React from "react"
import type { Metadata } from "next"
import { Space_Grotesk, DM_Sans } from "next/font/google"
import "./globals.css"
import { CartProvider } from "@/contexts/cart-context"
import { PricingProvider } from "@/components/pricing-context"
import { AdminProvider } from "@/contexts/admin-context"
import { ProductsProvider } from "@/contexts/products-context"
import { CookieConsent } from "@/components/cookie-consent"
import { Toaster } from "@/components/ui/toaster"
import { Footer } from "@/components/footer"
import { ScrollToTop } from "@/components/scroll-to-top"
import { Header } from "@/components/header"
import { ErrorBoundary } from "@/components/error-boundary"
import Script from "next/script"
import { SWRConfig } from "swr"
import { swrConfig } from "@/lib/api/swr-config"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
})

export const metadata: Metadata = {
  title: "Hohenloher Gold - Regionale Lebensmittel & Sizilianische Südfrüchte",
  description:
    "Hochwertige, unbehandelte Lebensmittel aus Hohenlohe und frische Südfrüchte direkt aus Sizilien. Qualität, Nachhaltigkeit und menschliche Beziehungen stehen im Mittelpunkt.",
  icons: {
    icon: [
      {
        url: "/favicon-16x16.jpg",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/favicon-32x32.jpg",
        sizes: "32x32",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/apple-touch-icon.jpg",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  keywords: [
    "Hohenloher Gold",
    "regionale Lebensmittel",
    "sizilianische Südfrüchte",
    "Bio Lebensmittel",
    "nachhaltige Ernährung",
    "Hohenlohe",
    "Sizilien",
    "Orangen",
    "Zitronen",
    "Mandarinen",
    "Trockenfrüchte",
    "Nüsse",
    "Apfelsaft",
    "Direktvermarkter",
  ],
  authors: [{ name: "Hohenloher Gold" }],
  creator: "Hohenloher Gold",
  publisher: "Hohenloher Gold",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://hohenloher-gold.de"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Hohenloher Gold - Regionale Lebensmittel & Sizilianische Südfrüchte",
    description: "Hochwertige, unbehandelte Lebensmittel aus Hohenlohe und frische Südfrüchte direkt aus Sizilien.",
    url: "https://hohenloher-gold.de",
    siteName: "Hohenloher Gold",
    images: [
      {
        url: process.env.NEXT_PUBLIC_LOGO_URL || "/placeholder.svg?height=630&width=1200",
        width: 1200,
        height: 630,
        alt: "Hohenloher Gold Logo",
      },
    ],
    locale: "de_DE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hohenloher Gold - Regionale Lebensmittel & Sizilianische Südfrüchte",
    description: "Hochwertige, unbehandelte Lebensmittel aus Hohenlohe und frische Südfrüchte direkt aus Sizilien.",
    images: [process.env.NEXT_PUBLIC_LOGO_URL || "/placeholder.svg?height=630&width=1200"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de" className={`${spaceGrotesk.variable} ${dmSans.variable} antialiased`}>
      <body className="font-sans">
        <Script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Hohenloher Gold",
              description:
                "Hochwertige, unbehandelte Lebensmittel aus Hohenlohe und frische Südfrüchte direkt aus Sizilien",
              url: "https://hohenloher-gold.de",
              logo: process.env.NEXT_PUBLIC_LOGO_URL || "https://hohenloher-gold.de/placeholder.svg",
              contactPoint: {
                "@type": "ContactPoint",
                telephone: "+49-xxx-xxxxxxx",
                contactType: "customer service",
                availableLanguage: "German",
              },
              address: {
                "@type": "PostalAddress",
                addressCountry: "DE",
                addressRegion: "Baden-Württemberg",
                addressLocality: "Hohenlohe",
              },
              sameAs: ["https://www.facebook.com/hohenloher-gold", "https://www.instagram.com/hohenloher-gold"],
            }),
          }}
        />
        <Script
          id="cookie-manager-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Check if analytics consent is given
                const consent = localStorage.getItem('cookie-consent');
                if (consent) {
                  try {
                    const preferences = JSON.parse(consent);
                    // Only load analytics if consent is given
                    if (preferences.analytics && !window.va) {
                      // Vercel Analytics will be loaded here when implemented
                      // const script = document.createElement('script');
                      // script.src = '/_vercel/insights/script.js';
                      // script.defer = true;
                      // document.head.appendChild(script);
                    }
                  } catch (e) {
                    console.error('Failed to parse cookie consent', e);
                  }
                }
              })();
            `,
          }}
        />
        <SWRConfig value={swrConfig}>
          <CartProvider>
            <PricingProvider>
              <AdminProvider>
                <ProductsProvider>
                  <ScrollToTop />
                  <Header />
                  <ErrorBoundary>{children}</ErrorBoundary>
                  <Footer />
                  <CookieConsent />
                  <Toaster />
                </ProductsProvider>
              </AdminProvider>
            </PricingProvider>
          </CartProvider>
        </SWRConfig>
      </body>
    </html>
  )
}
