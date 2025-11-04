"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, Bug, Send, Loader2 } from "lucide-react"

interface FeedbackModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPage?: string
}

export function FeedbackModal({ open, onOpenChange, currentPage }: FeedbackModalProps) {
  const [type, setType] = useState<"feedback" | "bug">("feedback")
  const [subject, setSubject] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [affectedPage, setAffectedPage] = useState(currentPage || "")
  const [errorText, setErrorText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const handleSubmit = async () => {
    if (!subject || !message) {
      alert("Bitte füllen Sie alle Pflichtfelder aus.")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/customer-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          subject,
          email: email || undefined,
          message,
          affectedPage: type === "bug" ? affectedPage : undefined,
          errorText: type === "bug" && errorText ? errorText : undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("Fehler beim Senden")
      }

      setSubmitSuccess(true)

      // Reset form after 2 seconds and close
      setTimeout(() => {
        setSubject("")
        setEmail("")
        setMessage("")
        setAffectedPage(currentPage || "")
        setErrorText("")
        setSubmitSuccess(false)
        onOpenChange(false)
      }, 2000)
    } catch (error) {
      console.error("Error submitting feedback:", error)
      alert("Fehler beim Senden des Feedbacks. Bitte versuchen Sie es erneut.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Feedback geben</DialogTitle>
          <DialogDescription>Teilen Sie uns Ihre Meinung mit oder melden Sie einen Fehler.</DialogDescription>
        </DialogHeader>

        {submitSuccess ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-green-900 mb-2">Vielen Dank!</h3>
            <p className="text-sm text-muted-foreground">Ihr Feedback wurde erfolgreich übermittelt.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Type Toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={type === "feedback" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setType("feedback")}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Feedback
              </Button>
              <Button
                type="button"
                variant={type === "bug" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setType("bug")}
              >
                <Bug className="w-4 h-4 mr-2" />
                Fehler melden
              </Button>
            </div>

            {/* Subject */}
            <div>
              <Label htmlFor="subject">Betreff *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Kurze Zusammenfassung"
                required
              />
            </div>

            {/* Email (optional) */}
            <div>
              <Label htmlFor="email">E-Mail (optional)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Für Rückmeldungen"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Geben Sie Ihre E-Mail an, wenn wir auf Ihr Feedback antworten sollen.
              </p>
            </div>

            {/* Bug-specific fields */}
            {type === "bug" && (
              <>
                <div>
                  <Label htmlFor="affectedPage">Betroffene Seite</Label>
                  <Input
                    id="affectedPage"
                    value={affectedPage}
                    onChange={(e) => setAffectedPage(e.target.value)}
                    placeholder="/shop"
                  />
                </div>

                <div>
                  <Label htmlFor="errorText">Fehlertext (optional)</Label>
                  <Textarea
                    id="errorText"
                    value={errorText}
                    onChange={(e) => setErrorText(e.target.value)}
                    placeholder="Kopieren Sie hier Fehlermeldungen ein..."
                    rows={3}
                  />
                </div>
              </>
            )}

            {/* Message */}
            <div>
              <Label htmlFor="message">Nachricht *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  type === "feedback"
                    ? "Teilen Sie uns Ihre Meinung mit..."
                    : "Beschreiben Sie den Fehler so detailliert wie möglich..."
                }
                rows={5}
                required
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 bg-transparent"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Abbrechen
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={handleSubmit}
                disabled={isSubmitting || !subject || !message}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Wird gesendet...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Absenden
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
