"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Loader2, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function DataProtectionContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/data-protection-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Fehler beim Senden")

      setIsSuccess(true)
      setFormData({ name: "", email: "", subject: "", message: "" })
      toast({
        title: "Anfrage gesendet",
        description: "Wir werden uns schnellstmöglich bei Ihnen melden.",
      })
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Die Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Anfrage erfolgreich gesendet</h3>
              <p className="text-muted-foreground text-sm">
                Vielen Dank für Ihre Anfrage. Wir werden uns schnellstmöglich bei Ihnen melden.
              </p>
            </div>
            <Button onClick={() => setIsSuccess(false)} variant="outline">
              Weitere Anfrage senden
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mail className="w-5 h-5" />
          <span>Datenschutz-Anfrage stellen</span>
        </CardTitle>
        <CardDescription>
          Nutzen Sie dieses Formular, um Ihre Rechte gemäß DSGVO geltend zu machen oder Fragen zum Datenschutz zu
          stellen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Ihr vollständiger Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail-Adresse *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="ihre@email.de"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Art der Anfrage *</Label>
            <Select value={formData.subject} onValueChange={(value) => setFormData({ ...formData, subject: value })}>
              <SelectTrigger id="subject">
                <SelectValue placeholder="Bitte wählen Sie eine Option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auskunft">Auskunftsrecht (Art. 15 DSGVO)</SelectItem>
                <SelectItem value="loeschung">Löschungsrecht (Art. 17 DSGVO)</SelectItem>
                <SelectItem value="berichtigung">Berichtigungsrecht (Art. 16 DSGVO)</SelectItem>
                <SelectItem value="widerspruch">Widerspruchsrecht (Art. 21 DSGVO)</SelectItem>
                <SelectItem value="einschraenkung">Recht auf Einschränkung (Art. 18 DSGVO)</SelectItem>
                <SelectItem value="datenportabilitaet">Datenübertragbarkeit (Art. 20 DSGVO)</SelectItem>
                <SelectItem value="sonstiges">Sonstige Datenschutzfrage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Ihre Nachricht *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
              placeholder="Bitte beschreiben Sie Ihr Anliegen..."
              rows={6}
            />
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-xs text-muted-foreground">
              Ihre Anfrage wird per E-Mail an unseren Datenschutzbeauftragten weitergeleitet. Wir werden uns
              schnellstmöglich, spätestens innerhalb von 30 Tagen, bei Ihnen melden.
            </p>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Wird gesendet...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Anfrage absenden
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
