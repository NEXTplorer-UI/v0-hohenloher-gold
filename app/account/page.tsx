"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Package, Euro, MapPin, Calendar, Leaf } from "lucide-react"
import Link from "next/link"

export default function AccountPage() {
  // Mock data - in a real app, this would come from a database
  const user = {
    name: "Max Mustermann",
    email: "max.mustermann@email.de",
    phone: "+49 123 456789",
    isDistributor: true,
  }

  const orders = [
    {
      id: "HG-2024-001",
      date: "2024-11-15",
      status: "Abgeholt",
      total: 89.5,
      items: ["Orangen 7,5kg", "Zitronen 7,5kg", "Mandeln geröstet 500g"],
    },
    {
      id: "HG-2024-002",
      date: "2024-10-20",
      status: "Abgeschlossen",
      total: 156.0,
      items: ["Clementinen 7,5kg", "Olivenöl 3L", "Datteln bio 1kg"],
    },
  ]

  const commissions = [
    {
      month: "November 2024",
      orders: 12,
      commission: 48.5,
      status: "Ausstehend",
    },
    {
      month: "Oktober 2024",
      orders: 8,
      commission: 32.0,
      status: "Ausgezahlt",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <Leaf className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-serif font-bold text-xl text-foreground">Hohenloher Gold</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/shop">
                <Button variant="ghost">Shop</Button>
              </Link>
              <Button variant="outline">Abmelden</Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-3xl text-foreground">Mein Konto</h1>
              <p className="text-muted-foreground">Willkommen zurück, {user.name}!</p>
            </div>
          </div>

          <Tabs defaultValue="orders" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="orders">Bestellungen</TabsTrigger>
              <TabsTrigger value="profile">Profil</TabsTrigger>
              {user.isDistributor && <TabsTrigger value="commissions">Provisionen</TabsTrigger>}
            </TabsList>

            <TabsContent value="orders" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Package className="w-5 h-5" />
                    <span>Meine Bestellungen</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-medium">Bestellung {order.id}</h3>
                            <p className="text-sm text-muted-foreground flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{new Date(order.date).toLocaleDateString("de-DE")}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={order.status === "Abgeholt" ? "default" : "secondary"}>
                              {order.status}
                            </Badge>
                            <p className="font-bold text-primary mt-1">€{order.total.toFixed(2).replace(".", ",")}</p>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">{order.items.join(" • ")}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profile" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Persönliche Daten</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Name</label>
                      <p className="font-medium">{user.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">E-Mail</label>
                      <p className="font-medium">{user.email}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Telefon</label>
                    <p className="font-medium">{user.phone}</p>
                  </div>
                  <Button variant="outline">Daten bearbeiten</Button>
                </CardContent>
              </Card>

              {user.isDistributor && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <MapPin className="w-5 h-5" />
                      <span>Verteiler-Status</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2 mb-4">
                      <Badge className="bg-green-100 text-green-800">Aktiver Verteiler</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Sie sind als Verteiler registriert und erhalten Provisionen für vermittelte Bestellungen.
                    </p>
                    <Link href="/distributor">
                      <Button variant="outline">Verteiler-Programm verwalten</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {user.isDistributor && (
              <TabsContent value="commissions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Euro className="w-5 h-5" />
                      <span>Meine Provisionen</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {commissions.map((commission, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-medium">{commission.month}</h3>
                              <p className="text-sm text-muted-foreground">
                                {commission.orders} vermittelte Bestellungen
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-primary">
                                €{commission.commission.toFixed(2).replace(".", ",")}
                              </p>
                              <Badge variant={commission.status === "Ausgezahlt" ? "default" : "secondary"}>
                                {commission.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  )
}
