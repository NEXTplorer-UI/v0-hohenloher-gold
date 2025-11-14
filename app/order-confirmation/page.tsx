"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle, Download, MapPin, Truck, Clock, Mail, MessageSquare, Send } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { calculatePaymentDeadline } from "@/lib/format-time"

function downloadCalendarEvent(pickupDate: string, orderNumber: string) {
  if (!pickupDate || typeof pickupDate !== "string" || pickupDate.trim() === "") {
    console.error("Invalid pickup date:", pickupDate)
    return
  }

  // Create a proper date parsing for German format "15. Dezember 2024"
  const monthNames: { [key: string]: number } = {
    Januar: 0,
    Februar: 1,
    März: 2,
    April: 3,
    Mai: 4,
    Juni: 5,
    Juli: 6,
    August: 7,
    September: 8,
    Oktober: 9,
    November: 10,
    Dezember: 11,
  }

  // Parse German date format "15. Dezember 2024"
  const dateMatch =
    pickupDate && typeof pickupDate === "string" ? pickupDate.match(/(\d{1,2})\.\s*(\w+)\s*(\d{4})/) : null
  if (!dateMatch) {
    console.error("Invalid date format:", pickupDate)
    return
  }

  const day = Number.parseInt(dateMatch[1])
  const monthName = dateMatch[2]
  const year = Number.parseInt(dateMatch[3])
  const month = monthNames[monthName]

  if (month === undefined) {
    console.error("Unknown month name:", monthName)
    return
  }

  // Create date with proper parsing - set to 10:00 AM
  const startDate = new Date(year, month, day, 10, 0, 0)
  const endDate = new Date(year, month, day, 12, 0, 0) // 2 hours later

  // Validate dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    console.error("Invalid date created from:", pickupDate)
    return
  }

  // Format dates for ICS format (YYYYMMDDTHHMMSSZ)
  const formatICSDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    const seconds = String(date.getSeconds()).padStart(2, "0")
    return `${year}${month}${day}T${hours}${minutes}${seconds}`
  }

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hohenloher Gold//Order Pickup//DE",
    "BEGIN:VEVENT",
    `UID:pickup-${orderNumber}@hohenloher-gold.de`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:Hohenloher Gold Abholung - Bestellung ${orderNumber}`,
    "DESCRIPTION:Abholung Ihrer Bestellung bei Hohenloher Gold\\n\\nBestellnummer: " +
      orderNumber +
      "\\n\\nKontakt: 0157 357 038 64",
    "LOCATION:Abholort wird noch bekannt gegeben",
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Erinnerung: Hohenloher Gold Abholung in 1 Stunde",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")

  // Create and download the file
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `hohenloher-gold-abholung-${orderNumber}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

