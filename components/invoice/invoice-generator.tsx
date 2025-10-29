"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, FileText, Receipt } from "lucide-react"

interface InvoiceData {
  invoiceNumber: string
  date: string
  dueDate: string
  customer: {
    name: string
    email: string
    address: string
    city: string
    postalCode: string
  }
  items: Array<{
    name: string
    quantity: number
    price: number
    total: number
  }>
  subtotal: number
  tax: number
  total: number
  paymentMethod: string
}

interface InvoiceGeneratorProps {
  orderData: InvoiceData
  type: "invoice" | "receipt"
}

export function InvoiceGenerator({ orderData, type }: InvoiceGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const generatePDF = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderData, type }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${type}-${orderData.invoiceNumber}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error("Error generating PDF:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          {type === "invoice" ? <FileText className="h-5 w-5" /> : <Receipt className="h-5 w-5" />}
          {type === "invoice" ? "Rechnung" : "Quittung"} #{orderData.invoiceNumber}
        </CardTitle>
        <Button onClick={generatePDF} disabled={isGenerating} className="gap-2">
          <Download className="h-4 w-4" />
          {isGenerating ? "Generiere..." : "PDF Download"}
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Company Header */}
        <div className="flex justify-between items-start border-b pb-6">
          <div>
            <h1 className="text-2xl font-bold text-primary">Hohenloher Gold</h1>
            <p className="text-sm text-muted-foreground mt-1">Südfrüchte Hohenlohe</p>
            <div className="text-sm text-muted-foreground mt-2">
              <p>Gerlinde Fink</p>
              <p>Weststraße 28</p>
              <p>74629 Pfedelbach</p>
              <p>Telefon: 0157 357 038 64</p>
              <p>E-Mail: suedfruechte-hohenlohe@outlook.de</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              {type === "invoice" ? "Rechnungsdatum:" : "Quittungsdatum:"} {orderData.date}
            </p>
            {type === "invoice" && (
              <p className="text-sm text-muted-foreground">Fälligkeitsdatum: {orderData.dueDate}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">Ust-Id.-Nr.: DE 244 622 911</p>
          </div>
        </div>

        {/* Customer Information */}
        <div>
          <h3 className="font-semibold mb-2">{type === "invoice" ? "Rechnungsadresse:" : "Kunde:"}</h3>
          <div className="text-sm">
            <p>{orderData.customer.name}</p>
            <p>{orderData.customer.address}</p>
            <p>
              {orderData.customer.postalCode} {orderData.customer.city}
            </p>
            <p>{orderData.customer.email}</p>
          </div>
        </div>

        {/* Items Table */}
        <div>
          <h3 className="font-semibold mb-4">Bestellpositionen:</h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Artikel</th>
                  <th className="text-right p-3 font-medium">Menge</th>
                  <th className="text-right p-3 font-medium">Einzelpreis</th>
                  <th className="text-right p-3 font-medium">Gesamt</th>
                </tr>
              </thead>
              <tbody>
                {orderData.items.map((item, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-3">{item.name}</td>
                    <td className="text-right p-3">{item.quantity}</td>
                    <td className="text-right p-3">{item.price.toFixed(2)} €</td>
                    <td className="text-right p-3">{item.total.toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between">
              <span>Zwischensumme:</span>
              <span>{orderData.subtotal.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between">
              <span>MwSt. (7%):</span>
              <span>{orderData.tax.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Gesamtsumme:</span>
              <span>{orderData.total.toFixed(2)} €</span>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">Zahlungsinformationen:</h3>
          <p className="text-sm">Zahlungsart: {orderData.paymentMethod}</p>
          {type === "invoice" && (
            <div className="text-sm mt-2">
              <p>Bankverbindung:</p>
              <p>Sparkasse Hohenlohe</p>
              <p>IBAN: DE35 6225 1550 1000 5154 15</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-xs text-muted-foreground border-t pt-4">
          <p>Vielen Dank für Ihr Vertrauen in Hohenloher Gold!</p>
          <p className="mt-2">Diese {type === "invoice" ? "Rechnung" : "Quittung"} wurde automatisch generiert.</p>
        </div>
      </CardContent>
    </Card>
  )
}
