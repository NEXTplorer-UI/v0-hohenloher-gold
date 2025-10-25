"use client"

import { useState, useMemo } from "react"
import { buildEmail } from "@/lib/email/build"
import { emailPreviewData, type EmailPreviewId } from "@/lib/email/preview-data"
import { emailCopy } from "@/lib/email/copy"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, Send, AlertTriangle, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type EmailCopyType = typeof emailCopy

export default function EmailPreviewPage() {
  const [templateId, setTemplateId] = useState<EmailPreviewId>("orderConfirmation")
  const [vars, setVars] = useState(emailPreviewData[templateId].vars)
  const [editedCopy, setEditedCopy] = useState<EmailCopyType>(emailCopy)
  const [testEmail, setTestEmail] = useState("test@example.com")
  const [isSending, setIsSending] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const currentTemplate = emailPreviewData[templateId]

  const { subject, html } = useMemo(() => {
    try {
      return buildEmail(templateId, vars, editedCopy)
    } catch (error) {
      console.error("[v0] Error building email:", error)
      return { subject: "Error", html: "<p>Error building email</p>" }
    }
  }, [templateId, vars, editedCopy])

  const handleTemplateChange = (newTemplateId: EmailPreviewId) => {
    setTemplateId(newTemplateId)
    setVars(emailPreviewData[newTemplateId].vars)
  }

  const handleVarChange = (key: string, value: string) => {
    setVars((prev) => ({ ...prev, [key]: value }))
  }

  const handleTextChange = (section: keyof EmailCopyType, key: string, value: string) => {
    setEditedCopy((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }))
  }

  const handleSaveTexts = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/admin/save-email-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailCopy: editedCopy }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Texte gespeichert",
          description: "Die Email-Texte wurden erfolgreich aktualisiert",
        })
      } else {
        throw new Error(data.error || "Unbekannter Fehler")
      }
    } catch (error: any) {
      console.error("[v0] Error saving email copy:", error)
      toast({
        title: "Fehler beim Speichern",
        description: error.message || "Die Texte konnten nicht gespeichert werden",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendTest = async () => {
    if (!testEmail) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie eine Test-Email-Adresse ein",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)
    try {
      const response = await fetch("/api/admin/send-test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          to: testEmail,
          vars,
        }),
      })

      const data = await response.json()

      if (data.ok) {
        toast({
          title: "Test-Email versendet",
          description: `Email wurde an ${testEmail} gesendet`,
        })
      } else {
        throw new Error(data.error || "Unbekannter Fehler")
      }
    } catch (error: any) {
      console.error("[v0] Error sending test email:", error)
      toast({
        title: "Fehler beim Versenden",
        description: error.message || "Die Test-Email konnte nicht versendet werden",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const getCurrentTemplateTexts = () => {
    const sectionMap: Record<EmailPreviewId, keyof EmailCopyType> = {
      orderConfirmation: "orderConfirmation",
      invoice: "invoice",
      pickupReminder: "pickupReminder",
      distributorApplication: "distributorApplication",
      newsletter: "newsletter",
      newsletterConfirmation: "newsletterConfirmation",
      paymentReceipt: "paymentReceipt",
      readyForPickup: "readyForPickup",
      orderConfirmed: "orderConfirmed",
      orderPickedUp: "orderPickedUp",
      orderCancelled: "orderCancelled",
      shippingNotification: "shippingNotification",
    }

    const section = sectionMap[templateId]
    return editedCopy[section] as Record<string, string>
  }

  const currentTexts = getCurrentTemplateTexts()

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">E-Mail Vorschau</h1>
        <p className="text-muted-foreground">Vorschau aller Email-Templates mit Live-Bearbeitung und Test-Versand</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left sidebar - Controls */}
        <div className="space-y-6">
          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-select">Email-Template</Label>
                <Select value={templateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger id="template-select" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(emailPreviewData).map(([id, data]) => (
                      <SelectItem key={id} value={id}>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {data.title}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1.5">{currentTemplate.description}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Email-Texte bearbeiten</h3>
            </div>
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Platzhalter wie <code className="text-xs">{"{{customerName}}"}</code> bleiben erhalten und werden
                automatisch ersetzt.
              </AlertDescription>
            </Alert>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {Object.entries(currentTexts).map(([key, value]) => {
                const isLongText = String(value).length > 50
                return (
                  <div key={key}>
                    <Label htmlFor={`text-${key}`} className="text-xs text-muted-foreground">
                      {key}
                    </Label>
                    {isLongText ? (
                      <Textarea
                        id={`text-${key}`}
                        value={String(value ?? "")}
                        onChange={(e) => {
                          const section = {
                            orderConfirmation: "orderConfirmation",
                            invoice: "invoice",
                            pickupReminder: "pickupReminder",
                            distributorApplication: "distributorApplication",
                            newsletter: "newsletter",
                            newsletterConfirmation: "newsletterConfirmation",
                            paymentReceipt: "paymentReceipt",
                            readyForPickup: "readyForPickup",
                            orderConfirmed: "orderConfirmed",
                            orderPickedUp: "orderPickedUp",
                            orderCancelled: "orderCancelled",
                            shippingNotification: "shippingNotification",
                          }[templateId] as keyof EmailCopyType
                          handleTextChange(section, key, e.target.value)
                        }}
                        className="mt-1 min-h-[80px]"
                        rows={3}
                      />
                    ) : (
                      <Input
                        id={`text-${key}`}
                        value={String(value ?? "")}
                        onChange={(e) => {
                          const section = {
                            orderConfirmation: "orderConfirmation",
                            invoice: "invoice",
                            pickupReminder: "pickupReminder",
                            distributorApplication: "distributorApplication",
                            newsletter: "newsletter",
                            newsletterConfirmation: "newsletterConfirmation",
                            paymentReceipt: "paymentReceipt",
                            readyForPickup: "readyForPickup",
                            orderConfirmed: "orderConfirmed",
                            orderPickedUp: "orderPickedUp",
                            orderCancelled: "orderCancelled",
                            shippingNotification: "shippingNotification",
                          }[templateId] as keyof EmailCopyType
                          handleTextChange(section, key, e.target.value)
                        }}
                        className="mt-1"
                      />
                    )}
                  </div>
                )
              })}
            </div>
            <div className="mt-4 pt-4 border-t space-y-3">
              <Button onClick={handleSaveTexts} disabled={isSaving} className="w-full" variant="default">
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Wird gespeichert..." : "Texte speichern"}
              </Button>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">Dies verändert das Email-Template dauerhaft.</AlertDescription>
              </Alert>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-3">Test-Email senden</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="test-email">An Email-Adresse</Label>
                <Input
                  id="test-email"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="mt-1.5"
                />
              </div>
              <Button onClick={handleSendTest} disabled={isSending} className="w-full" variant="default">
                <Send className="h-4 w-4 mr-2" />
                {isSending ? "Wird gesendet..." : "Test-Email senden"}
              </Button>
            </div>
          </Card>
        </div>

        {/* Right side - Preview */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4">
            <Label className="text-sm text-muted-foreground">Betreff</Label>
            <p className="mt-1.5 font-medium">{subject}</p>
          </Card>

          <Card className="p-4">
            <Label className="text-sm text-muted-foreground mb-3 block">Email-Vorschau</Label>
            <div className="border rounded-lg overflow-hidden bg-white">
              <iframe
                title="Email Preview"
                className="w-full h-[calc(100vh-300px)] min-h-[600px]"
                sandbox="allow-same-origin"
                srcDoc={html}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
