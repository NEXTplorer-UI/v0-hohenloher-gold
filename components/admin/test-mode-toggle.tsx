"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"

export function TestModeToggle() {
  const [testMode, setTestMode] = useState(false)

  // Load test mode from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem("admin_test_mode")
    setTestMode(savedMode === "true")
  }, [])

  const handleToggle = (checked: boolean) => {
    setTestMode(checked)
    localStorage.setItem("admin_test_mode", checked.toString())

    // Dispatch custom event so other components can react
    window.dispatchEvent(new CustomEvent("testModeChanged", { detail: { enabled: checked } }))
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Switch id="test-mode" checked={testMode} onCheckedChange={handleToggle} />
        <Label htmlFor="test-mode" className="cursor-pointer">
          Test-Modus
        </Label>
      </div>

      {testMode && (
        <Alert variant="destructive" className="py-2 px-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            TEST-MODUS AKTIV - Alle Bestellungen werden als Test markiert
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// Hook to check if test mode is enabled
export function useTestMode() {
  const [testMode, setTestMode] = useState(false)

  useEffect(() => {
    // Initial load
    const savedMode = localStorage.getItem("admin_test_mode")
    setTestMode(savedMode === "true")

    // Listen for changes
    const handleTestModeChange = (e: CustomEvent) => {
      setTestMode(e.detail.enabled)
    }

    window.addEventListener("testModeChanged", handleTestModeChange as EventListener)

    return () => {
      window.removeEventListener("testModeChanged", handleTestModeChange as EventListener)
    }
  }, [])

  return testMode
}
