"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"

interface InventoryHistoryExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExport: (options: InventoryHistoryExportOptions) => Promise<void>
}

export interface InventoryHistoryExportOptions {
  groupBy: "none" | "product" | "category" | "reason" | "analysis"
  sortBy: "date" | "product" | "category" | "reason" | "quantity"
  sortOrder: "asc" | "desc"
  showSummary: boolean
  emptyLinesBetweenGroups: boolean
}

export function InventoryHistoryExportDialog({ open, onOpenChange, onExport }: InventoryHistoryExportDialogProps) {
  const [groupBy, setGroupBy] = useState<InventoryHistoryExportOptions["groupBy"]>("none")
  const [sortBy, setSortBy] = useState<InventoryHistoryExportOptions["sortBy"]>("date")
  const [sortOrder, setSortOrder] = useState<InventoryHistoryExportOptions["sortOrder"]>("desc")
  const [showSummary, setShowSummary] = useState(true)
  const [emptyLinesBetweenGroups, setEmptyLinesBetweenGroups] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await onExport({
        groupBy,
        sortBy,
        sortOrder,
        showSummary,
        emptyLinesBetweenGroups,
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
          <DialogTitle>Lagerhistorie Export-Optionen</DialogTitle>
          <DialogDescription>Wählen Sie die Sortierung und Gruppierung für den Export</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Grouping Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Gruppierung:</Label>
            <RadioGroup
              value={groupBy}
              onValueChange={(value) => setGroupBy(value as InventoryHistoryExportOptions["groupBy"])}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="group-none" />
                <Label htmlFor="group-none" className="font-normal cursor-pointer">
                  Keine Gruppierung
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="product" id="group-product" />
                <Label htmlFor="group-product" className="font-normal cursor-pointer">
                  Nach Produkt gruppieren
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="category" id="group-category" />
                <Label htmlFor="group-category" className="font-normal cursor-pointer">
                  Nach Kategorie gruppieren
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="reason" id="group-reason" />
                <Label htmlFor="group-reason" className="font-normal cursor-pointer">
                  Nach Grund (Ein-/Ausbuchung) gruppieren
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="analysis" id="group-analysis" />
                <Label htmlFor="group-analysis" className="font-normal cursor-pointer">
                  Analyseansicht (nach Produkt & Grund)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Sorting Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Sortierung:</Label>
            <RadioGroup
              value={sortBy}
              onValueChange={(value) => setSortBy(value as InventoryHistoryExportOptions["sortBy"])}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="date" id="sort-date" />
                <Label htmlFor="sort-date" className="font-normal cursor-pointer">
                  Datum
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="product" id="sort-product" />
                <Label htmlFor="sort-product" className="font-normal cursor-pointer">
                  Produktname
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="category" id="sort-category" />
                <Label htmlFor="sort-category" className="font-normal cursor-pointer">
                  Kategorie
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="reason" id="sort-reason" />
                <Label htmlFor="sort-reason" className="font-normal cursor-pointer">
                  Grund
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="quantity" id="sort-quantity" />
                <Label htmlFor="sort-quantity" className="font-normal cursor-pointer">
                  Menge
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Sort Order */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Reihenfolge:</Label>
            <RadioGroup value={sortOrder} onValueChange={(value) => setSortOrder(value as "asc" | "desc")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="asc" id="order-asc" />
                <Label htmlFor="order-asc" className="font-normal cursor-pointer">
                  Aufsteigend
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="desc" id="order-desc" />
                <Label htmlFor="order-desc" className="font-normal cursor-pointer">
                  Absteigend
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Additional Options */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Zusatzoptionen:</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="summary"
                  checked={showSummary}
                  onCheckedChange={(checked) => setShowSummary(checked as boolean)}
                />
                <Label htmlFor="summary" className="font-normal cursor-pointer">
                  Zusammenfassung anzeigen
                </Label>
              </div>
              {groupBy !== "none" && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="empty-lines-inventory"
                    checked={emptyLinesBetweenGroups}
                    onCheckedChange={(checked) => setEmptyLinesBetweenGroups(checked as boolean)}
                  />
                  <Label htmlFor="empty-lines-inventory" className="font-normal cursor-pointer">
                    Leerzeilen zwischen Gruppen
                  </Label>
                </div>
              )}
            </div>
          </div>
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
