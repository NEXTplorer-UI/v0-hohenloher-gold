"use client"
import { useState, useMemo } from "react"
import { DialogFooter } from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import useSWR from "swr"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  type SortingState,
  type ColumnOrderState,
  createColumnHelper,
} from "@tanstack/react-table"
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Download, GripVertical, Settings, FileSpreadsheet, Plus, Trash2 } from "lucide-react"
import ExcelJS from "exceljs"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

const AVAILABLE_COLUMNS = [
  { id: "order_number", label: "Bestellnummer", type: "string" },
  { id: "customer_name", label: "Kundenname", type: "string" },
  { id: "customer_email", label: "Email", type: "string" },
  { id: "customer_phone", label: "Telefon", type: "string" },
  { id: "customer_postal_code", label: "PLZ", type: "string" },
  { id: "customer_street", label: "Straße", type: "string" },
  { id: "customer_city", label: "Stadt", type: "string" },
  { id: "customer_address", label: "Vollständige Adresse", type: "string" },
  { id: "pickup_location_normalized", label: "Abholort", type: "string" },
  { id: "distribution_person", label: "Verteilperson", type: "string" },
  { id: "status", label: "Status", type: "string" },
  { id: "internal_status", label: "Interner Status", type: "string" }, // Added internal_status
  { id: "payment_method", label: "Zahlungsart", type: "string" },
  { id: "products", label: "Produkte", type: "string" },
  { id: "product_count", label: "Produktanzahl", type: "number" },
  { id: "total", label: "Gesamtbetrag", type: "number" },
  { id: "created_at", label: "Datum", type: "date" },
  { id: "notes", label: "Notizen", type: "string" },
  { id: "admin_notes", label: "Admin-Notizen", type: "string" }, // Added admin_notes
  { id: "special_requests", label: "Sonderwünsche", type: "string" }, // Added special_requests
  { id: "product_category", label: "Warengruppe", type: "string" },
  // NEW COLUMNS FOR MONTH AND DELIVERY METHOD
  { id: "pickup_month", label: "Abholmonat", type: "string" },
  { id: "order_month", label: "Bestellmonat", type: "string" },
  { id: "delivery_method", label: "Lieferart", type: "string" },
]

// const TEMPLATES = [
//   {
//     id: "tour-picking",
//     name: "Tour-Kommissionierung",
//     description: "Gruppiert nach Abholort, zeigt Produkte und Mengen",
//     columns: ["pickup_location_normalized", "products", "product_count", "customer_name"],
//     groupBy: ["pickup_location_normalized"],
//     aggregations: [{ field: "product_count", function: "sum" }],
//   },
//   {
//     id: "packing-list",
//     name: "Packliste",
//     description: "Pro Verteilperson, sortiert nach Abholort",
//     columns: ["distribution_person", "pickup_location_normalized", "customer_name", "products", "total"],
//     groupBy: ["pickup_location_normalized"],
//     aggregations: [{ field: "total", function: "sum" }],
//   },
//   {
//     id: "customer-overview",
//     name: "Kundenübersicht",
//     description: "Alle Bestellungen gruppiert nach Kunde",
//     columns: ["customer_name", "customer_phone", "order_number", "pickup_location_normalized", "total"],
//     groupBy: ["customer_name"],
//     aggregations: [{ field: "total", function: "sum" }],
//   },
//   {
//     id: "location-analysis",
//     name: "Abholort-Analyse",
//     description: "Statistiken pro Abholort",
//     columns: ["pickup_location_normalized", "customer_name", "product_count", "total"],
//     groupBy: ["pickup_location_normalized"],
//     aggregations: [
//       { field: "product_count", function: "sum" },
//       { field: "total", function: "sum" },
//     ],
//   },
//   {
//     id: "payment-overview",
//     name: "Zahlungsübersicht",
//     description: "Gruppiert nach Zahlungsart",
//     columns: ["payment_method", "customer_name", "order_number", "total", "payment_status"],
//     groupBy: ["payment_method"],
//     aggregations: [{ field: "total", function: "sum" }],
//   },
// ]

interface ExcelExportOptions {
  // Text-Formatierung
  wrapText: boolean
  fontSize: 10 | 11 | 12 | 14
  fontFamily: "Arial" | "Calibri" | "Times New Roman"

  // Spalten
  autoWidth: boolean

  // Zeilen
  headerBackground: string
  headerBold: boolean
  alternatingRows: boolean

  // Gruppierung
  preserveGrouping: boolean
  groupBackground: string

  // Summen/Aggregationen
  includeAggregations: boolean
  aggregationBackground: string

