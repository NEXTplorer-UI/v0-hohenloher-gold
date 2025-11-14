"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from 'lucide-react'

interface ExportOptionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedOrderIds?: string[]
  onExport: (options: ExportOptions) => Promise<void>
}

export interface ExportOptions {
  format: "standard" | "by-customer" | "by-location" | "by-article" | "by-price-analysis"
  sorting: "order_number" | "customer_name" | "date" | "total" | "category" | "pickup_location" | "pickup_location_normalized"
  showSubtotals: boolean
  emptyLinesBetweenGroups: boolean
  showGroupHeaders: boolean
}

export function ExportOptionsDialog({ open, onOpenChange, selectedOrderIds, onExport }: ExportOptionsDialogProps) {
  const [format, setFormat] = useState<ExportOptions["format"]>("standard")
  const [sorting, setSorting] = useState<ExportOptions["sorting"]>("date")
  const [showSubtotals, setShowSubtotals] = useState(true)
  const [emptyLinesBetweenGroups, setEmptyLinesBetweenGroups] = useState(true)
  const [showGroupHeaders, setShowGroupHeaders] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await onExport({
        format,
        sorting,
        showSubtotals,
        emptyLinesBetweenGroups,
        showGroupHeaders,
      })
      onOpenChange(false)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export-Optionen</DialogTitle>
          <DialogDescription>
            {selectedOrderIds && selectedOrderIds.length > 0
              ? `${selectedOrderIds.length} ausgewählte Bestellung(en) exportieren`
              : "Alle Bestellungen exportieren"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Format:</Label>
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as ExportOptions["format"])}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="standard" id="format-standard" />
                <Label htmlFor="format-standard" className="font-normal cursor-pointer">
                  Standard CSV
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="by-customer" id="format-customer" />
                <Label htmlFor="format-customer" className="font-normal cursor-pointer">
                  Nach Kunde gruppiert
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="by-location" id="format-location" />
                <Label htmlFor="format-location" className="font-normal cursor-pointer">
                  Nach Abholort gruppiert
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="by-article" id="format-article" />
                <Label htmlFor="format-article" className="font-normal cursor-pointer">
                  Nach Artikel gruppiert (Kommissionierung)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="by-price-analysis" id="format-price-analysis" />
                <Label htmlFor="format-price-analysis" className="font-normal cursor-pointer">
                  Preisbasierte Analyse (kompakt)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Sorting Selection */}
          {format !== "by-price-analysis" && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Sortierung:</Label>
              <RadioGroup value={sorting} onValueChange={(value) => setSorting(value as ExportOptions["sorting"])}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="order_number" id="sort-order" />
                  <Label htmlFor="sort-order" className="font-normal cursor-pointer">
                    Bestellnummer
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="customer_name" id="sort-customer" />
                  <Label htmlFor="sort-customer" className="font-normal cursor-pointer">
                    Kundenname
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="date" id="sort-date" />
                  <Label htmlFor="sort-date" className="font-normal cursor-pointer">
                    Datum
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="total" id="sort-total" />
                  <Label htmlFor="sort-total" className="font-normal cursor-pointer">
                    Gesamtbetrag
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="category" id="sort-category" />
                  <Label htmlFor="sort-category" className="font-normal cursor-pointer">
                    Kategorien
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pickup_location" id="sort-location" />
                  <Label htmlFor="sort-location" className="font-normal cursor-pointer">
                    Abholort (alphabetisch)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pickup_location_normalized" id="sort-location-normalized" />
                  <Label htmlFor="sort-location-normalized" className="font-normal cursor-pointer">
                    Abholort normalisiert (alphabetisch)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Additional Options */}
          {format !== "standard" && format !== "by-price-analysis" && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Zusatzoptionen:</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="subtotals"
                    checked={showSubtotals}
                    onCheckedChange={(checked) => setShowSubtotals(checked as boolean)}
                  />
                  <Label htmlFor="subtotals" className="font-normal cursor-pointer">
                    Zwischensummen anzeigen
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="empty-lines"
                    checked={emptyLinesBetweenGroups}
                    onCheckedChange={(checked) => setEmptyLinesBetweenGroups(checked as boolean)}
                  />
                  <Label htmlFor="empty-lines" className="font-normal cursor-pointer">
                    Leerzeilen zwischen Gruppen
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="group-headers"
                    checked={showGroupHeaders}
                    onCheckedChange={(checked) => setShowGroupHeaders(checked as boolean)}
                  />
                  <Label htmlFor="group-headers" className="font-normal cursor-pointer">
                    Gruppenüberschriften
                  </Label>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Abbrechen
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exportiere...
              </>
            ) : (
              "Exportieren"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
