import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsTrigger, TabsList } from "@/components/ui/tabs"
import { Leaf, MapPin, Award, Heart, Truck, Sun } from "lucide-react"
import Link from "next/link"
import { NextArrivalBanner } from "@/components/next-arrival-banner"

const products = {
  suedfruechteFrisch: [
    {
      id: 1,
      name: "Sizilianische Orangen",
      description: "Saftige, unbehandelte Orangen direkt aus Sizilien. Voller Vitamin C und natürlicher Süße.",
      price: "4,50",
      unit: "kg",
      image: "/sicilian-oranges-fresh-organic.png",
      origin: "Sizilien",
      category: "Frische Südfrüchte",
      inStock: true,
      featured: true,
    },
    {
      id: 2,
      name: "Bio Zitronen",
      description: "Aromatische Zitronen mit intensivem Duft. Perfekt für Küche und natürliche Heilmittel.",
      price: "5,20",
      unit: "kg",
      image: "/sicilian-lemons-organic-fresh.png",
      origin: "Sizilien",
      category: "Frische Südfrüchte",
      inStock: true,
      featured: false,
    },
    {
      id: 3,
      name: "Mandarinen",
      description: "Süße, kernlose Mandarinen. Ideal als gesunder Snack für die ganze Familie.",
      price: "3,80",
      unit: "kg",
      image: "/sicilian-mandarins-sweet-organic.png",
      origin: "Sizilien",
      category: "Frische Südfrüchte",
      inStock: true,
      featured: false,
    },
  ],
  trockenfruechtе: [
    {
      id: 4,
      name: "Getrocknete Feigen",
      description: "Sonnengetrocknete Feigen ohne Zusatzstoffe. Reich an Ballaststoffen und natürlicher Süße.",
      price: "8,90",
      unit: "500g",
      image: "/dried-figs-organic-natural.png",
      origin: "Sizilien",
      category: "Trockenfrüchte",
      inStock: true,
      featured: true,
    },
    {
      id: 5,
      name: "Mandeln geröstet",
      description: "Schonend geröstete Mandeln aus sizilianischem Anbau. Perfekt als Snack oder zum Backen.",
      price: "12,50",
      unit: "500g",
      image: "/roasted-almonds-sicilian-organic.png",
      origin: "Sizilien",
      category: "Trockenfrüchte",
      inStock: true,
      featured: false,
    },
    {
      id: 6,
      name: "Rosinen",
      description: "Süße, kernlose Rosinen aus traditionellem Anbau. Ideal für Müsli und Backwaren.",
      price: "6,70",
      unit: "500g",
      image: "/organic-raisins-traditional.png",
      origin: "Sizilien",
      category: "Trockenfrüchte",
      inStock: false,
      featured: false,
    },
  ],
  regional: [
    {
      id: 7,
      name: "Hohenloher Apfelsaft",
      description: "Naturtrüber Apfelsaft aus Streuobstwiesen der Region. Ohne Zusätze und Konservierungsstoffe.",
      price: "3,20",
      unit: "1L",
      image: "/hohenlohe-apple-juice-natural.png",
      origin: "Hohenlohe",
      category: "Regionale Spezialitäten",
      inStock: true,
      featured: true,
    },
    {
      id: 8,
      name: "Wildblütenhonig",
      description: "Cremiger Honig von Hohenloher Imkern. Aus nachhaltiger Bienenhaltung.",
      price: "9,50",
      unit: "500g",
      image: "/hohenlohe-wildflower-honey.png",
      origin: "Hohenlohe",
      category: "Regionale Spezialitäten",
      inStock: true,
      featured: false,
    },
    {
      id: 9,
      name: "Dinkelmehl Type 630",
      description: "Frisch gemahlenes Dinkelmehl aus regionalem Anbau. Ideal für Brot und Gebäck.",
      price: "2,80",
      unit: "1kg",
      image: "/spelt-flour-regional-organic.png",
      origin: "Hohenlohe",
      category: "Regionale Spezialitäten",
      inStock: true,
      featured: false,
    },
  ],
  oele: [
    {
      id: 10,
      name: "Olivenöl aus Sizilien",
      description: "Natives Olivenöl extra von jahrhundertealten Olivenbäumen und kalt gepresst.",
      price: "15,00",
      unit: "500ml",
      image: "/sicilian-olive-oil.png",
      origin: "Sizilien",
      category: "Öle",
      inStock: true,
      featured: true,
    },
    {
      id: 11,
      name: "Sonnenblumenöl",
      description: "Kaltgepresstes Sonnenblumenöl mit nussigem Geschmack.",
      price: "10,00",
      unit: "500ml",
      image: "/sunflower-seed-oil.png",
      origin: "Hohenlohe",
      category: "Öle",
      inStock: true,
      featured: false,
    },
    {
      id: 12,
      name: "Rapsöl",
      description: "Kaltgepresstes Rapsöl reich an Omega-3-Fettsäuren.",
      price: "11,00",
      unit: "500ml",
      image: "/rapeseed-oil.png",
      origin: "Hohenlohe",
      category: "Öle",
      inStock: true,
      featured: false,
    },
    {
      id: 13,
      name: "Walnussöl",
      description: "Kaltgepresstes Walnussöl für Salate und Desserts.",
      price: "14,00",
      unit: "500ml",
      image: "/walnut-oil.png",
      origin: "Hohenlohe",
      category: "Öle",
      inStock: true,
      featured: false,
    },
  ],
}

