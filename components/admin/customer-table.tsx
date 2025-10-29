"use client"
import { useState, useEffect, useMemo, memo, useCallback } from "react"
import { DialogFooter } from "@/components/ui/dialog"

import { DialogDescription } from "@/components/ui/dialog"

import { DialogTitle } from "@/components/ui/dialog"

import { DialogHeader } from "@/components/ui/dialog"

import { DialogContent } from "@/components/ui/dialog"

import { Dialog } from "@/components/ui/dialog"

import { SelectItem } from "@/components/ui/select"

import { SelectContent } from "@/components/ui/select"

import { SelectValue } from "@/components/ui/select"

import { SelectTrigger } from "@/components/ui/select"

import { Select } from "@/components/ui/select"

import { Label } from "@/components/ui/label"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, RefreshCw, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react"
import CustomerEditModal from "./customer-edit-modal"
import CustomerImport from "./customer-import"
import CustomerDetailModal from "./customer-detail-modal"
import { useCustomerData } from "@/hooks/use-customer-data"

interface ExtendedCustomer {
  id: string
  first_name: string
  last_name: string
  email: string
  street?: string
  house_number?: string
  postal_code?: string
  city?: string
  phone?: string
  tags: string[]
  account_status?: "has_account" | "no_account"
  customer_status?: "active" | "inactive" | "blocked"
  registration_date?: string
  last_activity?: string
  newsletter_subscription?: boolean
  reminder_notifications?: boolean
  special_requests?: string
  referral_source?: string
  distribution_system_benefits?: {
    participated: boolean
    total_benefits: number
    last_benefit_date?: string
  }
  order_count?: number
  average_order_value?: number
  favorite_categories?: string[]
  total_orders?: number
  total_spent?: number
  last_order_date?: string
}

const AVAILABLE_COLUMNS = [
  { key: "name", label: "Name", required: true },
  { key: "email", label: "E-Mail", required: true },
  { key: "phone", label: "Telefon", required: false },
  { key: "city", label: "Stadt", required: false },
  { key: "postal_code", label: "PLZ", required: false },
  { key: "customer_status", label: "Status", required: false },
  { key: "account_status", label: "Konto", required: false },
  { key: "order_count", label: "Bestellungen", required: false },
  { key: "total_spent", label: "Umsatz", required: false },
  { key: "last_activity", label: "Letzte Aktivität", required: false },
  { key: "tags", label: "Tags", required: false },
  { key: "actions", label: "Aktionen", required: true },
]

const CustomerRow = memo(
  ({
    customer,
    onEdit,
    onDelete,
    onViewDetails,
    visibleColumns,
  }: {
    customer: ExtendedCustomer
    onEdit: (customer: ExtendedCustomer) => void
    onDelete: (id: string) => void
    onViewDetails: (customer: ExtendedCustomer) => void
    visibleColumns: string[]
  }) => {
    const formatCurrency = (amount?: number) => {
      if (!amount) return "0,00 €"
      return new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
      }).format(amount)
    }

    const formatDate = (dateString?: string) => {
      if (!dateString) return "-"
      return new Date(dateString).toLocaleDateString("de-DE")
    }

    const getStatusBadge = (status?: string, type: "account" | "customer" = "customer") => {
      if (type === "account") {
        return status === "has_account" ? (
          <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
            Konto
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">
            Kein Konto
          </Badge>
        )
      }

      switch (status) {
        case "active":
          return (
            <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
              Aktiv
            </Badge>
          )
        case "inactive":
          return (
            <Badge variant="secondary" className="text-xs">
              Inaktiv
            </Badge>
          )
        case "blocked":
          return (
            <Badge variant="destructive" className="text-xs">
              Gesperrt
            </Badge>
          )
        default:
          return (
            <Badge variant="secondary" className="text-xs">
              -
            </Badge>
          )
      }
    }

    const renderCell = (columnKey: string) => {
      switch (columnKey) {
        case "name":
          return (
            <button
              onClick={() => onViewDetails(customer)}
              className="text-left hover:text-blue-600 hover:underline cursor-pointer"
            >
              {customer.first_name} {customer.last_name}
            </button>
          )
        case "email":
          return customer.email
        case "phone":
          return customer.phone || "-"
        case "city":
          return customer.city || "-"
        case "postal_code":
          return customer.postal_code || "-"
        case "customer_status":
          return getStatusBadge(customer.customer_status)
        case "account_status":
          return getStatusBadge(customer.account_status, "account")
        case "order_count":
          return customer.order_count || 0
        case "total_spent":
          return formatCurrency(customer.total_spent)
        case "last_activity":
          return formatDate(customer.last_activity)
        case "tags":
          return (
            <div className="flex flex-wrap gap-1">
              {customer.tags && customer.tags.length > 0 ? (
                customer.tags.slice(0, 2).map((tag: string, index: number) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))
              ) : (
                <span className="text-gray-400 text-sm">-</span>
              )}
              {customer.tags && customer.tags.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{customer.tags.length - 2}
                </Badge>
              )}
            </div>
          )
        case "actions":
          return (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onEdit(customer)}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="destructive" onClick={() => onDelete(customer.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )
        default:
          return "-"
      }
    }

    return (
      <tr key={customer.id} className="hover:bg-gray-50">
        {visibleColumns.map((columnKey) => (
          <td key={columnKey} className="border border-gray-300 px-4 py-2">
            {renderCell(columnKey)}
          </td>
        ))}
      </tr>
    )
  },
)

