"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Trash2, Search, ArrowLeft, CheckCircle2, UserPlus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface CustomerDetails {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  street?: string
  house_number?: string
  postal_code?: string
  city?: string
}

interface Product {
  id: number
  name: string
  price: number
  category: string
  size?: string
  unit?: string
  active?: boolean
}

interface PickupLocation {
  id: string
  name: string
}

interface DistributionPerson {
  id: string
  name: string
}

interface OrderItem {
  productId: string
  quantity: number
  price: number
}

const INITIAL_FORM = {
  customerId: "",
  customerEmail: "",
  deliveryMethod: "pickup",
  pickupLocationId: "",
  distributionPersonId: "",
  paymentMethod: "invoice",
  paymentStatus: "pending",
  status: "confirmed",
  notes: "",
  items: [{ productId: "", quantity: 1, price: 0 }] as OrderItem[],
}

export default function NewManualOrderPage() {
  const router = useRouter()
  const { toast } = useToast()

  // Form state
  const [form, setForm] = useState(INITIAL_FORM)
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [orderCreated, setOrderCreated] = useState<{ orderNumber: string } | null>(null)

  // Data state
  const [products, setProducts] = useState<Product[]>([])
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([])
  const [distributionPersons, setDistributionPersons] = useState<DistributionPerson[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Customer search
  const [customerSearchQuery, setCustomerSearchQuery] = useState("")
  const [customerSearchResults, setCustomerSearchResults] = useState<CustomerDetails[]>([])
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetails | null>(null)

  // New customer dialog
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false)
  const [newCustomerForm, setNewCustomerForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    street: "",
    house_number: "",
    postal_code: "",
    city: "",
  })
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)

  // Fetch form data on mount
  useEffect(() => {
    async function fetchFormData() {
      try {
        const [productsRes, locationsRes, personsRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/admin/pickup-locations"),
          fetch("/api/admin/distribution-persons"),
        ])

        if (productsRes.ok) {
          const data = await productsRes.json()
          setProducts(data.products || data || [])
        }
        if (locationsRes.ok) {
          const data = await locationsRes.json()
          setPickupLocations(data.locations || [])
        }
        if (personsRes.ok) {
          const data = await personsRes.json()
          setDistributionPersons(data.persons || [])
        }
      } catch (error) {
        console.error("Error fetching form data:", error)
        toast({
          title: "Fehler",
          description: "Formulardaten konnten nicht geladen werden",
          variant: "destructive",
        })
      } finally {
        setLoadingData(false)
      }
    }
    fetchFormData()
  }, [toast])

  // Customer search with debounce
  useEffect(() => {
    if (!customerSearchQuery || customerSearchQuery.length < 2) {
      setCustomerSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearchingCustomers(true)
      try {
        const response = await fetch(`/api/admin/customers/search?q=${encodeURIComponent(customerSearchQuery)}`)
        if (response.ok) {
          const data = await response.json()
          setCustomerSearchResults(data.customers || [])
        }
      } catch (error) {
        console.error("Error searching customers:", error)
      } finally {
        setIsSearchingCustomers(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [customerSearchQuery])

  const selectCustomer = useCallback((customer: CustomerDetails) => {
    setSelectedCustomer(customer)
    setForm((prev) => ({
      ...prev,
      customerId: customer.id,
      customerEmail: customer.email,
    }))
    setCustomerSearchQuery("")
    setCustomerSearchResults([])
  }, [])

  const clearCustomer = useCallback(() => {
    setSelectedCustomer(null)
    setForm((prev) => ({
      ...prev,
      customerId: "",
      customerEmail: "",
    }))
  }, [])

  const handleCreateCustomer = useCallback(async () => {
    if (!newCustomerForm.first_name || !newCustomerForm.last_name || !newCustomerForm.email) {
      toast({
        title: "Fehler",
        description: "Vorname, Nachname und E-Mail sind Pflichtfelder",
        variant: "destructive",
      })
      return
    }

    setIsCreatingCustomer(true)
    try {
      const response = await fetch("/api/crm/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomerForm),
      })

      if (response.ok) {
        const data = await response.json()
        const newCustomer = data.customer || data
        selectCustomer(newCustomer)
        setShowNewCustomerDialog(false)
        setNewCustomerForm({
          first_name: "",
          last_name: "",
          email: "",
          phone: "",
          street: "",
          house_number: "",
          postal_code: "",
          city: "",
        })
        toast({
          title: "Kunde erstellt",
          description: `${newCustomer.first_name} ${newCustomer.last_name} wurde angelegt`,
        })
      } else {
        const errorData = await response.json()
        toast({
          title: "Fehler",
          description: errorData.error || "Kunde konnte nicht erstellt werden",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Kunde konnte nicht erstellt werden",
        variant: "destructive",
      })
    } finally {
      setIsCreatingCustomer(false)
    }
  }, [newCustomerForm, selectCustomer, toast])

  const addOrderItem = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { productId: "", quantity: 1, price: 0 }],
    }))
  }, [])

  const removeOrderItem = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
  }, [])

  const updateOrderItem = useCallback(
    (index: number, field: string, value: string | number) => {
      setForm((prev) => ({
        ...prev,
        items: prev.items.map((item, i) => {
          if (i === index) {
            const updated = { ...item, [field]: value }
            if (field === "productId" && value) {
              const product = products.find((p) => p.id.toString() === value)
              if (product) {
                updated.price = product.price
              }
            }
            return updated
          }
          return item
        }),
      }))
    },
    [products],
  )

  const totalAmount = form.items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const handleSubmit = useCallback(async () => {
    if (!form.customerId) {
      toast({ title: "Fehler", description: "Bitte waehlen Sie einen Kunden aus", variant: "destructive" })
      return
    }
    if (form.items.length === 0 || !form.items[0].productId) {
      toast({ title: "Fehler", description: "Bitte fuegen Sie mindestens ein Produkt hinzu", variant: "destructive" })
      return
    }
    if (form.deliveryMethod === "pickup" && !form.pickupLocationId) {
      toast({ title: "Fehler", description: "Bitte waehlen Sie einen Abholort aus", variant: "destructive" })
      return
    }

    const customer = selectedCustomer
    if (!customer) {
      toast({ title: "Fehler", description: "Kunde nicht gefunden", variant: "destructive" })
      return
    }

    setIsCreatingOrder(true)
    try {
      const orderItems = form.items
        .filter((item) => item.productId)
        .map((item) => {
          const product = products.find((p) => p.id.toString() === item.productId)
          return {
            id: product?.id || null,
            name: product?.name || "Unbekanntes Produkt",
            quantity: item.quantity,
            price: item.price || product?.price || 0,
            category: product?.category || "Unbekannt",
            size: product?.size || null,
            unit: product?.unit || null,
          }
        })

      const pickupLocation = pickupLocations.find((loc) => loc.id === form.pickupLocationId)

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          deliveryMethod: form.deliveryMethod,
          pickupLocation: pickupLocation?.name || null,
          pickupLocationId: form.pickupLocationId || null,
          distributionPersonId: form.distributionPersonId || null,
          paymentMethod: form.paymentMethod,
          notes: form.notes || null,
          items: orderItems,
          emailReminder: false,
          emailUpdates: false,
          isTest: false,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Fehler beim Erstellen der Bestellung")
      }

      const result = await response.json()

      // Update status if needed
      if (form.status !== "confirmed" || form.paymentStatus !== "pending") {
        await fetch("/api/admin/update-order-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: result.data.order.id,
            status: form.status,
            paymentStatus: form.paymentStatus,
          }),
        })
      }

      setOrderCreated({ orderNumber: result.data.order.order_number })
      toast({
        title: "Bestellung erstellt",
        description: `Bestellung ${result.data.order.order_number} wurde erfolgreich erstellt`,
      })
    } catch (error) {
      console.error("Error creating order:", error)
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Bestellung konnte nicht erstellt werden",
        variant: "destructive",
      })
    } finally {
      setIsCreatingOrder(false)
    }
  }, [form, selectedCustomer, products, pickupLocations, toast])

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM)
    setSelectedCustomer(null)
    setCustomerSearchQuery("")
    setOrderCreated(null)
  }, [])

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--hg-green)]" />
        <span className="ml-2 text-foreground">Formulardaten werden geladen...</span>
      </div>
    )
  }

  // Success screen
  if (orderCreated) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-lg">
          <Card className="border-[var(--hg-green)]/30">
            <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8">
              <CheckCircle2 className="h-16 w-16 text-[var(--hg-green)]" />
              <h2 className="text-2xl font-bold text-foreground">Bestellung erstellt</h2>
              <p className="text-muted-foreground text-center">
                Bestellung <span className="font-semibold text-foreground">{orderCreated.orderNumber}</span> wurde
                erfolgreich angelegt.
              </p>
              <div className="flex gap-3 mt-4">
                <Button onClick={resetForm} className="bg-[var(--hg-green)] text-white hover:bg-[var(--hg-green)]/90">
                  Weitere Bestellung
                </Button>
                <Button variant="outline" onClick={() => router.push("/admin")} className="bg-transparent">
                  Zurueck zum Admin
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="bg-transparent">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Neue Bestellung</h1>
            <p className="text-sm text-muted-foreground">Manuelle Bestellerfassung</p>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Kunde</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {selectedCustomer ? (
                <div className="flex items-center justify-between rounded-md border border-[var(--hg-green)]/30 bg-[var(--hg-light-green)] p-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {selectedCustomer.first_name} {selectedCustomer.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                    {selectedCustomer.phone && (
                      <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearCustomer} className="bg-transparent text-destructive">
                    Aendern
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Kundenname oder E-Mail suchen..."
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {isSearchingCustomers && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Suche...
                    </div>
                  )}
                  {customerSearchResults.length > 0 && (
                    <div className="max-h-48 overflow-y-auto rounded-md border">
                      {customerSearchResults.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => selectCustomer(customer)}
                          className="flex w-full flex-col items-start gap-0.5 border-b p-3 text-left hover:bg-muted last:border-b-0"
                        >
                          <span className="font-medium text-foreground">
                            {customer.first_name} {customer.last_name}
                          </span>
                          <span className="text-sm text-muted-foreground">{customer.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {customerSearchQuery.length >= 2 &&
                    !isSearchingCustomers &&
                    customerSearchResults.length === 0 && (
                      <p className="text-sm text-muted-foreground">Keine Kunden gefunden.</p>
                    )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewCustomerDialog(true)}
                    className="bg-transparent self-start"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Neuen Kunden anlegen
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Produkte</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {form.items.map((item, index) => (
                <div key={index} className="flex items-end gap-3">
                  <div className="flex-1">
                    <Label className="text-sm text-foreground">Produkt</Label>
                    <Select
                      value={item.productId}
                      onValueChange={(value) => updateOrderItem(index, "productId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Produkt waehlen" />
                      </SelectTrigger>
                      <SelectContent>
                        {products
                          .filter((p) => p.active !== false)
                          .map((product) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name} - {product.price.toFixed(2)} EUR
                              {product.size ? ` (${product.size})` : ""}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24">
                    <Label className="text-sm text-foreground">Menge</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateOrderItem(index, "quantity", parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="w-28">
                    <Label className="text-sm text-foreground">Preis</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={item.price}
                      onChange={(e) => updateOrderItem(index, "price", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  {form.items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOrderItem(index)}
                      className="bg-transparent text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addOrderItem} className="bg-transparent self-start">
                <Plus className="mr-2 h-4 w-4" />
                Produkt hinzufuegen
              </Button>
              <div className="flex justify-end border-t pt-3">
                <p className="text-lg font-semibold text-foreground">Gesamt: {totalAmount.toFixed(2)} EUR</p>
              </div>
            </CardContent>
          </Card>

          {/* Delivery & Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Lieferung & Zahlung</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <Label className="text-foreground">Liefermethode</Label>
                <Select
                  value={form.deliveryMethod}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, deliveryMethod: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pickup">Abholung</SelectItem>
                    <SelectItem value="delivery">Lieferung</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.deliveryMethod === "pickup" && (
                <div>
                  <Label className="text-foreground">Abholort</Label>
                  <Select
                    value={form.pickupLocationId}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, pickupLocationId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Abholort waehlen" />
                    </SelectTrigger>
                    <SelectContent>
                      {pickupLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {distributionPersons.length > 0 && (
                <div>
                  <Label className="text-foreground">Verteiler</Label>
                  <Select
                    value={form.distributionPersonId}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, distributionPersonId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Verteiler waehlen (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {distributionPersons.map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-foreground">Zahlungsmethode</Label>
                <Select
                  value={form.paymentMethod}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, paymentMethod: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Rechnung</SelectItem>
                    <SelectItem value="cash">Barzahlung</SelectItem>
                    <SelectItem value="bank_transfer">Ueberweisung</SelectItem>
                    <SelectItem value="sumup">SumUp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-foreground">Zahlungsstatus</Label>
                <Select
                  value={form.paymentStatus}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, paymentStatus: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Ausstehend</SelectItem>
                    <SelectItem value="paid">Bezahlt</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-foreground">Bestellstatus</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">Bestaetigt</SelectItem>
                    <SelectItem value="processing">In Bearbeitung</SelectItem>
                    <SelectItem value="shipped">Versendet</SelectItem>
                    <SelectItem value="delivered">Geliefert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-foreground">Notizen (optional)</Label>
                <Textarea
                  placeholder="Bemerkungen zur Bestellung..."
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={isCreatingOrder || !form.customerId || !form.items[0]?.productId}
            className="w-full bg-[var(--hg-green)] text-white hover:bg-[var(--hg-green)]/90 h-12 text-base font-semibold"
          >
            {isCreatingOrder ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Bestellung wird erstellt...
              </>
            ) : (
              `Bestellung erstellen (${totalAmount.toFixed(2)} EUR)`
            )}
          </Button>
        </div>
      </div>

      {/* New Customer Dialog */}
      <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Neuen Kunden anlegen</DialogTitle>
            <DialogDescription>Erstellen Sie einen neuen Kunden fuer diese Bestellung.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-foreground">Vorname *</Label>
                <Input
                  value={newCustomerForm.first_name}
                  onChange={(e) => setNewCustomerForm((prev) => ({ ...prev, first_name: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-foreground">Nachname *</Label>
                <Input
                  value={newCustomerForm.last_name}
                  onChange={(e) => setNewCustomerForm((prev) => ({ ...prev, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label className="text-foreground">E-Mail *</Label>
              <Input
                type="email"
                value={newCustomerForm.email}
                onChange={(e) => setNewCustomerForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-foreground">Telefon</Label>
              <Input
                value={newCustomerForm.phone}
                onChange={(e) => setNewCustomerForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label className="text-foreground">Strasse</Label>
                <Input
                  value={newCustomerForm.street}
                  onChange={(e) => setNewCustomerForm((prev) => ({ ...prev, street: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-foreground">Hausnr.</Label>
                <Input
                  value={newCustomerForm.house_number}
                  onChange={(e) => setNewCustomerForm((prev) => ({ ...prev, house_number: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-foreground">PLZ</Label>
                <Input
                  value={newCustomerForm.postal_code}
                  onChange={(e) => setNewCustomerForm((prev) => ({ ...prev, postal_code: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-foreground">Stadt</Label>
                <Input
                  value={newCustomerForm.city}
                  onChange={(e) => setNewCustomerForm((prev) => ({ ...prev, city: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCustomerDialog(false)} className="bg-transparent">
              Abbrechen
            </Button>
            <Button
              onClick={handleCreateCustomer}
              disabled={isCreatingCustomer}
              className="bg-[var(--hg-green)] text-white hover:bg-[var(--hg-green)]/90"
            >
              {isCreatingCustomer ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Kunde erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