const allProducts = [
  ...products.suedfruechteFrisch,
  ...products.trockenfruechtе,
  ...products.regional,
  ...products.oele,
]

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-background">
      <NextArrivalBanner />

      {/* Header */}
      <section className="bg-card py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4">
            <h1 className="font-serif font-bold text-4xl lg:text-5xl text-card-foreground">Unsere Produkte</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Erfahren Sie mehr über die Herkunft und Qualität unserer sorgfältig ausgewählten Lebensmittel
            </p>
            <div className="mt-8 pt-6 border-t border-border">
              <h2 className="font-serif font-semibold text-2xl text-primary mb-4">Nicht bio, sondern natürlich</h2>
              <p className="text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Viele unserer kleinen Partnerbauern können sich die aufwendigen Bio-Zertifizierungen und das teure
                Bio-Siegel nicht leisten. Dennoch bauen sie ihre Produkte nach höchsten natürlichen Standards an - ohne
                Pestizide, ohne chemische Zusätze und mit traditionellen Methoden, die seit Generationen weitergegeben
                werden. Für uns zählt die Qualität und Natürlichkeit, nicht das Siegel.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Product Categories */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="suedfruechtе" className="w-full">
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 gap-6 mb-12 h-auto bg-transparent p-0">
              <TabsTrigger
                value="suedfruechtе"
                className="h-auto p-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <Card className="w-full transition-all duration-200 hover:shadow-lg data-[state=active]:ring-2 data-[state=active]:ring-primary">
                  <div className="relative h-96 overflow-hidden rounded-t-lg">
                    <img
                      src="/images/design-mode/S%C3%BCdfrucht.jpg"
                      alt="Frische Südfrüchte"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-70" />
                    <div className="absolute bottom-2 left-2 text-white">
                      <Sun className="w-5 h-5" />
                    </div>
                  </div>
                  <CardContent className="p-4 text-center">
                    <h3 className="font-serif font-semibold text-lg mb-1">Südfrüchte</h3>
                    <p className="text-sm text-muted-foreground">Frisch aus Sizilien</p>
                  </CardContent>
                </Card>
              </TabsTrigger>

              <TabsTrigger
                value="trocken"
                className="h-auto p-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <Card className="w-full transition-all duration-200 hover:shadow-lg data-[state=active]:ring-2 data-[state=active]:ring-primary">
                  <div className="relative h-96 overflow-hidden rounded-t-lg">
                    <img
                      src="/dried-figs-organic-natural.png"
                      alt="Trockenfrüchte"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-2 left-2 text-white">
                      <Leaf className="w-5 h-5" />
                    </div>
                  </div>
                  <CardContent className="p-4 text-center">
                    <h3 className="font-serif font-semibold text-lg mb-1">Trockenfrüchte</h3>
                    <p className="text-sm text-muted-foreground">Sonnengetrocknet</p>
                  </CardContent>
                </Card>
              </TabsTrigger>

              <TabsTrigger
                value="oele"
                className="h-auto p-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <Card className="w-full transition-all duration-200 hover:shadow-lg data-[state=active]:ring-2 data-[state=active]:ring-primary">
                  <div className="relative h-96 overflow-hidden rounded-t-lg">
                    <img
                      src="/images/design-mode/Oliven%C3%B6l%20Glas.jpg"
                      alt="Kaltgepresste Öle"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-70" />
                    <div className="absolute bottom-2 left-2 text-white">
                      <Award className="w-5 h-5" />
                    </div>
                  </div>
                  <CardContent className="p-4 text-center">
                    <h3 className="font-serif font-semibold text-lg mb-1">Öle</h3>
                    <p className="text-sm text-muted-foreground">Kaltgepresst</p>
                  </CardContent>
                </Card>
              </TabsTrigger>
            </TabsList>

            {/* Fresh Südfrüchte */}
            <TabsContent value="suedfruechtе">
              <div className="space-y-12">
                <div className="text-center space-y-4">
                  <h2 className="font-serif font-bold text-3xl text-foreground">Frische Südfrüchte aus Sizilien</h2>
                  <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                    Unsere Südfrüchte kommen direkt von unseren Partnerfamilien in Sizilien und werden ohne chemische
                    Behandlung angebaut.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <Card className="p-6">
                    <CardHeader className="pb-4">
                      <div className="flex items-center space-x-3">
                        <MapPin className="w-6 h-6 text-primary" />
                        <CardTitle className="text-xl font-serif">Herkunft & Anbau</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-4">
                      <p className="text-muted-foreground">
                        Unsere Orangen, Zitronen und Mandarinen wachsen in den fruchtbaren Böden Siziliens, wo das
                        mediterrane Klima und die vulkanische Erde ideale Bedingungen schaffen.
                      </p>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>• Traditioneller Anbau ohne Pestizide</li>
                        <li>• Handverlesene Ernte zum optimalen Reifegrad</li>
                        <li>• Direkte Partnerschaft mit Familienbetrieben</li>
                        <li>• Transport innerhalb von 48 Stunden nach Ernte</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="p-6">
                    <CardHeader className="pb-4">
                      <div className="flex items-center space-x-3">
                        <Award className="w-6 h-6 text-primary" />
                        <CardTitle className="text-xl font-serif">Qualität & Frische</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-4">
                      <p className="text-muted-foreground">
                        Jede Frucht wird sorgfältig ausgewählt und schonend transportiert, um die natürlichen Aromen und
                        Nährstoffe zu bewahren.
                      </p>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>• Unbehandelte Schalen, essbar und aromatisch</li>
                        <li>• Hoher Vitamin C-Gehalt durch sonnige Reifung</li>
                        <li>• Keine Wachsbehandlung oder Konservierungsstoffe</li>
                        <li>• Regelmäßige Qualitätskontrollen</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-card p-8 rounded-lg">
                  <div className="flex items-center space-x-3 mb-4">
                    <Heart className="w-6 h-6 text-primary" />
                    <h3 className="font-serif font-bold text-xl">Unsere Philosophie</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Wir glauben an ehrliche Lebensmittel und faire Partnerschaften. Unsere sizilianischen Bauern
                    erhalten faire Preise für ihre Arbeit, während Sie als Kunde die bestmögliche Qualität erhalten.
                    Diese Win-Win-Situation ermöglicht es uns, nachhaltige Beziehungen aufzubauen und die Tradition des
                    naturnahen Anbaus zu unterstützen.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Trockenfrüchte */}
            <TabsContent value="trocken">
              <div className="space-y-12">
                <div className="text-center space-y-4">
                  <h2 className="font-serif font-bold text-3xl text-foreground">Natürlich getrocknete Früchte</h2>
                  <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                    Unsere Trockenfrüchte werden ausschließlich durch Sonnentrocknung haltbar gemacht - ohne
                    Zusatzstoffe oder Schwefel.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <Card className="p-6">
                    <CardHeader className="pb-4">
                      <div className="flex items-center space-x-3">
                        <Sun className="w-6 h-6 text-primary" />
                        <CardTitle className="text-xl font-serif">Traditionelle Trocknung</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-4">
                      <p className="text-muted-foreground">
                        Die jahrhundertealte Tradition der Sonnentrocknung bewahrt nicht nur die Nährstoffe, sondern
                        intensiviert auch den natürlichen Geschmack der Früchte.
                      </p>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>• Ausschließlich Sonnentrocknung, keine Öfen</li>
                        <li>• Langsamer Trocknungsprozess für optimalen Geschmack</li>
                        <li>• Erhaltung aller natürlichen Enzyme</li>
                        <li>• Keine Schwefelung oder chemische Behandlung</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="p-6">
                    <CardHeader className="pb-4">
                      <div className="flex items-center space-x-3">
                        <Award className="w-6 h-6 text-primary" />
                        <CardTitle className="text-xl font-serif">Nährstoffe & Geschmack</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-4">
                      <p className="text-muted-foreground">
                        Durch die schonende Trocknung bleiben Vitamine, Mineralien und der intensive, natürliche
                        Geschmack vollständig erhalten.
                      </p>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>• Reich an Ballaststoffen und Antioxidantien</li>
                        <li>• Konzentrierte natürliche Süße</li>
                        <li>• Lange Haltbarkeit ohne Konservierungsstoffe</li>
                        <li>• Idealer Energielieferant für Sportler</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-card p-8 rounded-lg">
                  <div className="flex items-center space-x-3 mb-4">
                    <Leaf className="w-6 h-6 text-primary" />
                    <h3 className="font-serif font-bold text-xl">Sortiment</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Unser Trockenfrüchte-Sortiment umfasst klassische sizilianische Spezialitäten wie getrocknete
                    Feigen, Mandeln und Rosinen. Jede Frucht wird zum optimalen Reifegrad geerntet und anschließend
                    sorgfältig in der sizilianischen Sonne getrocknet.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Perfekt als gesunder Snack, für Müsli und Joghurt oder zum Backen - unsere Trockenfrüchte bringen
                    mediterranes Flair in Ihre Küche.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Öle */}
            <TabsContent value="oele">
              <div className="space-y-12">
                <div className="text-center space-y-4">
                  <h2 className="font-serif font-bold text-3xl text-foreground">Kaltgepresste Öle</h2>
                  <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                    Unsere Öle werden ausschließlich kalt gepresst und stammen von ausgewählten Produzenten aus Sizilien
                    und Hohenlohe.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <Card className="p-6">
                    <CardHeader className="pb-4">
                      <div className="flex items-center space-x-3">
                        <Award className="w-6 h-6 text-primary" />
                        <CardTitle className="text-xl font-serif">Olivenöl aus Sizilien</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-4">
                      <p className="text-muted-foreground">
                        Unser natives Olivenöl extra stammt von jahrhundertealten Olivenbäumen und wird innerhalb von 24
                        Stunden nach der Ernte kalt gepresst.
                      </p>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>• Erste Kaltpressung unter 27°C</li>
                        <li>• Säuregehalt unter 0,3%</li>
                        <li>• Fruchtiges Aroma mit leichter Schärfe</li>
                        <li>• Reich an Polyphenolen und Vitamin E</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="p-6">
                    <CardHeader className="pb-4">
                      <div className="flex items-center space-x-3">
                        <Leaf className="w-6 h-6 text-primary" />
                        <CardTitle className="text-xl font-serif">Regionale Spezialitäten</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-4">
                      <p className="text-muted-foreground">
                        Aus Hohenlohe bieten wir kaltgepresste Öle aus Sonnenblumen, Raps und Walnüssen - alle aus
                        kontrolliert biologischem Anbau.
                      </p>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>• Sonnenblumenöl mit nussigem Geschmack</li>
                        <li>• Rapsöl reich an Omega-3-Fettsäuren</li>
                        <li>• Walnussöl für Salate und Desserts</li>
                        <li>• Alle Öle ungefiltert und naturbelassen</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-card p-8 rounded-lg">
                  <div className="flex items-center space-x-3 mb-4">
                    <Truck className="w-6 h-6 text-primary" />
                    <h3 className="font-serif font-bold text-xl">Lagerung & Transport</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Alle unsere Öle werden lichtgeschützt in dunklen Glasflaschen abgefüllt und bei konstanter
                    Temperatur gelagert. Der Transport erfolgt schonend, um die wertvollen Inhaltsstoffe zu bewahren.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Für die optimale Qualität empfehlen wir, die Öle kühl und dunkel zu lagern und innerhalb von 18
                    Monaten nach Abfüllung zu verbrauchen.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="font-serif font-bold text-3xl lg:text-4xl">Bereit zum Einkaufen?</h2>
            <p className="text-lg opacity-90">
              Entdecken Sie unser komplettes Sortiment in unserem Online-Shop und bestellen Sie direkt.
            </p>
            <Button variant="secondary" size="lg" className="text-lg px-8" asChild>
              <Link href="/shop">Zum Shop</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
