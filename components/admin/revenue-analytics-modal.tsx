"use client"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { TrendingUp, TrendingDown, Download, Euro, ShoppingCart } from "lucide-react"

interface RevenueData {
  monthlyRevenue: Array<{
    month: string
    revenue: number
    orderCount: number
  }>
  yearlyRevenue: Array<{
    year: string
    revenue: number
    orderCount: number
  }>
  topProducts: Array<{
    name: string
    revenue: number
    quantity: number
  }>
  trends: {
    monthlyGrowth: number
    yearlyGrowth: number
  }
  totalRevenue: number
  totalOrders: number
}

interface RevenueAnalyticsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC658",
  "#FF7C7C",
  "#8DD1E1",
  "#D084D0",
]

export default function RevenueAnalyticsModal({ open, onOpenChange }: RevenueAnalyticsModalProps) {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchRevenueData = async () => {
    setLoading(true)
    try {
      console.log("[v0] Fetching revenue data from /api/analytics/revenue-details")
      const response = await fetch("/api/analytics/revenue-details")
      console.log("[v0] Revenue data response status:", response.status)

      if (response.ok) {
        const revenueData = await response.json()
        console.log("[v0] Revenue data fetched successfully:", revenueData)
        setData(revenueData)
      } else {
        const errorText = await response.text()
        console.error("[v0] Failed to fetch revenue data. Status:", response.status, "Error:", errorText)
      }
    } catch (error) {
      console.error("[v0] Error fetching revenue data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchRevenueData()
    }
  }, [open])

  const exportData = () => {
    if (!data) return

    const csvContent = [
      ["Monat", "Umsatz", "Bestellungen"],
      ...data.monthlyRevenue.map((item) => [item.month, item.revenue.toString(), item.orderCount.toString()]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "umsatz-analyse.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(value)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] h-[95vh] max-w-none max-h-none overflow-y-auto p-6"
        style={{
          width: "95vw",
          height: "95vh",
          maxWidth: "none",
          maxHeight: "none",
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Euro className="h-5 w-5" />
            Umsatz-Analyse
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Lade Umsatzdaten...</span>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gesamtumsatz</CardTitle>
                  <Euro className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(data.totalRevenue)}</div>
                  <p className="text-xs text-muted-foreground">Alle Bestellungen</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monatswachstum</CardTitle>
                  {data.trends.monthlyGrowth >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data.trends.monthlyGrowth >= 0 ? "+" : ""}
                    {data.trends.monthlyGrowth.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">Zum Vormonat</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Jahreswachstum</CardTitle>
                  {data.trends.yearlyGrowth >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data.trends.yearlyGrowth >= 0 ? "+" : ""}
                    {data.trends.yearlyGrowth.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">Zum Vorjahr</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gesamtbestellungen</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.totalOrders}</div>
                  <p className="text-xs text-muted-foreground">Alle Bestellungen</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="monthly" className="space-y-4">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="monthly">Monatlich</TabsTrigger>
                  <TabsTrigger value="yearly">Jährlich</TabsTrigger>
                  <TabsTrigger value="products">Top Produkte</TabsTrigger>
                </TabsList>
                <Button onClick={exportData} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  CSV Export
                </Button>
              </div>

              <TabsContent value="monthly" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Monatlicher Umsatzverlauf</CardTitle>
                    <CardDescription>Umsatz der letzten 12 Monate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={data.monthlyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value) => `€${value}`} />
                        <Tooltip
                          formatter={(value: number) => [formatCurrency(value), "Umsatz"]}
                          labelFormatter={(label) => `Monat: ${label}`}
                        />
                        <Bar dataKey="revenue" fill="#0088FE" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Bestellungen pro Monat</CardTitle>
                    <CardDescription>Anzahl der Bestellungen der letzten 12 Monate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={data.monthlyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number) => [value, "Bestellungen"]}
                          labelFormatter={(label) => `Monat: ${label}`}
                        />
                        <Line type="monotone" dataKey="orderCount" stroke="#00C49F" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="yearly" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Jährlicher Umsatzverlauf</CardTitle>
                    <CardDescription>Umsatz der letzten Jahre</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={data.yearlyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis tickFormatter={(value) => `€${value}`} />
                        <Tooltip
                          formatter={(value: number) => [formatCurrency(value), "Umsatz"]}
                          labelFormatter={(label) => `Jahr: ${label}`}
                        />
                        <Bar dataKey="revenue" fill="#FFBB28" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="products" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Top 10 Produkte nach Umsatz</CardTitle>
                      <CardDescription>Umsatzstärkste Produkte</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {data.topProducts.slice(0, 10).map((product, index) => (
                          <div key={product.name} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Badge variant="secondary">#{index + 1}</Badge>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-muted-foreground">{product.quantity} verkauft</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{formatCurrency(product.revenue)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Umsatzverteilung</CardTitle>
                      <CardDescription>Top 10 Produkte nach Umsatzanteil</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                          <Pie
                            data={data.topProducts.slice(0, 10)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="revenue"
                          >
                            {data.topProducts.slice(0, 10).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center p-8">
            <p>Keine Umsatzdaten verfügbar</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
