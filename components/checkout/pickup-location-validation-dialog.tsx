"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AlertCircle, MapPin } from "lucide-react"

interface DefaultLocation {
  id: string
  name: string
  address: string
  city: string
  displayName: string
}

interface PickupLocationValidationDialogProps {
  open: boolean
  onClose: () => void
  defaultLocation: DefaultLocation
  currentLocation: { id: string; name: string; city?: string } | null
  onConfirm: (action: {
    type: "use-default" | "keep-current" | "manual"
    manualInput?: string
    updateDefault?: boolean
  }) => void
  email: string
}

export function PickupLocationValidationDialog({
  open,
  onClose,
  defaultLocation,
  currentLocation,
  onConfirm,
  email,
}: PickupLocationValidationDialogProps) {
  const [selectedOption, setSelectedOption] = useState<"use-default" | "keep-current" | "manual">("use-default")
  const [manualInput, setManualInput] = useState("")
  const [shouldUpdateDefault, setShouldUpdateDefault] = useState<boolean | null>(null)

  const handleConfirm = () => {
    onConfirm({
      type: selectedOption,
      manualInput: selectedOption === "manual" ? manualInput : undefined,
      updateDefault: selectedOption === "keep-current" ? shouldUpdateDefault === true : undefined,
    })
    onClose()
  }

  const currentLocationDisplay = currentLocation
    ? `${currentLocation.name}${currentLocation.city ? ` - ${currentLocation.city}` : ""}`
    : "Unbekannter Abholort"

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95%] md:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-5 w-5" />
            Abweichender Abholort erkannt
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current vs Default */}
          <div className="space-y-3">
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Ihr Standard-Abholort ist:</p>
              <p className="font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {defaultLocation.displayName}
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-muted-foreground mb-1">Sie haben aktuell gewählt:</p>
              <p className="font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-600" />
                {currentLocationDisplay}
              </p>
            </div>
          </div>

          {/* Options */}
          <div className="border-t pt-4">
            <Label className="text-base font-semibold mb-3 block">Möchten Sie den Abholort korrigieren?</Label>

            <RadioGroup value={selectedOption} onValueChange={(value: any) => setSelectedOption(value)}>
              <div className="space-y-3">
                {/* Use Default */}
                <div className="flex items-start space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="use-default" id="use-default" className="mt-1" />
                  <Label htmlFor="use-default" className="cursor-pointer flex-1">
                    <span className="font-medium block">Ja, Standard-Abholort verwenden</span>
                    <span className="text-sm text-muted-foreground">({defaultLocation.displayName})</span>
                  </Label>
                </div>

                {/* Keep Current */}
                <div className="flex items-start space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="keep-current" id="keep-current" className="mt-1" />
                  <Label htmlFor="keep-current" className="cursor-pointer flex-1">
                    <span className="font-medium block">Nein, aktuelle Auswahl beibehalten</span>
                    <span className="text-sm text-muted-foreground">({currentLocationDisplay})</span>
                  </Label>
                </div>

                {/* Manual Input */}
                <div className="flex items-start space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="manual" id="manual" className="mt-1" />
                  <Label htmlFor="manual" className="cursor-pointer flex-1">
                    <span className="font-medium block mb-2">Manuell einen anderen Abholort eingeben</span>
                    {selectedOption === "manual" && (
                      <Input
                        placeholder="Abholort eingeben..."
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        className="mt-2"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Update Default Question (only show if "keep-current" selected) */}
          {selectedOption === "keep-current" && (
            <div className="border-t pt-4">
              <Label className="text-base font-semibold mb-3 block">Neuen Abholort als Standard festlegen?</Label>
              <RadioGroup
                value={shouldUpdateDefault === true ? "yes" : shouldUpdateDefault === false ? "no" : ""}
                onValueChange={(value) => setShouldUpdateDefault(value === "yes")}
              >
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="update-yes" />
                    <Label htmlFor="update-yes" className="cursor-pointer">
                      Ja, zukünftig immer an {currentLocationDisplay} abholen
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="update-no" />
                    <Label htmlFor="update-no" className="cursor-pointer">
                      Nein, nur für diese Bestellung an {currentLocationDisplay} abholen
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Confirm Button */}
          <div className="border-t pt-4">
            <Button onClick={handleConfirm} className="w-full" size="lg">
              Weiter mit Dateneingabe
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
