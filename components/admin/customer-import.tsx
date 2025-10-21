"use client"
import { useState, useCallback } from "react"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Upload, FileUp, Trash2 } from "lucide-react"

interface Customer {
  first_name: string
  last_name: string
  email: string
  street?: string
  house_number?: string
  postal_code?: string
  city?: string
  phone?: string
  tags: string[]
}

interface CustomerImportProps {
  onImportComplete: () => void
  customersCount: number
}

export default function CustomerImport({ onImportComplete, customersCount }: CustomerImportProps) {
  const [importing, setImporting] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)

  const csvData = `1 Müller;Hans;hans.mueller@example.com;Bahnhofstraße;12;74074;Heilbronn;07131987654
2 Weber;Maria;maria.weber@example.com;Kirchgasse;5;74074;Heilbronn;07131456789
3 Schmidt;Peter;peter.schmidt@example.com;Hauptstraße;23;74072;Heilbronn;07131123456
4 Fischer;Anna;anna.fischer@example.com;Gartenstraße;8;74074;Heilbronn;07131654321
5 Bauer;Thomas;thomas.bauer@example.com;Schulstraße;15;74072;Heilbronn;07131789012`

  const mapColumnHeaders = (headers: string[]) => {
    const mapping: { [key: string]: number } = {}

    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().trim()

      // German column mappings
      if (normalizedHeader.includes("nachname") || normalizedHeader.includes("familienname")) {
        mapping.last_name = index
      } else if (
        normalizedHeader.includes("vorname") ||
        (normalizedHeader.includes("name") && normalizedHeader.includes("vor"))
      ) {
        mapping.first_name = index
      } else if (normalizedHeader.includes("email") || normalizedHeader.includes("e-mail")) {
        mapping.email = index
      } else if (
        normalizedHeader.includes("straße") ||
        normalizedHeader.includes("strasse") ||
        normalizedHeader.includes("street")
      ) {
        mapping.street = index
      } else if (
        normalizedHeader.includes("hausnummer") ||
        normalizedHeader.includes("nr") ||
        normalizedHeader.includes("number")
      ) {
        mapping.house_number = index
      } else if (
        normalizedHeader.includes("plz") ||
        normalizedHeader.includes("postleitzahl") ||
        normalizedHeader.includes("postal")
      ) {
        mapping.postal_code = index
      } else if (
        normalizedHeader.includes("ort") ||
        normalizedHeader.includes("stadt") ||
        normalizedHeader.includes("city")
      ) {
        mapping.city = index
      } else if (
        normalizedHeader.includes("telefon") ||
        normalizedHeader.includes("phone") ||
        normalizedHeader.includes("tel")
      ) {
        mapping.phone = index
      }

      // English column mappings (fallback)
      else if (normalizedHeader === "first_name" || normalizedHeader === "firstname") {
        mapping.first_name = index
      } else if (normalizedHeader === "last_name" || normalizedHeader === "lastname") {
        mapping.last_name = index
      }
    })

    return mapping
  }

  const parseCSVData = (text: string) => {
    const lines = text.trim().split("\n")

    if (lines.length === 0) {
      throw new Error("CSV-Datei ist leer")
    }

    const headerLine = lines[0]
    const headers = headerLine.split(";").map((h) => h.trim())
    const columnMapping = mapColumnHeaders(headers)

    // Check if we have essential columns
    if (columnMapping.first_name === undefined && columnMapping.last_name === undefined) {
      throw new Error(
        "Keine Namen-Spalten gefunden. Bitte stellen Sie sicher, dass Ihre CSV-Datei Spalten für Vor- und Nachname enthält.",
      )
    }

    const dataLines = lines.slice(1) // Skip header row

    const parsedCustomers = dataLines
      .map((line, index) => {
        const parts = line.split(";").map((p) => p.trim())

        if (parts.length < Math.max(...Object.values(columnMapping)) + 1) {
          return null
        }

        if (parts[0].includes("<=") || parts[0].includes("Summe") || parts[0].includes("Anzahl")) {
          return null
        }

        const firstName =
          columnMapping.first_name !== undefined
            ? parts[columnMapping.first_name]?.replace(/^\d+\s+/, "").trim() || ""
            : ""
        const lastName =
          columnMapping.last_name !== undefined
            ? parts[columnMapping.last_name]?.replace(/^\d+\s+/, "").trim() || ""
            : ""
        const email = columnMapping.email !== undefined ? parts[columnMapping.email]?.trim() || "" : ""
        const street = columnMapping.street !== undefined ? parts[columnMapping.street]?.trim() || null : null
        const houseNumber =
          columnMapping.house_number !== undefined ? parts[columnMapping.house_number]?.trim() || null : null
        const postalCode =
          columnMapping.postal_code !== undefined ? parts[columnMapping.postal_code]?.trim() || null : null
        const city = columnMapping.city !== undefined ? parts[columnMapping.city]?.trim() || null : null
        const phone = columnMapping.phone !== undefined ? parts[columnMapping.phone]?.trim() || null : null

        // Use either first name or last name if one is missing
        const finalFirstName = firstName || (lastName ? "" : "Unbekannt")
        const finalLastName = lastName || (firstName ? "" : "Unbekannt")

        if (!finalFirstName && !finalLastName) {
          return null
        }

        return {
          first_name: finalFirstName,
          last_name: finalLastName,
          email: email,
          street: street,
          house_number: houseNumber,
          postal_code: postalCode,
          city: city,
          phone: phone,
          tags: [],
        }
      })
      .filter((customer) => customer !== null)

    if (parsedCustomers.length === 0) {
      throw new Error("Keine gültigen Kundendaten in der CSV-Datei gefunden")
    }

    return parsedCustomers
  }

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      setImporting(true)

      try {
        const text = await file.text()
        const parsedCustomers = parseCSVData(text)

        const response = await fetch("/api/import-customers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ customers: parsedCustomers }),
        })

        if (!response.ok) {
          throw new Error("Failed to import customers")
        }

        const result = await response.json()

        alert(
          `${result.count} Kontakte erfolgreich importiert${result.duplicates > 0 ? `, ${result.duplicates} Duplikate übersprungen` : ""}`,
        )

        onImportComplete()
        event.target.value = ""
      } catch (error) {
        console.error("Error importing customers from file:", error)
        alert(`Fehler beim Importieren: ${error.message}`)
      } finally {
        setImporting(false)
      }
    },
    [onImportComplete],
  )

  const importCustomersFromCSV = useCallback(async () => {
    setImporting(true)

    try {
      const parsedCustomers = parseCSVData(csvData)

      const response = await fetch("/api/import-customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ customers: parsedCustomers }),
      })

      if (!response.ok) {
        throw new Error("Failed to import customers")
      }

      const result = await response.json()

      alert(
        `${result.count} Kontakte erfolgreich importiert${result.duplicates > 0 ? `, ${result.duplicates} Duplikate übersprungen` : ""}`,
      )

      onImportComplete()
    } catch (error) {
      console.error("Error importing customers:", error)
      alert(`Fehler beim Importieren: ${error.message}`)
    } finally {
      setImporting(false)
    }
  }, [onImportComplete])

  const deleteAllCustomers = useCallback(async () => {
    if (
      !confirm(
        "Sind Sie sicher, dass Sie alle Kundendaten löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.",
      )
    ) {
      return
    }

    setDeletingAll(true)
    try {
      const response = await fetch("/api/delete-all-customers", {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete customers")
      }

      const result = await response.json()
      alert(`${result.deleted} Kunden erfolgreich gelöscht`)
      onImportComplete()
    } catch (error) {
      console.error("Error deleting customers:", error)
      alert(`Fehler beim Löschen: ${error.message}`)
    } finally {
      setDeletingAll(false)
    }
  }, [onImportComplete])

  return (
    <div className="flex gap-2">
      <div className="relative">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={importing}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          id="csv-upload"
        />
        <Button asChild disabled={importing} size="sm">
          <label htmlFor="csv-upload" className="cursor-pointer">
            <FileUp className="w-4 h-4 mr-2" />
            {importing ? "Importiere..." : "CSV hochladen"}
          </label>
        </Button>
      </div>
      <Button onClick={importCustomersFromCSV} disabled={importing} size="sm">
        <Upload className="w-4 h-4 mr-2" />
        {importing ? "Importiere..." : "CSV Synchronisieren"}
      </Button>
      <Button
        onClick={deleteAllCustomers}
        disabled={deletingAll || customersCount === 0}
        variant="destructive"
        size="sm"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        {deletingAll ? "Lösche..." : "Alle löschen"}
      </Button>
    </div>
  )
}