CustomerRow.displayName = "CustomerRow"

const CustomerTable = memo(() => {
  const {
    customers,
    loading,
    loadCustomers,
    saveCustomer,
    deleteCustomer,
    currentPage,
    pageSize,
    totalCount,
    totalPages,
    nextPage,
    prevPage,
  } = useCustomerData()

  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [editingCustomer, setEditingCustomer] = useState<ExtendedCustomer | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [sortBy, setSortBy] = useState<string>("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  const [availableTags, setAvailableTags] = useState<string[]>([
    "Südfrüchte-Käufer",
    "Trockenfrüchte-Käufer",
    "Spezialitäten-Käufer",
    "Regional-Käufer",
    "Gemischt",
    "Abholung-Stuttgart",
    "Abholung-Heilbronn",
    "Abholung-Schwäbisch Hall",
    "Verteiler-Stuttgart",
    "Verteiler-Heilbronn",
    "Verteiler-Schwäbisch Hall",
  ])

  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "name",
    "email",
    "phone",
    "city",
    "customer_status",
    "order_count",
    "actions",
  ])
  const [detailCustomer, setDetailCustomer] = useState<ExtendedCustomer | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  const handleSaveCustomer = useCallback(
    async (customer: ExtendedCustomer) => {
      await saveCustomer(customer)
      setIsEditModalOpen(false)
      setEditingCustomer(null)
    },
    [saveCustomer],
  )

  const handleDeleteCustomer = useCallback(async () => {
    if (!deleteCustomerId) return

    try {
      await deleteCustomer(deleteCustomerId)
      setIsDeleteModalOpen(false)
      setDeleteCustomerId(null)
    } catch (error) {
      console.error("Error deleting customer:", error)
      alert(`Fehler beim Löschen: ${error.message}`)
    }
  }, [deleteCustomer, deleteCustomerId])

  const handleEditCustomer = useCallback((customer: ExtendedCustomer) => {
    setEditingCustomer(customer)
    setIsEditModalOpen(true)
  }, [])

  const handleDeleteClick = useCallback((customerId: string) => {
    setDeleteCustomerId(customerId)
    setIsDeleteModalOpen(true)
  }, [])

  const handleViewDetails = useCallback((customer: ExtendedCustomer) => {
    setDetailCustomer(customer)
    setIsDetailModalOpen(true)
  }, [])

  const addTag = useCallback(
    (tag: string) => {
      if (!availableTags.includes(tag)) {
        setAvailableTags((prev) => [...prev, tag])
      }
    },
    [availableTags],
  )

  const toggleSortOrder = useCallback(() => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
  }, [])

  const toggleColumn = useCallback((columnKey: string) => {
    const column = AVAILABLE_COLUMNS.find((col) => col.key === columnKey)
    if (column?.required) return // Don't allow toggling required columns

    setVisibleColumns((prev) =>
      prev.includes(columnKey) ? prev.filter((key) => key !== columnKey) : [...prev, columnKey],
    )
  }, [])

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    if (debouncedSearchTerm) {
      loadCustomers({ q: debouncedSearchTerm })
    } else {
      loadCustomers({ limit: pageSize, offset: (currentPage - 1) * pageSize })
    }
  }, [debouncedSearchTerm, loadCustomers, currentPage, pageSize])

  const sortedAndFilteredCustomers = useMemo(() => {
    if (!Array.isArray(customers)) return []

    const filtered = customers

    return filtered.sort((a, b) => {
      let aValue = ""
      let bValue = ""

      switch (sortBy) {
        case "name":
          aValue = `${a.first_name || ""} ${a.last_name || ""}`.trim()
          bValue = `${b.first_name || ""} ${b.last_name || ""}`.trim()
          break
        case "email":
          aValue = a.email || ""
          bValue = b.email || ""
          break
        case "city":
          aValue = a.city || ""
          bValue = b.city || ""
          break
        case "postal_code":
          aValue = a.postal_code || ""
          bValue = b.postal_code || ""
          break
        default:
          return 0
      }

      const comparison = aValue.localeCompare(bValue, "de", { numeric: true })
      return sortOrder === "asc" ? comparison : -comparison
    })
  }, [customers, sortBy, sortOrder])

  const customerCount = useMemo(() => sortedAndFilteredCustomers.length, [sortedAndFilteredCustomers])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Kundenverwaltung ({debouncedSearchTerm ? customerCount : totalCount})</span>
          <div className="flex gap-2">
            <CustomerImport onImportComplete={loadCustomers} customersCount={customers.length} />
            <Button onClick={() => loadCustomers()} disabled={loading} size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Aktualisieren
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <Label className="text-sm font-medium mb-2 block">Angezeigte Spalten:</Label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_COLUMNS.map((column) => (
              <Button
                key={column.key}
                variant={visibleColumns.includes(column.key) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleColumn(column.key)}
                disabled={column.required}
                className="text-xs"
              >
                {column.label}
                {column.required && " *"}
              </Button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">* Pflichtfelder können nicht ausgeblendet werden</p>
        </div>

        <div className="mb-4 flex gap-4 items-center">
          <Input
            placeholder="Kunden suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <div className="flex items-center gap-2">
            <Label htmlFor="sort-select" className="text-sm font-medium">
              Sortieren:
            </Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="email">E-Mail</SelectItem>
                <SelectItem value="city">Stadt</SelectItem>
                <SelectItem value="postal_code">PLZ</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={toggleSortOrder}>
              <ArrowUpDown className="w-4 h-4" />
              {sortOrder === "asc" ? "↑" : "↓"}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Lade Kundendaten...</div>
        ) : (
          <>
            <div className="h-96 overflow-auto border border-gray-200 rounded-lg">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr>
                    {visibleColumns.map((columnKey) => {
                      const column = AVAILABLE_COLUMNS.find((col) => col.key === columnKey)
                      return (
                        <th key={columnKey} className="border border-gray-300 px-4 py-2 text-left">
                          {column?.label}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sortedAndFilteredCustomers.map((customer) => (
                    <CustomerRow
                      key={customer.id}
                      customer={customer}
                      onEdit={handleEditCustomer}
                      onDelete={handleDeleteClick}
                      onViewDetails={handleViewDetails}
                      visibleColumns={visibleColumns}
                    />
                  ))}
                </tbody>
              </table>

              {sortedAndFilteredCustomers.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  {customers.length === 0 ? "Keine Kunden vorhanden" : "Keine Kunden gefunden"}
                </div>
              )}
            </div>

            {!debouncedSearchTerm && totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-2">
                <div className="text-sm text-gray-600">
                  Seite {currentPage} von {totalPages} ({totalCount} Kunden gesamt)
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={prevPage} disabled={currentPage === 1 || loading}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Zurück
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextPage}
                    disabled={currentPage === totalPages || loading}
                  >
                    Weiter
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        <CustomerEditModal
          customer={editingCustomer}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setEditingCustomer(null)
          }}
          onSave={handleSaveCustomer}
          availableTags={availableTags}
          onAddTag={addTag}
        />

        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kunde löschen</DialogTitle>
              <DialogDescription>
                Sind Sie sicher, dass Sie diesen Kunden löschen möchten? Diese Aktion kann nicht rückgängig gemacht
                werden.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                Abbrechen
              </Button>
              <Button variant="destructive" onClick={handleDeleteCustomer}>
                Löschen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <CustomerDetailModal
          customer={detailCustomer}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false)
            setDetailCustomer(null)
          }}
          onEdit={(customer) => {
            setIsDetailModalOpen(false)
            handleEditCustomer(customer)
          }}
        />
      </CardContent>
    </Card>
  )
})

CustomerTable.displayName = "CustomerTable"

export default CustomerTable
