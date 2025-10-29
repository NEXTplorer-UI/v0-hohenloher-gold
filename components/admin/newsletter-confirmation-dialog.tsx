"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Mail, Users, Clock } from "lucide-react"

interface NewsletterConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  subject: string
  content: string
  subscriberCount: number
  isLoading?: boolean
}

export default function NewsletterConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  subject,
  content,
  subscriberCount,
  isLoading = false,
}: NewsletterConfirmationDialogProps) {
  const [confirmationText, setConfirmationText] = useState("")
  const requiredText = "NEWSLETTER SENDEN"

  const isConfirmationValid = confirmationText === requiredText

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] h-auto max-w-[1600px] max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            Newsletter-Versand bestätigen
          </DialogTitle>
          <DialogDescription>
            Sie sind dabei, einen Newsletter an alle aktiven Abonnenten zu versenden. Diese Aktion kann nicht rückgängig
            gemacht werden.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Newsletter Preview */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Newsletter-Vorschau
            </h3>
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-600">Betreff:</span>
                <p className="font-medium">{subject || "Kein Betreff"}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Inhalt:</span>
                <div className="bg-white p-3 rounded border max-h-32 overflow-y-auto">
                  <p className="text-sm whitespace-pre-wrap">{content || "Kein Inhalt"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recipient Info */}
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
            <Users className="h-8 w-8 text-blue-600" />
            <div>
              <p className="font-semibold text-blue-900">{subscriberCount} Empfänger</p>
              <p className="text-sm text-blue-700">Der Newsletter wird an alle aktiven Abonnenten gesendet</p>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-800 mb-1">Wichtiger Hinweis:</p>
              <ul className="text-amber-700 space-y-1">
                <li>• Der Newsletter wird sofort an alle Empfänger versendet</li>
                <li>• Diese Aktion kann nicht rückgängig gemacht werden</li>
                <li>• Stellen Sie sicher, dass Betreff und Inhalt korrekt sind</li>
              </ul>
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Geben Sie "{requiredText}" ein, um den Versand zu bestätigen:</label>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder={requiredText}
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Abbrechen
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!isConfirmationValid || isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Wird gesendet...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Newsletter senden
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
