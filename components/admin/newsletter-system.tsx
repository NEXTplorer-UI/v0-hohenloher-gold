"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Mail, Send, Users, Eye, RefreshCw, TrendingUp, ImageIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import NewsletterConfirmationDialog from "./newsletter-confirmation-dialog"
import { buildEmail } from "@/lib/email/build"

interface NewsletterStats {
  subscribers: number
  newslettersSent: number
  openRate: number
  subscribersList: Array<{
    id: string
    email: string
    subscribed_at: string
    source: string
  }>
}

export default function NewsletterSystem() {
  const [subject, setSubject] = useState("")
  const [content, setContent] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [stats, setStats] = useState<NewsletterStats>({
    subscribers: 0,
    newslettersSent: 0,
    openRate: 0,
    subscribersList: [],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewHtml, setPreviewHtml] = useState("")
  const { toast } = useToast()

  const loadStats = async () => {
    setIsUpdating(true)
    try {
      console.log("[v0] Loading newsletter stats...")
      const response = await fetch("/api/newsletter/stats")
      if (!response.ok) throw new Error("Failed to load stats")

      const data = await response.json()
      setStats(data)
      console.log("[v0] Newsletter stats loaded:", data)
    } catch (error) {
      console.error("[v0] Error loading newsletter stats:", error)
      toast({
        title: "Fehler",
        description: "Newsletter-Statistiken konnten nicht geladen werden",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const handleSendNewsletter = async () => {
    if (!subject.trim() || !content.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie Betreff und Inhalt aus",
        variant: "destructive",
      })
      return
    }

    if (stats.subscribers === 0) {
      toast({
        title: "Keine Empfänger",
        description: "Es sind keine aktiven Newsletter-Abonnenten vorhanden",
        variant: "destructive",
      })
      return
    }

    setShowConfirmation(true)
  }

  const confirmSendNewsletter = async () => {
    setIsSending(true)
    try {
      console.log("[v0] Sending newsletter to", stats.subscribers, "subscribers")

      const recipients = stats.subscribersList.map((sub) => sub.email)

      const response = await fetch("/api/send-bulk-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          content,
          imageUrl,
          recipients,
          type: "newsletter",
        }),
      })

      if (!response.ok) throw new Error("Failed to send newsletter")

      const result = await response.json()
      console.log("[v0] Newsletter sent successfully:", result)

      toast({
        title: "Newsletter gesendet!",
        description: `Newsletter wurde erfolgreich an ${result.results.sent} Empfänger gesendet`,
      })

      // Reset form
      setSubject("")
      setContent("")
      setImageUrl("")
      setShowConfirmation(false)

      // Reload stats
      await loadStats()
    } catch (error) {
      console.error("[v0] Error sending newsletter:", error)
      toast({
        title: "Fehler beim Senden",
        description: "Newsletter konnte nicht gesendet werden",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const handlePreview = () => {
    if (!subject.trim() || !content.trim()) {
      toast({
        title: "Keine Vorschau möglich",
        description: "Bitte füllen Sie Betreff und Inhalt aus",
        variant: "destructive",
      })
      return
    }

    const emailResult = buildEmail("newsletter", {
      subject,
      content,
      imageUrl,
    })
    setPreviewHtml(emailResult.html)
    setShowPreview(true)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Newsletter System</CardTitle>
            <CardDescription>Newsletter erstellen und an Kunden versenden</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadStats} disabled={isUpdating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isUpdating ? "animate-spin" : ""}`} />
            Aktualisieren
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Abonnenten</span>
              </div>
              <div className="text-2xl font-bold">{stats.subscribers}</div>
              <p className="text-xs text-muted-foreground mt-1">Aktive Abonnenten</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Versendet</span>
              </div>
              <div className="text-2xl font-bold">{stats.newslettersSent}</div>
              <p className="text-xs text-muted-foreground mt-1">Newsletter gesamt</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Öffnungsrate</span>
              </div>
              <div className="text-2xl font-bold">{stats.openRate > 0 ? `${stats.openRate}%` : "N/A"}</div>
              <p className="text-xs text-muted-foreground mt-1">Durchschnittlich</p>
            </Card>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Betreff</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Newsletter Betreff eingeben..."
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Bild-URL (optional)</label>
              <div className="flex gap-2">
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://beispiel.de/bild.jpg"
                  disabled={isLoading}
                />
                <Button variant="outline" size="icon" disabled>
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Fügen Sie eine Bild-URL hinzu, um ein Bild im Newsletter anzuzeigen
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Inhalt</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Newsletter Inhalt eingeben..."
                rows={8}
                disabled={isLoading}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={isLoading || !subject.trim() || !content.trim()}
                onClick={handlePreview}
              >
                <Eye className="h-4 w-4 mr-2" />
                Vorschau
              </Button>
              <Button onClick={handleSendNewsletter} disabled={isLoading || !subject.trim() || !content.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Senden ({stats.subscribers} Empfänger)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Newsletter Vorschau</DialogTitle>
            <DialogDescription>So wird der Newsletter bei Ihren Kunden aussehen</DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-4 bg-white" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </DialogContent>
      </Dialog>

      <NewsletterConfirmationDialog
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={confirmSendNewsletter}
        subject={subject}
        content={content}
        subscriberCount={stats.subscribers}
        isLoading={isSending}
      />
    </div>
  )
}
