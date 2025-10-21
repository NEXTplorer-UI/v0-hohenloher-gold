import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Leaf, Heart, Star, Globe, Shield, Handshake } from "lucide-react"
import Link from "next/link"
import { NextArrivalBanner } from "@/components/next-arrival-banner"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}

      <NextArrivalBanner />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-card to-background py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge variant="secondary" className="w-fit mx-auto">
              Unsere Geschichte
            </Badge>
            <h1 className="font-serif font-bold text-4xl lg:text-6xl text-foreground leading-tight">
              Über <span className="text-primary">Hohenloher Gold</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              Wir verbinden die Tradition der Region Hohenlohe mit der Leidenschaft sizilianischer Bauern. Unser Ziel:
              Ihnen die besten unbehandelten Lebensmittel direkt vom Erzeuger zu bringen.
            </p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="font-serif font-bold text-3xl lg:text-4xl text-foreground">Unsere Mission</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Südfrüchte Hohenlohe entstand aus der Überzeugung, dass gute Lebensmittel mehr sind als nur Nahrung. Sie sind Ausdruck von Kultur, Tradition und menschlichen Beziehungen. Wir arbeiten direkt mit sizilianischen Bauernfamilien zusammen, die seit Generationen ihre Früchte mit Liebe und Respekt vor der Natur anbauen.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Unsere Südfrüchte kommen ohne Umwege zu Ihnen - frisch, unbehandelt und voller natürlicher Aromen.
                Gleichzeitig unterstützen wir regionale Erzeuger in Hohenlohe und schaffen ein Netzwerk des Vertrauens
                zwischen Produzenten und Verbrauchern.
              </p>
            </div>
            <div className="relative">
              <img
                src="/sicilian-farmer-harvesting-oranges-traditional-methods.png"
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-8 hover:shadow-lg transition-shadow">
              <CardContent className="space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Heart className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-serif font-bold text-xl text-card-foreground">Menschliche Beziehungen</h3>
                <p className="text-muted-foreground">
                  Wir pflegen persönliche, vertrauensvolle Beziehungen zu unseren Erzeugern und Kunden. Jeder Kontakt
                  ist geprägt von Respekt und Wertschätzung.
                </p>
              </CardContent>
            </Card>
            <Card className="p-8 hover:shadow-lg transition-shadow">
              <CardContent className="space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-serif font-bold text-xl text-card-foreground">Schutz der Bauern</h3>
                <p className="text-muted-foreground">
                  Faire Preise und langfristige Partnerschaften sichern den sizilianischen Bauernfamilien eine
                  nachhaltige Existenz und Zukunft.
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
                  Umweltschonende Anbaumethoden und der Verzicht auf chemische Behandlungen schützen die sizilianische
                  Landschaft für kommende Generationen.
                </p>
              </CardContent>
            </Card>
            <Card className="p-8 hover:shadow-lg transition-shadow">
              <CardContent className="space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Star className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-serif font-bold text-xl text-card-foreground">Unbehandelte Qualität</h3>
                <p className="text-muted-foreground">
                  Unsere Produkte sind naturbelassen und unbehandelt - Top-Qualität ohne den Zwang teurer Zertifizierungen, aber mit der gleichen Sorgfalt.
                </p>
              </CardContent>
            </Card>
            <Card className="p-8 hover:shadow-lg transition-shadow">
              <CardContent className="space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Globe className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-serif font-bold text-xl text-card-foreground">Regionale Verbundenheit</h3>
                <p className="text-muted-foreground">
                  Wir fördern sowohl sizilianische Traditionen als auch die Kultur der Region Hohenlohe und schaffen
                  Brücken zwischen beiden Welten.
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
                  Vollständige Nachverfolgbarkeit ist unser Standard.
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
            <h2 className="font-serif font-bold text-3xl lg:text-4xl text-foreground">Unser Netzwerk</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Menschen, die unsere Vision teilen und täglich dafür arbeiten
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h3 className="font-serif font-bold text-2xl text-foreground">Sizilianische Partner</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {"Zwei Brüder vereint durch die Leidenschaft für die Landwirtschaft\nBenedetto ist 41 Jahre alt und Michele ist 43 Jahre alt, von denen die Hälfte zwischen Feldern, Zitrusplantagen und Olivenbäumen verbracht wurden. Ein besonderer Weg, dass sich von Ihrem Alter unterscheidet. Sie haben immer Erde und Orangen den Büchern vorgezogen, und anstatt den Stift zu benutzen, haben sie sich immer die Hände mit Traktoren und Hacke schmutzig gemacht. Genau das hat Sie dazu gebracht, sich einzubringen und bei der Firma zu arbeiten die sie gegründet haben."}
              </p>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-foreground">Familie Benedetto - Zitrusfrüchte in Deutschland seit 2006 </span>
                </div>
                
                
              </div>
            </div>
            <div className="relative">
              <img
                src="/sicilian-family-farm-traditional-citrus-grove.png"
                alt="Sizilianische Familienfarm"
                className="rounded-lg shadow-xl w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="font-serif font-bold text-3xl lg:text-4xl">Werden Sie Teil unserer Geschichte</h2>
            <p className="text-lg opacity-90">
              Entdecken Sie unsere Produkte und erleben Sie den Unterschied, den echte Qualität und menschliche
              Beziehungen machen können.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button variant="secondary" size="lg" className="text-lg px-8">
                <Link href="/shop">Jetzt einkaufen</Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary bg-transparent"
              >
                <Link href="/distributor">Verteiler werden</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
