"use client"
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import useSWR from "swr"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  type SortingState,
  type ColumnOrderState,
} from "@tanstack/react-table"
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Download, GripVertical, Settings, ArrowUpDown } from "lucide-react"

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
  { id: "payment_method", label: "Zahlungsart", type: "string" },
  { id: "products", label: "Produkte", type: "string" },
  { id: "product_count", label: "Produktanzahl", type: "number" },
  { id: "total", label: "Gesamtbetrag", type: "number" },
  { id: "created_at", label: "Datum", type: "date" },
  { id: "notes", label: "Notizen", type: "string" },
  { id: "product_category", label: "Warengruppe", type: "string" },
]

const TEMPLATES = [
  {
    id: "tour-picking",
    name: "Tour-Kommissionierung",
    description: "Gruppiert nach Abholort, zeigt Produkte und Mengen",
    columns: ["pickup_location_normalized", "products", "product_count", "customer_name"],
    groupBy: ["pickup_location_normalized"],
    aggregations: [{ field: "product_count", function: "sum" }],
  },
  {
    id: "packing-list",
    name: "Packliste",
    description: "Pro Verteilperson, sortiert nach Abholort",
    columns: ["distribution_person", "pickup_location_normalized", "customer_name", "products", "total"],
    groupBy: ["pickup_location_normalized"],
    aggregations: [{ field: "total", function: "sum" }],
  },
  {
    id: "customer-overview",
    name: "Kundenübersicht",
    description: "Alle Bestellungen gruppiert nach Kunde",
    columns: ["customer_name", "customer_phone", "order_number", "pickup_location_normalized", "total"],
    groupBy: ["customer_name"],
    aggregations: [{ field: "total", function: "sum" }],
  },
  {
    id: "location-analysis",
    name: "Abholort-Analyse",
    description: "Statistiken pro Abholort",
    columns: ["pickup_location_normalized", "customer_name", "product_count", "total"],
    groupBy: ["pickup_location_normalized"],
    aggregations: [
      { field: "product_count", function: "sum" },
      { field: "total", function: "sum" },
    ],
  },
  {
    id: "payment-overview",
    name: "Zahlungsübersicht",
    description: "Gruppiert nach Zahlungsart",
    columns: ["payment_method", "customer_name", "order_number", "total", "payment_status"],
    groupBy: ["payment_method"],
    aggregations: [{ field: "total", function: "sum" }],
  },
]

export default function ReportBuilder() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
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
  })

  const [isExporting, setIsExporting] = useState(false)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnOrderState, setColumnOrderState] = useState<ColumnOrderState>([
    "order_number",
    "customer_name",
    "pickup_location_normalized",
    "total",
  ])
  const [showAggregations, setShowAggregations] = useState(true)
  const [wrapText, setWrapText] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

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

  const applyTemplate = (templateId: string) => {
    const template = TEMPLATES.find((t) => t.id === templateId)
    if (template) {
      setSelectedTemplate(templateId)
      setSelectedColumns([...template.columns])
      setGroupBy([...(template.groupBy || [])])
      setAggregations([...(template.aggregations || [])])
      setColumnOrderState([...template.columns])
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
      const rows = reportData?.data || []
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

  const exportToExcel = () => {
    alert("Excel-Export wird in Kürze verfügbar sein. Bitte verwenden Sie vorerst CSV-Export.")
  }

  const reportConfig = useMemo(() => {
    return {
      columns: selectedColumns,
      groupBy,
      aggregations,
      filters,
    }
  }, [selectedColumns, groupBy, aggregations, filters])

  const swrKey =
    reportConfig.columns.length > 0 ? `/api/admin/reports/dynamic?config=${JSON.stringify(reportConfig)}` : null

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

  const columns = useMemo<ColumnDef<any>[]>(() => {
    return selectedColumns.map((col) => ({
      accessorKey: col,
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            {AVAILABLE_COLUMNS.find((c) => c.id === col)?.label || col}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        if (row.original._isGroup) {
          if (groupBy.includes(col)) {
            const value = row.original[col]
            if (value && value !== "") {
              return <div className="text-lg font-bold text-primary py-2 px-4 bg-slate-100 rounded">{value}</div>
            }
          }
          return null
        }

        if (row.original._isProductTotal) {
          if (col === "products") {
            return <div className="pl-8 text-blue-600 font-semibold">→ {row.original[col]}</div>
          }
          if (col === "product_count") {
            return <div className="text-blue-600 font-semibold">{row.original[col]}x</div>
          }
          return null
        }

        if (row.original._isAggregation) {
          const value = row.original[col]
          if (value !== undefined && value !== null && value !== "") {
            return <div className="font-semibold">Σ {value}</div>
          }
          return null
        }

        if (col === "products" && wrapText) {
          const productsText = row.original[col]
          if (productsText) {
            const products = productsText.split(",").map((p: string) => p.trim())
            return (
              <div className="whitespace-pre-line">
                {products.map((product: string, idx: number) => (
                  <div key={idx}>{product}</div>
                ))}
              </div>
            )
          }
        }

        return <div>{row.original[col]}</div>
      },
      size: columnWidths[col] || 150,
      minSize: 100,
      maxSize: 500,
    }))
  }, [selectedColumns, columnWidths, wrapText, groupBy])

  const table = useReactTable({
    data: reportData?.data || [],
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Report-Konfiguration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-base font-semibold mb-3 block">Vorlagen</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {TEMPLATES.map((template) => (
                <Button
                  key={template.id}
                  variant={selectedTemplate === template.id ? "default" : "outline"}
                  className="h-auto flex flex-col items-start p-4 text-left"
                  onClick={() => applyTemplate(template.id)}
                >
                  <div className="font-semibold mb-1">{template.name}</div>
                  <div className="text-xs text-muted-foreground">{template.description}</div>
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-base font-semibold mb-3 block">Filter</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm mb-2 block">Lieferart</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="filter-pickup"
                      checked={filters.deliveryType?.includes("pickup")}
                      onCheckedChange={() => toggleFilter("deliveryType", "pickup")}
                    />
                    <Label htmlFor="filter-pickup" className="text-sm cursor-pointer">
                      Abholung
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="filter-delivery"
                      checked={filters.deliveryType?.includes("delivery")}
                      onCheckedChange={() => toggleFilter("deliveryType", "delivery")}
                    />
                    <Label htmlFor="filter-delivery" className="text-sm cursor-pointer">
                      Versand
                    </Label>
                  </div>
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
            </div>
          </div>

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
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="group-location"
                  checked={groupBy.includes("pickup_location_normalized")}
                  onCheckedChange={() => toggleGroupBy("pickup_location_normalized")}
                />
                <Label htmlFor="group-location" className="cursor-pointer">
                  Nach Abholort gruppieren
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="group-person"
                  checked={groupBy.includes("distribution_person")}
                  onCheckedChange={() => toggleGroupBy("distribution_person")}
                />
                <Label htmlFor="group-person" className="cursor-pointer">
                  Nach Verteilperson gruppieren
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="group-category"
                  checked={groupBy.includes("product_category")}
                  onCheckedChange={() => toggleGroupBy("product_category")}
                />
                <Label htmlFor="group-category" className="cursor-pointer">
                  Nach Warengruppe gruppieren
                </Label>
              </div>
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
                            .filter((col) => selectedColumns.includes(col))
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

        <Button onClick={exportToCSV} variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Als CSV exportieren
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
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
