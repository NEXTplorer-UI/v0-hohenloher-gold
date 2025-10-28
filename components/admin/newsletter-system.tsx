"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Mail,
  Send,
  Users,
  Eye,
  RefreshCw,
  TrendingUp,
  ImageIcon,
  Paperclip,
  X,
  Upload,
  HelpCircle,
  Save,
  FolderOpen,
  Trash2,
  TestTube,
  History,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import NewsletterConfirmationDialog from "./newsletter-confirmation-dialog"
import { buildEmail } from "@/lib/email/build"
import { markdownToHtml } from "@/lib/markdown"

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

interface Attachment {
  filename: string
  url: string
  size: number
  type: string
}

interface Draft {
  id: string
  title: string
  subject: string
  content: string
  image_url: string | null
  attachment: Attachment | null
  created_at: string
  updated_at: string
}

interface SendHistory {
  id: string
  subject: string
  recipient_count: number
  sent_at: string
  created_at: string
  stats: {
    sent: number
    failed: number
    pending: number
  }
}

interface EmailSend {
  id: string
  recipient_email: string
  status: "sent" | "failed" | "pending"
  error_message: string | null
  sent_at: string | null
  created_at: string
}

export default function NewsletterSystem() {
  const [subject, setSubject] = useState("")
  const [content, setContent] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const [isUploading, setIsUploading] = useState(false)
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
  const [showMarkdownHelp, setShowMarkdownHelp] = useState(false)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [showDrafts, setShowDrafts] = useState(false)
  const [showSaveDraft, setShowSaveDraft] = useState(false)
  const [draftTitle, setDraftTitle] = useState("")
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [testEmail, setTestEmail] = useState("")
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [showSendHistory, setShowSendHistory] = useState(false)
  const [sendHistory, setSendHistory] = useState<SendHistory[]>([])
  const [selectedSend, setSelectedSend] = useState<SendHistory | null>(null)
  const [emailSends, setEmailSends] = useState<EmailSend[]>([])
  const [showSendDetails, setShowSendDetails] = useState(false)
  const [isResending, setIsResending] = useState(false)

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

  const loadDrafts = async () => {
    try {
      const response = await fetch("/api/newsletter/drafts")
      if (!response.ok) throw new Error("Failed to load drafts")

      const data = await response.json()
      setDrafts(data.drafts || [])
    } catch (error) {
      console.error("[v0] Error loading drafts:", error)
      toast({
        title: "Fehler",
        description: "Entwürfe konnten nicht geladen werden",
        variant: "destructive",
      })
    }
  }

  const loadSendHistory = async () => {
    try {
      const response = await fetch("/api/newsletter/send-history")
      if (!response.ok) throw new Error("Failed to load send history")

      const data = await response.json()
      setSendHistory(data.sends || [])
    } catch (error) {
      console.error("[v0] Error loading send history:", error)
      toast({
        title: "Fehler",
        description: "Versandhistorie konnte nicht geladen werden",
        variant: "destructive",
      })
    }
  }

  const loadSendDetails = async (sendId: string) => {
    try {
      const response = await fetch(`/api/newsletter/send-history/${sendId}`)
      if (!response.ok) throw new Error("Failed to load send details")

      const data = await response.json()
      setEmailSends(data.emailSends || [])
      setShowSendDetails(true)
    } catch (error) {
      console.error("[v0] Error loading send details:", error)
      toast({
        title: "Fehler",
        description: "Versanddetails konnten nicht geladen werden",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    loadStats()
    loadDrafts()
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const maxSize = 25 * 1024 * 1024
    if (file.size > maxSize) {
      toast({
        title: "Datei zu groß",
        description: "Die Datei darf maximal 25MB groß sein",
        variant: "destructive",
      })
      return
    }

    const allowedTypes = [
      "audio/mpeg",
      "audio/wav",
      "audio/mp3",
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/zip",
    ]
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Ungültiger Dateityp",
        description: "Erlaubte Formate: MP3, WAV, PDF, JPG, PNG, ZIP",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload-attachment", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Upload failed")

      const data = await response.json()
      setAttachment({
        filename: data.filename,
        url: data.url,
        size: data.size,
        type: data.type,
      })

      toast({
        title: "Datei hochgeladen",
        description: `${data.filename} wurde erfolgreich hochgeladen`,
      })
    } catch (error) {
      console.error("[v0] Error uploading file:", error)
      toast({
        title: "Upload fehlgeschlagen",
        description: "Die Datei konnte nicht hochgeladen werden",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveAttachment = () => {
    setAttachment(null)
    toast({
      title: "Anhang entfernt",
      description: "Der Anhang wurde entfernt",
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

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
          attachment,
          recipients,
          type: "newsletter",
        }),
      })

      if (!response.ok) throw new Error("Failed to send newsletter")

      const result = await response.json()
      console.log("[v0] Newsletter sent successfully:", result)

      const message =
        result.results.failed > 0
          ? `${result.results.sent} erfolgreich, ${result.results.failed} fehlgeschlagen`
          : `Erfolgreich an ${result.results.sent} Empfänger gesendet`

      toast({
        title: result.results.failed > 0 ? "Teilweise gesendet" : "Newsletter gesendet!",
        description: message,
        variant: result.results.failed > 0 ? "destructive" : "default",
      })

      if (result.results.errors && result.results.errors.length > 0) {
        console.error("[v0] Send errors:", result.results.errors)
      }

      setSubject("")
      setContent("")
      setImageUrl("")
      setAttachment(null)
      setShowConfirmation(false)

      await loadStats()
      await loadSendHistory()
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

    const htmlContent = markdownToHtml(content)

    const emailResult = buildEmail("newsletter", {
      subject,
      content: htmlContent,
      imageUrl,
    })
    setPreviewHtml(emailResult.html)
    setShowPreview(true)
  }

  const handleSaveDraft = async () => {
    if (!draftTitle.trim() || !subject.trim() || !content.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie Titel, Betreff und Inhalt aus",
        variant: "destructive",
      })
      return
    }

    setIsSavingDraft(true)
    try {
      const url = currentDraftId ? `/api/newsletter/drafts/${currentDraftId}` : "/api/newsletter/drafts"
      const method = currentDraftId ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draftTitle,
          subject,
          content,
          imageUrl,
          attachment,
        }),
      })

      if (!response.ok) throw new Error("Failed to save draft")

      toast({
        title: "Entwurf gespeichert",
        description: currentDraftId ? "Entwurf wurde aktualisiert" : "Entwurf wurde erstellt",
      })

      setShowSaveDraft(false)
      setDraftTitle("")
      await loadDrafts()
    } catch (error) {
      console.error("[v0] Error saving draft:", error)
      toast({
        title: "Fehler",
        description: "Entwurf konnte nicht gespeichert werden",
        variant: "destructive",
      })
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handleLoadDraft = (draft: Draft) => {
    setSubject(draft.subject)
    setContent(draft.content)
    setImageUrl(draft.image_url || "")
    setAttachment(draft.attachment)
    setDraftTitle(draft.title)
    setCurrentDraftId(draft.id)
    setShowDrafts(false)

    toast({
      title: "Entwurf geladen",
      description: `"${draft.title}" wurde geladen`,
    })
  }

  const handleDeleteDraft = async (draftId: string) => {
    if (!confirm("Möchten Sie diesen Entwurf wirklich löschen?")) return

    try {
      const response = await fetch(`/api/newsletter/drafts/${draftId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete draft")

      toast({
        title: "Entwurf gelöscht",
        description: "Der Entwurf wurde erfolgreich gelöscht",
      })

      await loadDrafts()
    } catch (error) {
      console.error("[v0] Error deleting draft:", error)
      toast({
        title: "Fehler",
        description: "Entwurf konnte nicht gelöscht werden",
        variant: "destructive",
      })
    }
  }

  const handleSendTestEmail = async () => {
    if (!testEmail.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie eine Test-E-Mail-Adresse ein",
        variant: "destructive",
      })
      return
    }

    if (!subject.trim() || !content.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie Betreff und Inhalt aus",
        variant: "destructive",
      })
      return
    }

    setIsSendingTest(true)
    try {
      console.log("[v0] Sending test email to", testEmail)

      const response = await fetch("/api/newsletter/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          content,
          imageUrl,
          attachment,
          testEmail,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to send test email")
      }

      toast({
        title: "Test-E-Mail gesendet!",
        description: `Newsletter wurde als Test an ${testEmail} gesendet`,
      })

      console.log("[v0] Test email sent successfully")
    } catch (error) {
      console.error("[v0] Error sending test email:", error)
      toast({
        title: "Fehler beim Senden",
        description: error instanceof Error ? error.message : "Test-E-Mail konnte nicht gesendet werden",
        variant: "destructive",
      })
    } finally {
      setIsSendingTest(false)
    }
  }

  const handleOpenSaveDraft = () => {
    if (!subject.trim() || !content.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie Betreff und Inhalt aus",
        variant: "destructive",
      })
      return
    }

    if (!draftTitle && !currentDraftId) {
      setDraftTitle(`Entwurf ${new Date().toLocaleDateString("de-DE")}`)
    }
    setShowSaveDraft(true)
  }

  const handleResendFailed = async (newsletterSendId: string) => {
    if (!confirm("Möchten Sie den Newsletter erneut an alle fehlgeschlagenen Empfänger senden?")) return

    setIsResending(true)
    try {
      const response = await fetch("/api/newsletter/resend-failed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newsletterSendId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to resend")
      }

      const result = await response.json()

      toast({
        title: "Erneut gesendet!",
        description: `${result.results.sent} E-Mails erfolgreich versendet, ${result.results.failed} fehlgeschlagen`,
      })

      // Reload details
      await loadSendDetails(newsletterSendId)
      await loadSendHistory()
    } catch (error) {
      console.error("[v0] Error resending failed emails:", error)
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Erneutes Senden fehlgeschlagen",
        variant: "destructive",
      })
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Newsletter System</CardTitle>
            <CardDescription>Newsletter erstellen und an Kunden versenden</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowSendHistory(true)
                loadSendHistory()
              }}
            >
              <History className="h-4 w-4 mr-2" />
              Versandhistorie
            </Button>
            <Button variant="outline" size="sm" onClick={loadStats} disabled={isUpdating}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isUpdating ? "animate-spin" : ""}`} />
              Aktualisieren
            </Button>
          </div>
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
              <label className="text-sm font-medium">Anhang (optional)</label>
              {!attachment ? (
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept=".mp3,.wav,.pdf,.jpg,.jpeg,.png,.zip"
                    onChange={handleFileUpload}
                    disabled={isUploading || isLoading}
                    className="cursor-pointer"
                  />
                  <Button variant="outline" size="icon" disabled={isUploading}>
                    {isUploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{attachment.filename}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleRemoveAttachment}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Erlaubte Formate: MP3, WAV, PDF, JPG, PNG, ZIP (max. 25MB)
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Inhalt (Markdown & HTML unterstützt)</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMarkdownHelp(!showMarkdownHelp)}
                  className="h-8 text-xs"
                >
                  <HelpCircle className="h-4 w-4 mr-1" />
                  Formatierungs-Hilfe
                </Button>
              </div>

              {showMarkdownHelp && (
                <div className="mb-3 p-4 bg-muted rounded-lg text-sm space-y-3">
                  <div>
                    <p className="font-semibold text-foreground mb-2">Markdown-Formatierung:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-muted-foreground">
                      <div>
                        <code className="bg-background px-2 py-1 rounded">**fett**</code> → <strong>fett</strong>
                      </div>
                      <div>
                        <code className="bg-background px-2 py-1 rounded">*kursiv*</code> → <em>kursiv</em>
                      </div>
                      <div>
                        <code className="bg-background px-2 py-1 rounded"># Überschrift 1</code> → Große Überschrift
                      </div>
                      <div>
                        <code className="bg-background px-2 py-1 rounded">## Überschrift 2</code> → Mittlere Überschrift
                      </div>
                      <div>
                        <code className="bg-background px-2 py-1 rounded">[Link](url)</code> → Klickbarer Link
                      </div>
                      <div>
                        <code className="bg-background px-2 py-1 rounded">![Bild](url)</code> → Bild einfügen
                      </div>
                      <div>
                        <code className="bg-background px-2 py-1 rounded">- Listenpunkt</code> → Aufzählungsliste
                      </div>
                      <div>
                        <code className="bg-background px-2 py-1 rounded">---</code> → Trennlinie
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <p className="font-semibold text-foreground mb-2">HTML-Befehle (für E-Mails):</p>
                    <div className="space-y-2 text-muted-foreground">
                      <div>
                        <p className="text-xs font-medium mb-1">Bild einfügen:</p>
                        <code className="bg-background px-2 py-1 rounded text-xs block overflow-x-auto">
                          {`<img src="URL" alt="Beschreibung" style="max-width: 100%; height: auto;" />`}
                        </code>
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-1">Link mit Farbe:</p>
                        <code className="bg-background px-2 py-1 rounded text-xs block overflow-x-auto">
                          {`<a href="URL" style="color: #10b981;">Linktext</a>`}
                        </code>
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-1">Überschriften:</p>
                        <code className="bg-background px-2 py-1 rounded text-xs block overflow-x-auto">
                          {`<h2 style="font-size: 22px; font-weight: 600;">Überschrift</h2>`}
                        </code>
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-1">Zentrierter Text:</p>
                        <code className="bg-background px-2 py-1 rounded text-xs block overflow-x-auto">
                          {`<div style="text-align: center;">Zentrierter Inhalt</div>`}
                        </code>
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-1">Trennlinie:</p>
                        <code className="bg-background px-2 py-1 rounded text-xs block overflow-x-auto">
                          {`<hr style="border: none; border-top: 2px solid #e5e7eb; margin: 25px 0;" />`}
                        </code>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                    <strong>Wichtig:</strong> In E-Mails müssen Sie Inline-Styles verwenden (style="..."), da externe
                    CSS-Klassen nicht unterstützt werden. Sie können Markdown und HTML beliebig mischen.
                  </p>
                </div>
              )}

              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Newsletter Inhalt eingeben... (Markdown & HTML werden unterstützt)&#10;&#10;Beispiel:&#10;# Willkommen&#10;&#10;Besuchen Sie unseren [Shop](https://...)&#10;&#10;**Neue Produkte:**&#10;- Sizilianische Orangen&#10;- Bio-Mandeln&#10;&#10;Oder mit HTML:&#10;<img src='...' alt='Produkt' style='max-width: 100%;' />"
                rows={12}
                disabled={isLoading}
                className="font-mono text-sm"
              />
            </div>

            <div className="border-t pt-4">
              <label className="text-sm font-medium">Test-E-Mail senden</label>
              <p className="text-xs text-muted-foreground mb-2">
                Senden Sie den Newsletter zuerst als Test an eine beliebige E-Mail-Adresse
              </p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@beispiel.de"
                  disabled={isSendingTest || isLoading}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleSendTestEmail}
                  disabled={isSendingTest || isLoading || !subject.trim() || !content.trim() || !testEmail.trim()}
                >
                  {isSendingTest ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sende...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4 mr-2" />
                      Test senden
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={handleOpenSaveDraft}
                disabled={isLoading || !subject.trim() || !content.trim()}
              >
                <Save className="h-4 w-4 mr-2" />
                Als Entwurf speichern
              </Button>
              <Button variant="outline" onClick={() => setShowDrafts(true)} disabled={isLoading}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Entwürfe laden ({drafts.length})
              </Button>
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

      <Dialog open={showSendHistory} onOpenChange={setShowSendHistory}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Versandhistorie</DialogTitle>
            <DialogDescription>Übersicht aller versendeten Newsletter</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {sendHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Keine Versandhistorie vorhanden</p>
            ) : (
              sendHistory.map((send) => (
                <Card key={send.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{send.subject}</h4>
                      <div className="flex gap-4 mt-2 text-sm">
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>{send.stats.sent} gesendet</span>
                        </div>
                        {send.stats.failed > 0 && (
                          <div className="flex items-center gap-1 text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span>{send.stats.failed} fehlgeschlagen</span>
                          </div>
                        )}
                        {send.stats.pending > 0 && (
                          <div className="flex items-center gap-1 text-yellow-600">
                            <Clock className="h-4 w-4" />
                            <span>{send.stats.pending} ausstehend</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(send.sent_at).toLocaleString("de-DE")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSend(send)
                          loadSendDetails(send.id)
                        }}
                      >
                        Details
                      </Button>
                      {send.stats.failed > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResendFailed(send.id)}
                          disabled={isResending}
                        >
                          {isResending ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-1" />
                              Erneut senden
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSendDetails} onOpenChange={setShowSendDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Versanddetails</DialogTitle>
            <DialogDescription>
              {selectedSend?.subject} - {emailSends.length} Empfänger
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {emailSends.map((emailSend) => (
              <div key={emailSend.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{emailSend.recipient_email}</p>
                  {emailSend.error_message && <p className="text-xs text-red-600 mt-1">{emailSend.error_message}</p>}
                  {emailSend.sent_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(emailSend.sent_at).toLocaleString("de-DE")}
                    </p>
                  )}
                </div>
                <div>
                  {emailSend.status === "sent" && (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">Gesendet</span>
                    </div>
                  )}
                  {emailSend.status === "failed" && (
                    <div className="flex items-center gap-1 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Fehlgeschlagen</span>
                    </div>
                  )}
                  {emailSend.status === "pending" && (
                    <div className="flex items-center gap-1 text-yellow-600">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">Ausstehend</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Newsletter Vorschau</DialogTitle>
            <DialogDescription>So wird der Newsletter bei Ihren Kunden aussehen</DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-4 bg-white" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </DialogContent>
      </Dialog>

      <Dialog open={showSaveDraft} onOpenChange={setShowSaveDraft}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entwurf speichern</DialogTitle>
            <DialogDescription>Geben Sie einen Titel für den Entwurf ein</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Titel</label>
              <Input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="z.B. Weihnachts-Newsletter 2025"
                disabled={isSavingDraft}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowSaveDraft(false)} disabled={isSavingDraft}>
                Abbrechen
              </Button>
              <Button onClick={handleSaveDraft} disabled={isSavingDraft}>
                {isSavingDraft ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Speichern...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Speichern
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDrafts} onOpenChange={setShowDrafts}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Gespeicherte Entwürfe</DialogTitle>
            <DialogDescription>Wählen Sie einen Entwurf zum Laden oder Löschen</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {drafts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Keine Entwürfe vorhanden</p>
            ) : (
              drafts.map((draft) => (
                <Card key={draft.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{draft.title}</h4>
                      <p className="text-sm text-muted-foreground truncate">{draft.subject}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Zuletzt bearbeitet: {new Date(draft.updated_at).toLocaleString("de-DE")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleLoadDraft(draft)}>
                        <FolderOpen className="h-4 w-4 mr-1" />
                        Laden
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteDraft(draft.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
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
