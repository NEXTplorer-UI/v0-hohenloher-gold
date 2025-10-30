import { Info } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function CustomArrangementNotice() {
  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">
              <strong>Wichtiger Hinweis:</strong> Bitte wählen Sie bei bestehenden individuellen Vereinbarungen (z.B.
              Übergabeorte, Abholung bei Nachbar etc.) <strong>Abholung</strong> aus und schreiben Sie Ihr Anliegen in
              die Kommentarspalte.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