function OrderConfirmationContent() {
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get("orderNumber") || "HG-2024-001"
  const deliveryMethod = searchParams.get("deliveryMethod") || "pickup"
  const paymentMethod = searchParams.get("paymentMethod") || "transfer"
  const total = searchParams.get("total") || "0"
  const customerName = searchParams.get("customerName") || "Kunde"

  const [orderDetails, setOrderDetails] = useState<any>(null)
  const [orderTime, setOrderTime] = useState<string>("")
  const [paymentDeadline, setPaymentDeadline] = useState<string>("")
  const [feedback, setFeedback] = useState("")
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const response = await fetch(`/api/orders/${orderNumber}`)
        if (response.ok) {
          const data = await response.json()

          console.log("[v0] Order confirmation: Full order data:", data.order)
          console.log("[v0] Order confirmation: Pickup date debug:", {
            pickup_date: data.order.pickup_date,
            pickup_date_type: typeof data.order.pickup_date,
            pickup_location: data.order.pickup_location,
            pickup_location_id: data.order.pickup_location_id,
            delivery_method: data.order.delivery_method,
          })

          setOrderDetails(data.order)

          // Format order time in German format
          if (data.order?.order_time) {
            const orderDate = new Date(data.order.order_time)
            const formattedTime = orderDate.toLocaleString("de-DE", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Europe/Berlin",
            })
            setOrderTime(formattedTime)

            if (paymentMethod === "transfer") {
              setPaymentDeadline(calculatePaymentDeadline(orderDate))
            }
          }
        }
      } catch (error) {
        console.error("Error fetching order details:", error)
      }
    }

    if (orderNumber && orderNumber !== "HG-2024-001") {
      fetchOrderDetails()
    }
  }, [orderNumber, paymentMethod])

  const handleFeedbackSubmit = async () => {
    if (!feedback.trim()) return

    setFeedbackLoading(true)
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber,
          customerName,
          feedback: feedback.trim(),
          source: "order_confirmation",
        }),
      })

      if (response.ok) {
        setFeedbackSubmitted(true)
        setFeedback("")
      }
    } catch (error) {
      console.error("Error submitting feedback:", error)
    } finally {
      setFeedbackLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-600 mx-auto mb-4" />
            <h1 className="font-serif font-bold text-2xl sm:text-3xl text-foreground mb-2">
              Vielen Dank für Ihre Bestellung!
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Ihre Bestellung wurde erfolgreich aufgegeben und wird bearbeitet.
            </p>
          </div>

          <Card className="mb-4 sm:mb-6">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Bestellbestätigung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Bestellnummer</p>
                  <p className="font-medium text-sm sm:text-base">{orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gesamtbetrag</p>
                  <p className="font-medium text-sm sm:text-base">
                    {orderDetails?.total ? `€${orderDetails.total.toFixed(2)}` : `€${total}`}
                  </p>
                </div>
              </div>

              {orderTime && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">Bestellzeit</p>
                  <p className="font-medium text-sm sm:text-base flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{orderTime}</span>
                  </p>
                </div>
              )}

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-2">Lieferart</p>
                <div className="flex items-center space-x-2">
                  {deliveryMethod === "delivery" ? (
                    <>
                      <Truck className="w-4 h-4 text-primary" />
                      <span className="text-sm sm:text-base">Lieferung nach Hause</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="text-sm sm:text-base">Abholung</span>
                    </>
                  )}
                </div>
              </div>

              {deliveryMethod === "pickup" && (
                <div className="border-t pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                    <div>
                      <p className="font-medium text-sm sm:text-base">Nächster Abholtermin</p>
                      <p className="text-lg font-bold text-foreground mt-2 mb-3">
                        {orderDetails?.pickup_date
                          ? new Date(orderDetails.pickup_date + "T00:00:00").toLocaleDateString("de-DE", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })
                          : "Wird noch bekannt gegeben"}
                      </p>
                      {orderDetails?.pickup_location && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm font-medium text-blue-900 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Abholort: {orderDetails.pickup_location}
                          </p>
                        </div>
                      )}
                      {orderDetails?.delivery_comment && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">{orderDetails.delivery_comment}</p>
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground mt-3 flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          Bestellschluss:{" "}
                          {orderDetails?.order_deadline
                            ? new Date(orderDetails.order_deadline + "T00:00:00").toLocaleDateString("de-DE", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })
                            : "Wird bekannt gegeben"}
                        </span>
                      </p>
                      {orderDetails?.pickup_start_time && orderDetails?.pickup_end_time && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Abholung: {orderDetails.pickup_start_time} - {orderDetails.pickup_end_time} Uhr
                          <br />
                          <span className="text-xs italic">oder nach Terminvereinbarung</span>
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 bg-transparent w-full sm:w-auto"
                      onClick={() =>
                        downloadCalendarEvent(
                          orderDetails?.pickup_date
                            ? new Date(orderDetails.pickup_date + "T00:00:00").toLocaleDateString("de-DE", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })
                            : "Wird noch bekannt gegeben",
                          orderNumber,
                        )
                      }
                      disabled={!orderDetails?.pickup_date}
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-sm">Termin herunterladen</span>
                    </Button>
                  </div>
                </div>
              )}

              {paymentMethod === "sumup" && orderDetails?.payment_status === "paid" && (
                <div className="border-t pt-4">
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-800 dark:text-green-200 text-sm sm:text-base">
                        Zahlung erfolgreich abgeschlossen
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 mt-2">
                      Ihre Zahlung wurde per SumUp verarbeitet und bestätigt.
                    </p>
                  </div>
                </div>
              )}

              {paymentMethod === "transfer" && orderDetails?.payment_status !== "paid" && (
                <div className="border-t pt-4">
                  <p className="font-medium mb-3 text-sm sm:text-base">Bankverbindung für Überweisung</p>
                  <div className="bg-muted/50 p-3 sm:p-4 rounded-lg space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Empfänger</p>
                        <p className="font-medium text-sm sm:text-base">Gerlinde Fink</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">IBAN</p>
                        <p className="font-medium font-mono text-xs sm:text-sm break-all">
                          DE35 6225 1550 1000 5154 15
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">BIC</p>
                        <p className="font-medium text-sm sm:text-base">SOLADES1KUN</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Verwendungszweck</p>
                        <p className="font-medium text-sm sm:text-base break-all">Bestellung {orderNumber}</p>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        <strong>Wichtig:</strong> Bitte geben Sie unbedingt die Bestellnummer als Verwendungszweck an.
                      </p>
                    </div>
                    {paymentDeadline && (
                      <div className="pt-2 border-t bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md">
                        <p className="text-xs sm:text-sm font-medium">
                          <strong>Zahlungsziel:</strong> Bitte überweisen Sie den Betrag bis spätestens{" "}
                          <strong>{paymentDeadline}</strong>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mb-4 sm:mb-6">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                <Mail className="w-5 h-5" />
                <span>Nächste Schritte</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium text-sm sm:text-base">Bestätigungs-E-Mail</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Sie erhalten in Kürze eine E-Mail mit allen Details Ihrer Bestellung.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium text-sm sm:text-base">Zahlungsinformationen</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {paymentMethod === "transfer"
                      ? "Die Bankdaten für die Überweisung finden Sie in der Bestätigungs-E-Mail."
                      : "Ihre Zahlung wird verarbeitet."}
                  </p>
                </div>
              </div>

              {deliveryMethod === "delivery" && (
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base">Versandbestätigung</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Sie erhalten eine E-Mail, sobald Ihre Ware versendet wurde.
                    </p>
                  </div>
                </div>
              )}

              {deliveryMethod === "pickup" && (
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base">Abholtermin</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Wir informieren Sie rechtzeitig über den genauen Abholort und die Uhrzeit.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mb-4 sm:mb-6">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                <MessageSquare className="w-5 h-5" />
                <span>Ihr Feedback ist uns wichtig</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {feedbackSubmitted ? (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Vielen Dank für Ihr Feedback!
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Wir freuen uns über Ihre Rückmeldung und werden sie zur Verbesserung nutzen.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Wie war Ihre Erfahrung mit unserem Bestellprozess? Wir freuen uns über Ihr Feedback und
                    Verbesserungsvorschläge!
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="feedback" className="text-sm">
                      Ihre Nachricht
                    </Label>
                    <Textarea
                      id="feedback"
                      placeholder="Teilen Sie uns Ihre Meinung mit..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                  <Button
                    onClick={handleFeedbackSubmit}
                    disabled={!feedback.trim() || feedbackLoading}
                    className="w-full sm:w-auto gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {feedbackLoading ? "Wird gesendet..." : "Feedback senden"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-center space-y-4">
            <p className="text-xs sm:text-sm text-muted-foreground px-4">
              Bei Fragen zu Ihrer Bestellung erreichen Sie uns unter:
              <br />
              <strong className="text-sm sm:text-base">0176 38734161</strong> oder{" "}
              <strong className="break-all">kontakt@suedfruechte-hohenlohe.de</strong>
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <Link href="/shop" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto bg-transparent">
                  Weiter einkaufen
                </Button>
              </Link>
              <Link href="/" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto">Zur Startseite</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<div>Lädt...</div>}>
      <OrderConfirmationContent />
    </Suspense>
  )
}
