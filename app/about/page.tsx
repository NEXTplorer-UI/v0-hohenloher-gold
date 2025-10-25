import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Leaf, Heart, Star, Handshake } from "lucide-react"
import Link from "next/link"
import { NextArrivalBanner } from "@/components/next-arrival-banner"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <NextArrivalBanner />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-card to-background py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge variant="secondary" className="w-fit mx-auto">
              Unsere Geschichte
            </Badge>
            <h1 className="font-serif font-bold text-4xl lg:text-6xl text-foreground leading-tight">
              Über <span className="text-primary">Südfrüchte Hohenlohe</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              Wir verbinden die Tradition der Region Hohenlohe mit der Leidenschaft sizilianischer Bauern. Unser Ziel:
              Ihnen die besten Lebensmittel direkt vom Erzeuger zu bieten.
            </p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="font-serif font-bold text-3xl lg:text-4xl text-foreground">Unsere Geschichte</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                2004 besuchte ich eine liebe Freundin auf Mallorca. Sie führte mich ins Hinterland, wo ich eine
                wunderschöne und fruchtbare Landschaft erleben durfte. Mit sonnengereiften Zitrusfrüchten, die ein so
                intensives Aroma hatten, wie ich es bis dato noch nie geschmeckt hatte.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Auf dieser Reise wurde ich ebenfalls Zeuge der schockierenden Erntevernichtung von Früchten. Mein Herz
                schmerzte beim Anblick von Baggern, die auf den sonnigen Hügeln umher fuhren und Tonnen von leuchtenden
                Orangen verbuddelten. Dieses Bild brannte sich unwiderruflich in meine Seele ein.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Nach zwei schlaflosen Urlaubsnächten tauchte auf einmal die Frage in mir auf, wie ich diese wunderbaren
                Früchte wohl nach Deutschland bringen könnte?! Keine Ahnung. Jedenfalls flog ich mit 50kg Zitrusfrüchten
                im Gepäck von diesem Urlaub zurück nach Hause.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Ich war bereits kurz vor dem Aufgeben als eines Nachmittags eine Freundin mit einer großen, braunen
                Papiertüte auf dem Arm hereinspaziert kam. Sie hielt mir eine leuchtende Zitrusfrucht vor die Nase mit
                den Worten: "Probier bitte! Nicht aus Mallorca, sondern aus Sizilien. Gleiches Problem, wird ebenfalls
                vernichtet. Die hier schmecken sogar noch besser und die Logistik steht schon durch eine
                deutsch-sizilianische Partnerschaft." Und so kam die Sonne Riberas nach Hohenlohe.
              </p>
            </div>
            <div className="relative">
              <img
                src="/images/design-mode/%C3%9Cberr%20uns.jpg"
                alt="Sizilianischer Bauer bei der Ernte"
                className="rounded-lg shadow-2xl w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="font-serif font-bold text-3xl lg:text-4xl text-card-foreground">Unsere Werte</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Diese Prinzipien leiten uns in allem, was wir tun
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto relative">
            <Card className="p-8 hover:shadow-lg transition-shadow">
              <CardContent className="space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Heart className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-serif font-bold text-xl text-card-foreground">Menschliche Beziehungen</h3>
                <p className="text-muted-foreground">
                  Wir pflegen persönliche, vertrauensvolle Beziehungen zu unseren Erzeugern und Kunden.
                </p>
              </CardContent>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow">
              <CardContent className="space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Leaf className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-serif font-bold text-xl text-card-foreground">Naturschutz</h3>
                <p className="text-muted-foreground">
                  Umweltschonende Anbaumethoden schützen die sizilianische Landschaft auch für kommende Generationen.
                </p>
              </CardContent>
            </Card>

            <div className="md:col-span-2 flex justify-center items-center py-8">
              <div className="relative w-full max-w-md">
                <img
                  src="/sizilianische-zitrusfruechte-orangen-zitronen.jpg"
                  alt="Sizilianische Zitrusfrüchte"
                  className="rounded-lg shadow-xl w-full h-auto"
                />
              </div>
            </div>

            <Card className="p-8 hover:shadow-lg transition-shadow">
              <CardContent className="space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Star className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-serif font-bold text-xl text-card-foreground">Unbehandelte Qualität</h3>
                <p className="text-muted-foreground">
                  Unsere Produkte sind naturbelassen und unbehandelt - Top-Qualität, top Geschmack, echter Genuss
                </p>
              </CardContent>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow">
              <CardContent className="space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Handshake className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-serif font-bold text-xl text-card-foreground">Transparenz</h3>
                <p className="text-muted-foreground">
                  Wir zeigen Ihnen, woher Ihre Lebensmittel kommen, wer sie anbaut und wie sie zu Ihnen gelangen.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="font-serif font-bold text-3xl lg:text-4xl text-foreground">Die Heimat der Südfrüchte</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Unsere Partner in Sizilien</p>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h3 className="font-serif font-bold text-2xl text-foreground">Sizilianische Partner</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Zwei Brüder verbunden durch familiäre Bande und durch ihre Leidenschaft für die Landwirtschaft.
                Benedetto 41 und Michele 43 Jahre jung, haben die Hälfte ihre Lebens zwischen Orangen und
                Zitronenplantagen und Olivenheinen vebracht. Sie lieben ihre Arbeit und wir genießen die Früchte davon.
              </p>
            </div>
            <div className="relative">
              <img
                src="/images/design-mode/Benedettos.jpg"
                alt="Sizilianische Bauern"
                className="rounded-lg shadow-2xl w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="font-serif font-bold text-3xl lg:text-4xl">Bereit für echten Geschmack?</h2>
            <p className="text-xl opacity-90">Entdecken Sie unsere Auswahl an frischen Produkten.</p>
            <Link href="/products">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Zum Shop
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