  // Rahmen
  showBorders: boolean
  borderStyle: "thin" | "medium" | "thick"
}
function parseAndAccumulateProducts(row: any, totals: Record<string, number>) {
  const text = row.products
  if (!text || typeof text !== "string") return

  // Aktuell trennst du in der UI ja mit Kommas -> wiederverwenden
  const parts = text
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)

  for (const part of parts) {
    // Versuche: "3x Orange", "3× Orange", "3 Orange"
    const match = part.match(/^(\d+)\s*[x×]?\s*(.+)$/i)
    let qty = 1
    let name = part

    if (match) {
      qty = Number.parseInt(match[1], 10) || 1
      name = match[2].trim()
    }

    if (!name) continue
    totals[name] = (totals[name] ?? 0) + qty
  }
}

function addProductTotalsPerGroup(rows: any[], groupBy: string[], enabled: boolean): any[] {
  // Wenn nicht gruppiert oder ausgeschaltet: Originaldaten zurückgeben
  if (!enabled || !rows || !rows.length || groupBy.length === 0) {
    return rows || []
  }

  const result: any[] = []
  let currentTotals: Record<string, number> = {}
  let inGroup = false

  for (const row of rows) {
    if (row._isGroup) {
      // Neue Gruppe beginnt -> vorherige Gruppe zurücksetzen
      currentTotals = {}
      inGroup = true
      result.push(row)
      continue
    }

    if (row._isAggregation) {
      // Aggregationszeile: Produktsummen hinzufügen
      const entries = Object.entries(currentTotals)
      if (entries.length > 0) {
        const productsText = entries
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, qty]) => `${qty}× ${name}`)
          .join(", ")

        row.product_summary = productsText
      }

      result.push(row)
      currentTotals = {}
      inGroup = false
      continue
    }

    // Normale Datenzeilen: Produkte sammeln
    if (inGroup) {
      parseAndAccumulateProducts(row, currentTotals)
    }

    result.push(row)
  }

  return result
}

function calculateGrandTotal(rows: any[]): Record<string, number> {
  const totals: Record<string, number> = {}

  for (const row of rows) {
    // Skip special rows, only process actual order data
    if (row._isGroup || row._isAggregation) continue
    parseAndAccumulateProducts(row, totals)
  }

  return totals
}

const columnHelper = createColumnHelper<any>() // Added for typed columns

