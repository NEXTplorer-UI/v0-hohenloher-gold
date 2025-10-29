"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Leaf, Heart, Users, ArrowRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import dynamic from "next/dynamic"
import { NextArrivalBanner } from "@/components/next-arrival-banner"
import { WelcomePopup } from "@/components/welcome-popup"

const LazyCard = dynamic(() => import("@/components/ui/card").then((mod) => ({ default: mod.Card })), {
  loading: () => <div className="animate-pulse bg-muted rounded-lg h-48" />,
})

export default function ClientPage() {
  return (
    <div className="min-h-screen bg-background">
      <WelcomePopup />

      <NextArrivalBanner />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-card to-background py-16 sm:py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-6 lg:space-y-8">
              <div className="space-y-4">
                <Badge variant="secondary" className="w-fit">
                  Frisch aus Sizilien
                </Badge>
                <h1 className="font-serif font-bold text-3xl sm:text-4xl lg:text-6xl text-foreground leading-tight">
                  Natürliche Qualität in <span className="text-primary">Hohenlohe</span>
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                  Entdecken Sie möglichst unbehandelte Lebensmittel und frische Südfrüchte direkt vom Erzeuger.
                  Qualität, Nachhaltigkeit und menschliche Beziehungen stehen bei uns im Mittelpunkt.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/shop">
                  <Button
                    variant="default"
                    size="lg"
                    className="w-full sm:w-auto text-lg px-8 bg-gold hover:bg-gold/90 text-gold-foreground"
                  >
                    Jetzt einkaufen
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/about">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto text-lg px-8 bg-transparent hover:bg-gold/10 hover:text-gold hover:border-gold"
                  >
                    Mehr erfahren
                  </Button>
                </Link>
              </div>
              <div className="flex flex-col xs:flex-row items-start xs:items-center space-y-3 xs:space-y-0 xs:space-x-6 pt-4">
                <div className="flex items-center space-x-2"></div>
                <div className="flex items-center space-x-2"></div>
              </div>
            </div>
            <div className="relative order-first lg:order-last">
              <Image
                src="/images/design-mode/Orangenplantage_fertig.jpg"
                alt="Frische sizilianische Orangen und Zitronen in rustikalen Holzkisten - Hohenloher Gold Südfrüchte"
                width={600}
                height={400}
                className="rounded-lg shadow-2xl w-full h-auto"
                itemProp="image"
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 sm:py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-12 sm:mb-16">
            <h2 className="font-serif font-bold text-2xl sm:text-3xl lg:text-4xl text-foreground">Unsere Werte</h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Was uns antreibt und warum wir für beste Qualität arbeiten
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <Card className="text-center p-6 sm:p-8 hover:shadow-lg transition-shadow">
              <CardContent className="space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Heart className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-serif font-bold text-xl text-foreground"> Beziehung</h3>
                <p className="text-muted-foreground">
                  Wir pflegen direkte, vertrauensvolle Beziehungen zu unseren Erzeugern und Kunden.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center p-6 sm:p-8 hover:shadow-lg transition-shadow">
              <CardContent className="space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Leaf className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-serif font-bold text-xl text-foreground">Zukunftsbejahend</h3>
                <p className="text-muted-foreground">
                  Faire Bedingungen für Bauern in Sizilien und Lebensmittel in ihrer reinsten Form zu erhalten stehen im
                  Fokus.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center p-6 sm:p-8 hover:shadow-lg transition-shadow">
              <CardContent className="space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-serif font-bold text-xl text-foreground">Qualität</h3>
                <p className="text-muted-foreground">
                  Möglichst unbehandelte, naturbelassene Lebensmittel in Top-Qualität ohne Zertifizierungszwang.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Product Highlight */}
      <section className="py-16 sm:py-20 bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="order-last lg:order-first">
              <Image
                src="/images/design-mode/Zitronensonne.jpg"
                alt="Sizilianische Zitrusfrüchte - Orangen und Zitronen in rustikaler Holzschale, unbehandelt und bio"
                width={600}
                height={400}
                className="rounded-lg shadow-xl w-full h-auto"
                loading="lazy"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
            <div className="space-y-6">
              <div className="space-y-4">
                <Badge variant="outline" className="w-fit">
                  Südfrüchte Hohenlohe
                </Badge>
                <h2 className="font-serif font-bold text-2xl sm:text-3xl lg:text-4xl text-card-foreground">
                  Frische Südfrüchte direkt aus Ribera
                </h2>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                  Unsere Südfrüchte kommen direkt von sizilianischen Bauern zu Ihnen. Unbehandelt und voller natürlicher
                  Aromen - so wie die Natur sie geschaffen hat.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-card-foreground">Direkt vom Erzeuger</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-card-foreground">Unbehandelt und natürlich</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-card-foreground">Frisch und aromatisch</span>
                </div>
              </div>
              <Link href="/products">
                <Button size="lg" className="mt-6">
                  Südfrüchte entdecken
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="font-serif font-bold text-2xl sm:text-3xl lg:text-4xl">
              Bringen Sie die Ribera Orangen auch in Ihre Region{" "}
            </h2>
            <p className="text-base sm:text-lg opacity-90">
              Entdecken Sie unsere dezentrale Verteilung und werden Sie selbst Verteiler. Gemeinsam bringen wir die
              Sonne Siziliens in Ihre Region.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/distributor#application-form">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto text-lg px-8">
                  Verteiler werden
                </Button>
              </Link>
              <Link href="/distributor">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-lg px-8 border-primary-foreground text-primary-foreground hover:bg-gold hover:text-gold-foreground hover:border-gold bg-transparent"
                >
                  Mehr erfahren
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