export default function ReportBuilder() {
  const [selectedPreset, setSelectedPreset] = useState<string>("")
  const [showSavePresetDialog, setShowSavePresetDialog] = useState(false)
  const [presetName, setPresetName] = useState("")
  const [presetDescription, setPresetDescription] = useState("")
  const [isSavingPreset, setIsSavingPreset] = useState(false)

  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    "order_number",
    "customer_name",
    "pickup_location_normalized",
    "total",
  ])

  const [groupBy, setGroupBy] = useState<string[]>([])
  const [aggregations, setAggregations] = useState<any[]>([])
  const [filters, setFilters] = useState<any>({
    deliveryType: [],
    paymentMethod: [],
    pickupLocations: [],
    tours: [],
    months: [],
    statuses: [],
    dateRange: { start: null, end: null }, // Date range filter
  })

  const [isExporting, setIsExporting] = useState(false)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  // Initialize columnOrderState with ALL available column IDs
  const [columnOrderState, setColumnOrderState] = useState<ColumnOrderState>(AVAILABLE_COLUMNS.map((col) => col.id))
  const [showAggregations, setShowAggregations] = useState(true)
  const [wrapText, setWrapText] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showGrandTotal, setShowGrandTotal] = useState(false)

  const [showExcelOptionsDialog, setShowExcelOptionsDialog] = useState(false)
  const [excelOptions, setExcelOptions] = useState<ExcelExportOptions>({
    wrapText: true,
    fontSize: 11,
    fontFamily: "Calibri",
    autoWidth: true,
    headerBackground: "#e5e7eb",
    headerBold: true,
    alternatingRows: true,
    preserveGrouping: true,
    groupBackground: "#f3f4f6",
    includeAggregations: true,
    aggregationBackground: "#dbeafe",
    showBorders: true,
    borderStyle: "thin",
  })

  const { data: presetsData, mutate: mutatePresets } = useSWR(
    "/api/admin/report-presets",
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) return { presets: [] }
      return res.json()
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )

  const presets = presetsData?.presets || []

  const { data: pickupLocationsData } = useSWR(
    "/api/admin/pickup-locations",
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) return { locations: [] }
      return res.json()
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    },
  )

  const { data: toursData } = useSWR(
    "/api/admin/delivery-routes",
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) return { routes: [] }
      return res.json()
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    },
  )

  const pickupLocations = Array.isArray(pickupLocationsData?.locations)
    ? pickupLocationsData.locations.filter((loc: any) => loc.is_active)
    : []

  const tours = Array.isArray(toursData?.routes) ? toursData.routes.filter((route: any) => route.is_active) : []

  const loadPreset = (presetId: string) => {
    const preset = presets.find((p: any) => p.id === presetId)
    if (preset) {
      setSelectedPreset(presetId)
      setSelectedColumns(preset.columns || [])
      setColumnOrderState(preset.column_order || preset.columns || AVAILABLE_COLUMNS.map((col) => col.id)) // Fallback to all columns
      setColumnWidths(preset.column_widths || {})
      setGroupBy(preset.group_by || [])
      setAggregations(preset.aggregations || [])
      setShowAggregations(preset.show_aggregations ?? true)
      setWrapText(preset.wrap_text ?? false)
      setFilters(
        preset.filters || {
          deliveryType: [],
          paymentMethod: [],
          pickupLocations: [],
          tours: [],
          months: [],
          statuses: [],
          dateRange: { start: null, end: null },
        },
      )

      if (preset.excel_options) {
        setExcelOptions(preset.excel_options)
      }

      toast.success(`Vorlage "${preset.name}" geladen`)
    }
  }

  const savePreset = async () => {
    if (!presetName.trim()) {
      toast.error("Bitte geben Sie einen Namen ein")
      return
    }

    setIsSavingPreset(true)
    try {
      const response = await fetch("/api/admin/report-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: presetName,
          description: presetDescription,
          columns: selectedColumns,
          column_order: columnOrderState,
          column_widths: columnWidths,
          filters,
          group_by: groupBy,
          aggregations,
          show_aggregations: showAggregations,
          wrap_text: wrapText,
          excel_options: excelOptions,
        }),
      })

      if (!response.ok) throw new Error("Failed to save preset")

      const { preset } = await response.json()
      await mutatePresets()
      setSelectedPreset(preset.id)
      setShowSavePresetDialog(false)
      setPresetName("")
      setPresetDescription("")
      toast.success("Vorlage gespeichert")
    } catch (error) {
      console.error("Error saving preset:", error)
      toast.error("Fehler beim Speichern")
    } finally {
      setIsSavingPreset(false)
    }
  }

  const deletePreset = async (presetId: string) => {
    if (!confirm("Möchten Sie diese Vorlage wirklich löschen?")) return

    try {
      const response = await fetch(`/api/admin/report-presets/${presetId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete preset")

      await mutatePresets()
      if (selectedPreset === presetId) {
        setSelectedPreset("")
      }
      toast.success("Vorlage gelöscht")
    } catch (error) {
      console.error("Error deleting preset:", error)
      toast.error("Fehler beim Löschen")
    }
  }

  const toggleColumn = (columnId: string) => {
    setSelectedColumns((prev) => {
      const prevArray = Array.isArray(prev) ? prev : []
      return prevArray.includes(columnId) ? prevArray.filter((id) => id !== columnId) : [...prevArray, columnId]
    })
  }

  const toggleGroupBy = (columnId: string) => {
    setGroupBy((prev) => (prev.includes(columnId) ? prev.filter((id) => id !== columnId) : [...prev, columnId]))
  }

  const toggleFilter = (filterType: string, value: string) => {
    setFilters((prev: any) => {
      const current = prev[filterType] || []
      return {
        ...prev,
        [filterType]: current.includes(value) ? current.filter((v: string) => v !== value) : [...current, value],
      }
    })
  }

  const exportToCSV = async () => {
    setIsExporting(true)
    try {
      const rows = dataWithProductTotals || []
      const headers = selectedColumns.map((colId) => AVAILABLE_COLUMNS.find((c) => c.id === colId)?.label || colId)

      const csvContent = [
        headers.join(";"),
        ...rows.map((row: any) =>
          selectedColumns
            .map((colId) => {
              const value = row[colId]
              return `"${String(value || "").replace(/"/g, '""')}"`
            })
            .join(";"),
        ),
      ].join("\n")

      const BOM = "\uFEFF"
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `report-${new Date().toISOString().split("T")[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }

  const exportToExcel = async () => {
    setIsExporting(true)
    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet("Report")

      const rows = dataWithProductTotals || []
      const headers = selectedColumns.map((colId) => AVAILABLE_COLUMNS.find((c) => c.id === colId)?.label || colId)

      // Header Row mit Formatierung aus Options
      const headerRow = worksheet.addRow(headers)
      headerRow.font = {
        bold: excelOptions.headerBold,
        size: excelOptions.fontSize,
        name: excelOptions.fontFamily,
      }
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF" + excelOptions.headerBackground.replace("#", "") },
      }

      // Rahmen für Header
      if (excelOptions.showBorders) {
        headerRow.eachCell((cell) => {
          cell.border = {
            top: { style: excelOptions.borderStyle },
            left: { style: excelOptions.borderStyle },
            bottom: { style: excelOptions.borderStyle },
            right: { style: excelOptions.borderStyle },
          }
        })
      }

      // Datenzeilen mit Formatierung
      rows.forEach((row: any, idx: number) => {
        const rowData = selectedColumns.map((colId) => {
          if (row._isAggregation && colId === "products" && row.product_summary) {
            return row.product_summary
          }
          // Handle new columns
          if (row._isGroup && (colId === "admin_notes" || colId === "special_requests")) return ""
          if (row._isAggregation && (colId === "admin_notes" || colId === "special_requests")) return ""
          if (row._isGroup && colId === "internal_status") return ""

          const value = row[colId]
          return value ?? ""
        })
        const excelRow = worksheet.addRow(rowData)

        excelRow.font = {
          size: excelOptions.fontSize,
          name: excelOptions.fontFamily,
        }

        // Gruppierungs-Styling
        if (row._isGroup && excelOptions.preserveGrouping) {
          excelRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF" + excelOptions.groupBackground.replace("#", "") },
          }
          excelRow.font = { bold: true, size: excelOptions.fontSize, name: excelOptions.fontFamily }
        } else if (row._isAggregation && excelOptions.includeAggregations) {
          excelRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF" + excelOptions.aggregationBackground.replace("#", "") },
          }
          excelRow.font = { bold: true, size: excelOptions.fontSize, name: excelOptions.fontFamily }
        }
        // Abwechselnde Zeilen
        else if (excelOptions.alternatingRows && idx % 2 === 1) {
          excelRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF9FAFB" },
          }
        }

        // Rahmen
        if (excelOptions.showBorders) {
          excelRow.eachCell((cell) => {
            cell.border = {
              top: { style: excelOptions.borderStyle },
              left: { style: excelOptions.borderStyle },
              bottom: { style: excelOptions.borderStyle },
              right: { style: excelOptions.borderStyle },
            }
          })
        }

        // Text-Wrapping
        if (excelOptions.wrapText) {
          excelRow.alignment = { wrapText: true, vertical: "top" }
        }
      })

      if (grandTotal && Object.keys(grandTotal).length > 0) {
        // Empty row for separation
        worksheet.addRow([])

        // Grand total header row
        const grandTotalHeaderRow = worksheet.addRow(["GESAMTSUMME ALLER PRODUKTE"])
        grandTotalHeaderRow.font = {
          bold: true,
          size: excelOptions.fontSize + 2,
          name: excelOptions.fontFamily,
        }
        grandTotalHeaderRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFDE047" }, // Yellow background
        }

        // Merge cells for header
        worksheet.mergeCells(grandTotalHeaderRow.number, 1, grandTotalHeaderRow.number, selectedColumns.length)

        // Grand total products row
        const entries = Object.entries(grandTotal)
        const grandTotalText = entries
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, qty]) => `${qty}× ${name}`)
          .join(", ")

        const grandTotalRow = worksheet.addRow([grandTotalText])
        grandTotalRow.font = {
          size: excelOptions.fontSize,
          name: excelOptions.fontFamily,
        }
        grandTotalRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFEF3C7" }, // Light yellow background
        }

        // Merge cells for products
        worksheet.mergeCells(grandTotalRow.number, 1, grandTotalRow.number, selectedColumns.length)
        grandTotalRow.alignment = { wrapText: true, vertical: "top" }
      }

      // Spaltenbreiten
      if (excelOptions.autoWidth) {
        worksheet.columns.forEach((column) => {
          let maxLength = 10
          if (column && column.eachCell) {
            column.eachCell({ includeEmpty: false }, (cell) => {
              const cellValue = cell.value ? cell.value.toString() : ""
              maxLength = Math.max(maxLength, cellValue.length)
            })
          }
          if (column) {
            column.width = Math.min(maxLength + 2, 50)
          }
        })
      }

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `report-${new Date().toISOString().split("T")[0]}.xlsx`
      link.click()
      URL.revokeObjectURL(url)

      setShowExcelOptionsDialog(false)
    } catch (error) {
      console.error("[v0] Excel export error:", error)
    } finally {
      setIsExporting(false)
    }
  }

  const reportConfig = useMemo(() => {
    return {
      columns: selectedColumns,
      groupBy,
      filters,
      aggregations,
      showAggregations,
    }
  }, [selectedColumns, groupBy, filters, aggregations, showAggregations])

  const swrKey = useMemo(() => {
    return ["/api/admin/reports/dynamic", JSON.stringify(reportConfig)]
  }, [reportConfig])

  const {
    data: reportData,
    error: reportError,
    isLoading,
  } = useSWR(swrKey, async (url) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reportConfig),
    })

    if (!response.ok) {
      throw new Error("Failed to fetch report")
    }

    return await response.json()
  })

  const dataWithProductTotals = useMemo(() => {
    const base = reportData?.data || []
    return addProductTotalsPerGroup(base, groupBy, showAggregations)
  }, [reportData?.data, groupBy, showAggregations])

  const grandTotal = useMemo(() => {
    if (!showGrandTotal || !reportData?.data) return null
    return calculateGrandTotal(reportData.data)
  }, [showGrandTotal, reportData?.data])

  // Updated columns useMemo to properly filter by selectedColumns and use columnHelper
  const columns = useMemo(() => {
    if (!reportData?.data) return []

    const baseColumns = AVAILABLE_COLUMNS.filter((col) => selectedColumns.includes(col.id))
      .filter((col) => columnOrderState.includes(col.id)) // Ensure column is in order state
      .sort((a, b) => columnOrderState.indexOf(a.id) - columnOrderState.indexOf(b.id)) // Sort based on columnOrderState
      .map((col) =>
        columnHelper.accessor(col.id, {
          header: col.label,
          cell: (info) => {
            const row = info.row.original
            const value = row[col.id]

            // Handle special rows (group, aggregation)
            if (row._isGroup) {
              // Display group value only for the first grouping column
              return col.id === groupBy[0] ? <span className="font-bold">{value}</span> : null
            }

            if (row._isAggregation) {
              // Display product summary for aggregation rows
              if (col.id === "products" && row.product_summary) {
                return <span className="text-blue-600 italic pl-4">{row.product_summary}</span>
              }
              // Display aggregated values
              return <span className="font-semibold">{value}</span>
            }

            // Handle specific column types for display
            if (col.type === "number") {
              return typeof value === "number" ? value.toFixed(2) : ""
            }

            if (col.type === "date") {
              return value ? new Date(value).toLocaleDateString("de-DE") : ""
            }

            // Handle new columns with specific display logic if needed
            if (col.id === "admin_notes" || col.id === "special_requests") {
              return <span className="text-muted-foreground italic">{value || "-"}</span>
            }

            // Display values for new columns
            if (col.id === "pickup_month" || col.id === "order_month") {
              return value ? new Date(value).toLocaleDateString("de-DE", { month: "long" }) : ""
            }

            if (col.id === "delivery_method") {
              switch (value) {
                case "pickup":
                  return "Abholung"
                case "shipping":
                  return "Lieferung"
                default:
                  return value || "-"
              }
            }

            // Default display for string types
            return value || ""
          },
          size: columnWidths[col.id] || 150, // Use size from columnWidths state
        }),
      )

    return baseColumns
  }, [reportData?.data, selectedColumns, columnOrderState, columnWidths, groupBy, columnHelper]) // Added columnHelper to dependency array

  const table = useReactTable({
    data: dataWithProductTotals,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  })

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(columnOrderState)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setColumnOrderState(items)
  }

  if (!selectedColumns || selectedColumns.length === 0) {
    return <div className="p-8">Lade Report Builder...</div>
  }

  const GROUP_BY_OPTIONS = [
    { value: "pickup_location_normalized", label: "Abholort" },
    { value: "distribution_person", label: "Verteilperson" },
    { value: "product_category", label: "Warengruppe" },
    { value: "pickup_month", label: "Abholmonat" },
    { value: "order_month", label: "Bestellmonat" },
    { value: "delivery_method", label: "Lieferart (Abholung/Lieferung)" },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Report Builder</CardTitle>
          <CardDescription>
            Erstellen Sie benutzerdefinierte Reports mit flexiblen Filtern und Gruppierungen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Vorlagen</Label>
            <div className="flex gap-2">
              <Select value={selectedPreset} onValueChange={loadPreset}>
                <SelectTrigger>
                  <SelectValue placeholder="Vorlage auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((preset: any) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{preset.name}</span>
                        {preset.description && (
                          <span className="text-xs text-muted-foreground">{preset.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowSavePresetDialog(true)}
                title="Aktuelle Konfiguration als Vorlage speichern"
              >
                <Plus className="h-4 w-4" />
              </Button>

              {selectedPreset && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => deletePreset(selectedPreset)}
                  title="Vorlage löschen"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Filter</CardTitle>
              <CardDescription>Wählen Sie die gewünschten Filter für den Report</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Datumsbereich (Abholdatum)</Label>
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Label htmlFor="date-start" className="text-xs text-muted-foreground">
                      Von
                    </Label>
                    <Input
                      id="date-start"
                      type="date"
                      value={filters.dateRange.start || ""}
                      onChange={(e) =>
                        setFilters((prev: any) => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, start: e.target.value || null },
                        }))
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="date-end" className="text-xs text-muted-foreground">
                      Bis
                    </Label>
                    <Input
                      id="date-end"
                      type="date"
                      value={filters.dateRange.end || ""}
                      onChange={(e) =>
                        setFilters((prev: any) => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, end: e.target.value || null },
                        }))
                      }
                    />
                  </div>
                  {(filters.dateRange.start || filters.dateRange.end) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setFilters((prev: any) => ({
                          ...prev,
                          dateRange: { start: null, end: null },
                        }))
                      }
                      className="mt-5"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Lieferart</Label>
                <div className="space-y-1">
                  {["pickup", "shipping"].map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`delivery-${type}`}
                        checked={filters.deliveryType.includes(type)}
                        onCheckedChange={(checked) => {
                          setFilters((prev: any) => ({
                            ...prev,
                            deliveryType: checked
                              ? [...prev.deliveryType, type]
                              : prev.deliveryType.filter((t: string) => t !== type),
                          }))
                        }}
                      />
                      <Label htmlFor={`delivery-${type}`} className="font-normal">
                        {type === "pickup" ? "Abholung" : "Lieferung"}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm mb-2 block">Zahlungsart</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="filter-cash"
                      checked={filters.paymentMethod?.includes("cash")}
                      onCheckedChange={() => toggleFilter("paymentMethod", "cash")}
                    />
                    <Label htmlFor="filter-cash" className="text-sm cursor-pointer">
                      Bar
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="filter-bank"
                      checked={filters.paymentMethod?.includes("bank_transfer")}
                      onCheckedChange={() => toggleFilter("paymentMethod", "bank_transfer")}
                    />
                    <Label htmlFor="filter-bank" className="text-sm cursor-pointer">
                      Überweisung
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="filter-card"
                      checked={filters.paymentMethod?.includes("card")}
                      onCheckedChange={() => toggleFilter("paymentMethod", "card")}
                    />
                    <Label htmlFor="filter-card" className="text-sm cursor-pointer">
                      Karte
                    </Label>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm mb-2 block">Abholort</Label>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {pickupLocations.map((location) => (
                      <div key={location.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`filter-location-${location.id}`}
                          checked={filters.pickupLocations?.includes(location.id)}
                          onCheckedChange={() => toggleFilter("pickupLocations", location.id)}
                        />
                        <Label htmlFor={`filter-location-${location.id}`} className="text-sm cursor-pointer">
                          {location.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div>
                <Label className="text-sm mb-2 block">Tour</Label>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {tours.map((tour) => (
                      <div key={tour.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`filter-tour-${tour.id}`}
                          checked={filters.tours?.includes(tour.id)}
                          onCheckedChange={() => toggleFilter("tours", tour.id)}
                        />
                        <Label htmlFor={`filter-tour-${tour.id}`} className="text-sm cursor-pointer">
                          {tour.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div>
                <Label className="text-sm mb-2 block">Monat</Label>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <div key={month} className="flex items-center space-x-2">
                        <Checkbox
                          id={`filter-month-${month}`}
                          checked={filters.months?.includes(month.toString().padStart(2, "0"))}
                          onCheckedChange={() => toggleFilter("months", month.toString().padStart(2, "0"))}
                        />
                        <Label htmlFor={`filter-month-${month}`} className="text-sm cursor-pointer">
                          {new Date(0, month - 1).toLocaleString("de-DE", { month: "long" })}
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div>
                <Label className="text-sm mb-2 block">Status</Label>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {[
                      { value: "pending", label: "Ausstehend" },
                      { value: "confirmed", label: "Bestätigt" },
                      { value: "ready", label: "Abholbereit" },
                      { value: "completed", label: "Abgeschlossen" },
                      { value: "cancelled", label: "Storniert" },
                    ].map((status) => (
                      <div key={status.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`filter-status-${status.value}`}
                          checked={filters.statuses?.includes(status.value)}
                          onCheckedChange={() => toggleFilter("statuses", status.value)}
                        />
                        <Label htmlFor={`filter-status-${status.value}`} className="text-sm cursor-pointer">
                          {status.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          <div>
            <Label className="text-base font-semibold mb-3 block">Spaltenauswahl</Label>
            <ScrollArea className="h-64">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {AVAILABLE_COLUMNS.map((col) => (
                  <div key={col.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`col-${col.id}`}
                      checked={selectedColumns.includes(col.id)}
                      onCheckedChange={() => toggleColumn(col.id)}
                    />
                    <Label htmlFor={`col-${col.id}`} className="text-sm cursor-pointer">
                      {col.label}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div>
            <Label className="text-base font-semibold mb-3 block">Gruppierung</Label>
            <div className="space-y-2">
              {GROUP_BY_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`group-${option.value}`}
                    checked={groupBy.includes(option.value)}
                    onCheckedChange={() => toggleGroupBy(option.value)}
                  />
                  <Label htmlFor={`group-${option.value}`} className="cursor-pointer">
                    Nach {option.label} gruppieren
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-aggregations"
                checked={showAggregations}
                onCheckedChange={(checked) => setShowAggregations(!!checked)}
              />
              <Label htmlFor="show-aggregations" className="cursor-pointer">
                Gesamtsummen anzeigen (Produktmengen pro Gruppe)
              </Label>
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-grand-total"
                checked={showGrandTotal}
                onCheckedChange={(checked) => setShowGrandTotal(!!checked)}
              />
              <Label htmlFor="show-grand-total" className="cursor-pointer">
                Gesamtsumme aller Produkte anzeigen (unabhängig von Gruppierung, z.B. für Tourenplanung)
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Dialog open={isColumnSettingsOpen} onOpenChange={setIsColumnSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Spalten anpassen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Spalten-Anpassung</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Reihenfolge (Drag & Drop)</Label>
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="columns">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 mt-2">
                          {columnOrderState
                            .filter((col) => selectedColumns.includes(col)) // Only show selected columns in order
                            .map((col, index) => {
                              const colDef = AVAILABLE_COLUMNS.find((c) => c.id === col)
                              return (
                                <Draggable key={String(col)} draggableId={String(col)} index={index}>
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                                    >
                                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                                      <div className="flex-1">
                                        <div className="font-medium">{colDef?.label || col}</div>
                                        <div className="text-sm text-muted-foreground">
                                          Breite: {columnWidths[col] || 150}px
                                        </div>
                                      </div>
                                      <div className="w-64">
                                        <Slider
                                          value={[columnWidths[col] || 150]}
                                          onValueChange={(value) =>
                                            setColumnWidths((prev) => ({ ...prev, [col]: value[0] }))
                                          }
                                          min={80}
                                          max={400}
                                          step={10}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              )
                            })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="mr-2 h-4 w-4" />
                Export-Vorschau
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Export-Vorschau</DialogTitle>
                <DialogDescription>
                  Vorschau des Reports vor dem Export. Wählen Sie das gewünschte Format.
                </DialogDescription>
              </DialogHeader>

              <div className="border rounded-lg p-4 bg-white shadow-sm overflow-x-auto">
                <div className="print:block">
                  <Table>
                    <TableHeader>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <TableHead key={header.id} style={{ width: header.getSize() }}>
                              {header.isPlaceholder
                                ? null
                                : flexRender(header.column.columnDef.header, header.getContext())}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                          <TableRow
                            key={row.id}
                            className={
                              row.original._isGroup
                                ? "bg-slate-200 font-bold"
                                : row.original._isProductTotal
                                  ? "bg-blue-50"
                                  : row.original._isAggregation
                                    ? "bg-primary/5 font-semibold"
                                    : ""
                            }
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id} style={{ width: cell.column.getSize() }}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={columns.length} className="h-24 text-center">
                            Keine Daten gefunden
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <DialogFooter className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <FileText className="mr-2 h-4 w-4" />
                    Als PDF drucken
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportToExcel}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Als Excel exportieren
                  </Button>
                </div>
                <Button variant="ghost" onClick={() => setShowPreview(false)}>
                  Schließen
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog> */}
        </div>

        <Button onClick={exportToCSV} disabled={!reportData?.data?.length} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Als CSV exportieren
        </Button>
        <Button onClick={() => setShowExcelOptionsDialog(true)} disabled={!reportData?.data?.length} variant="outline">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Als Excel exportieren
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vorschau</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <div className="text-center py-8 text-muted-foreground">Lade Daten...</div>}

          {reportError && (
            <div className="text-center py-8 text-destructive">Fehler beim Laden der Daten: {reportError.message}</div>
          )}

          {!isLoading && !reportError && reportData && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} style={{ width: header.getSize() }}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    <>
                      {table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                          className={
                            row.original._isGroup
                              ? "bg-slate-200 font-bold"
                              : row.original._isAggregation
                                ? "bg-primary/5 font-semibold"
                                : ""
                          }
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              style={{
                                width: cell.column.getSize(),
                                whiteSpace: wrapText ? "normal" : "nowrap",
                                wordBreak: wrapText ? "break-word" : "normal",
                              }}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}

                      {grandTotal && Object.keys(grandTotal).length > 0 && (
                        <>
                          <TableRow>
                            <TableCell colSpan={columns.length} className="h-4 border-t-2 border-slate-300" />
                          </TableRow>
                          <TableRow className="bg-yellow-50">
                            <TableCell colSpan={columns.length} className="font-bold text-lg py-3">
                              GESAMTSUMME ALLER PRODUKTE
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-yellow-50/50">
                            <TableCell colSpan={columns.length} className="py-3">
                              <div className="text-base">
                                {Object.entries(grandTotal)
                                  .sort(([a], [b]) => a.localeCompare(b))
                                  .map(([name, qty]) => `${qty}× ${name}`)
                                  .join(", ")}
                              </div>
                            </TableCell>
                          </TableRow>
                        </>
                      )}
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        Keine Daten gefunden
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showSavePresetDialog} onOpenChange={setShowSavePresetDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Vorlage speichern</DialogTitle>
            <DialogDescription>Speichern Sie die aktuelle Report-Konfiguration als Vorlage.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="presetName">Name</Label>
              <Input id="presetName" value={presetName} onChange={(e) => setPresetName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="presetDescription">Beschreibung (optional)</Label>
              <Input
                id="presetDescription"
                value={presetDescription}
                onChange={(e) => setPresetDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSavePresetDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={savePreset} disabled={isSavingPreset}>
              {isSavingPreset ? "Speichere..." : "Vorlage speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExcelOptionsDialog} onOpenChange={setShowExcelOptionsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Excel Export Einstellungen</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="formatting" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="formatting">Formatierung</TabsTrigger>
              <TabsTrigger value="columns">Spalten</TabsTrigger>
              <TabsTrigger value="colors">Farben</TabsTrigger>
            </TabsList>

            <TabsContent value="formatting" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="wrapText">Zeilenumbruch in Zellen</Label>
                  <Switch
                    id="wrapText"
                    checked={excelOptions.wrapText}
                    onCheckedChange={(checked) => setExcelOptions({ ...excelOptions, wrapText: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="headerBold">Fette Überschriften</Label>
                  <Switch
                    id="headerBold"
                    checked={excelOptions.headerBold}
                    onCheckedChange={(checked) => setExcelOptions({ ...excelOptions, headerBold: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="alternatingRows">Abwechselnde Zeilenfarben</Label>
                  <Switch
                    id="alternatingRows"
                    checked={excelOptions.alternatingRows}
                    onCheckedChange={(checked) => setExcelOptions({ ...excelOptions, alternatingRows: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fontFamily">Schriftart</Label>
                  <Select
                    value={excelOptions.fontFamily}
                    onValueChange={(value: any) => setExcelOptions({ ...excelOptions, fontFamily: value })}
                  >
                    <SelectTrigger id="fontFamily">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Calibri">Calibri</SelectItem>
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fontSize">Schriftgröße</Label>
                  <Select
                    value={excelOptions.fontSize.toString()}
                    onValueChange={(value) =>
                      setExcelOptions({ ...excelOptions, fontSize: Number.parseInt(value) as any })
                    }
                  >
                    <SelectTrigger id="fontSize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="11">11</SelectItem>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="14">14</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="columns" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoWidth">Automatische Spaltenbreite</Label>
                  <Switch
                    id="autoWidth"
                    checked={excelOptions.autoWidth}
                    onCheckedChange={(checked) => setExcelOptions({ ...excelOptions, autoWidth: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="showBorders">Zellenrahmen anzeigen</Label>
                  <Switch
                    id="showBorders"
                    checked={excelOptions.showBorders}
                    onCheckedChange={(checked) => setExcelOptions({ ...excelOptions, showBorders: checked })}
                  />
                </div>

                {excelOptions.showBorders && (
                  <div className="space-y-2">
                    <Label htmlFor="borderStyle">Rahmendicke</Label>
                    <Select
                      value={excelOptions.borderStyle}
                      onValueChange={(value: any) => setExcelOptions({ ...excelOptions, borderStyle: value })}
                    >
                      <SelectTrigger id="borderStyle">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="thin">Dünn</SelectItem>
                        <SelectItem value="medium">Mittel</SelectItem>
                        <SelectItem value="thick">Dick</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="colors" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="headerBackground">Header-Hintergrund</Label>
                  <div className="flex gap-2">
                    <Input
                      id="headerBackground"
                      type="color"
                      value={excelOptions.headerBackground}
                      onChange={(e) => setExcelOptions({ ...excelOptions, headerBackground: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={excelOptions.headerBackground}
                      onChange={(e) => setExcelOptions({ ...excelOptions, headerBackground: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="preserveGrouping">Gruppierungen beibehalten</Label>
                  <Switch
                    id="preserveGrouping"
                    checked={excelOptions.preserveGrouping}
                    onCheckedChange={(checked) => setExcelOptions({ ...excelOptions, preserveGrouping: checked })}
                  />
                </div>

                {excelOptions.preserveGrouping && (
                  <div className="space-y-2">
                    <Label htmlFor="groupBackground">Gruppen-Hintergrund</Label>
                    <div className="flex gap-2">
                      <Input
                        id="groupBackground"
                        type="color"
                        value={excelOptions.groupBackground}
                        onChange={(e) => setExcelOptions({ ...excelOptions, groupBackground: e.target.value })}
                        className="w-20 h-10"
                      />
                      <Input
                        value={excelOptions.groupBackground}
                        onChange={(e) => setExcelOptions({ ...excelOptions, groupBackground: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="includeAggregations">Summen einschließen</Label>
                  <Switch
                    id="includeAggregations"
                    checked={excelOptions.includeAggregations}
                    onCheckedChange={(checked) => setExcelOptions({ ...excelOptions, includeAggregations: checked })}
                  />
                </div>

                {excelOptions.includeAggregations && (
                  <div className="space-y-2">
                    <Label htmlFor="aggregationBackground">Summen-Hintergrund</Label>
                    <div className="flex gap-2">
                      <Input
                        id="aggregationBackground"
                        type="color"
                        value={excelOptions.aggregationBackground}
                        onChange={(e) =>
                          setExcelOptions({
                            ...excelOptions,
                            aggregationBackground: e.target.value,
                          })
                        }
                        className="w-20 h-10"
                      />
                      <Input
                        value={excelOptions.aggregationBackground}
                        onChange={(e) =>
                          setExcelOptions({
                            ...excelOptions,
                            aggregationBackground: e.target.value,
                          })
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExcelOptionsDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={exportToExcel} disabled={isExporting}>
              {isExporting ? "Exportiere..." : "Excel Exportieren"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
