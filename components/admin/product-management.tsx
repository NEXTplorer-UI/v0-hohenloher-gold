"use client"
import { useState, useEffect } from "react"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Plus, Edit, Trash2, Search, RefreshCw, Package } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Product {
  id: number
  name: string
  category: string
  category_id?: number
  price: number
  description: string
  image_url: string
  weight_kg: string
  origin: string
  unit: string
  min_stock: number
  is_active: boolean
  created_at: string
  updated_at: string
  attributes?: {
    available_from?: string
  }
}

interface Category {
  id: number
  name: string
  slug: string
  is_active: boolean
}

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    description: "",
    image_url: "",
    weight_kg: "",
    origin: "",
    unit: "Stück",
    min_stock: "0",
    is_active: true,
    available_from: "",
  })

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/products")
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      } else {
        toast({
          title: "Fehler",
          description: "Produkte konnten nicht geladen werden",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching products:", error)
      toast({
        title: "Fehler",
        description: "Verbindungsfehler beim Laden der Produkte",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      console.log("[v0] Fetching categories...")
      const response = await fetch("/api/admin/categories")
      console.log("[v0] Categories response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Categories loaded:", data)
        setCategories(data)
      } else {
        const errorText = await response.text()
        console.error("[v0] Failed to fetch categories:", response.status, errorText)
        toast({
          title: "Warnung",
          description: "Kategorien konnten nicht geladen werden",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error fetching categories:", error)
      toast({
        title: "Fehler",
        description: "Verbindungsfehler beim Laden der Kategorien",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      price: "",
      description: "",
      image_url: "",
      weight_kg: "",
      origin: "",
      unit: "Stück",
      min_stock: "0",
      is_active: true,
      available_from: "",
    })
    setEditingProduct(null)
    setIsCreatingNewCategory(false)
    setNewCategoryName("")
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Kategorienamen ein",
        variant: "destructive",
      })
      return
    }

    try {
      console.log("[v0] Creating new category:", newCategoryName.trim())
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })

      if (response.ok) {
        const newCategory = await response.json()
        console.log("[v0] Category created:", newCategory)

        toast({
          title: "Erfolg",
          description: "Kategorie wurde erstellt",
        })

        // Refresh categories and select the new one
        await fetchCategories()
        setFormData({ ...formData, category: newCategory.name })
        setIsCreatingNewCategory(false)
        setNewCategoryName("")
      } else {
        const error = await response.json()
        console.error("[v0] Error creating category:", error)
        toast({
          title: "Fehler",
          description: error.error || "Fehler beim Erstellen der Kategorie",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error creating category:", error)
      toast({
        title: "Fehler",
        description: "Verbindungsfehler beim Erstellen der Kategorie",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log("[v0] Form submitted with data:", formData)

    if (!formData.name || !formData.category || !formData.price) {
      console.log("[v0] Validation failed - missing required fields")
      toast({
        title: "Fehler",
        description: "Name, Kategorie und Preis sind Pflichtfelder",
        variant: "destructive",
      })
      return
    }

    try {
      const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : "/api/admin/products"
      const method = editingProduct ? "PUT" : "POST"

      console.log("[v0] Looking for category:", formData.category)
      console.log("[v0] Available categories:", categories)

      const selectedCategory = categories.find((c) => c.name === formData.category)
      console.log("[v0] Selected category:", selectedCategory)

      const categoryId = selectedCategory?.id

      if (!categoryId) {
        console.log("[v0] No valid category ID found")
        toast({
          title: "Fehler",
          description: "Ungültige Kategorie ausgewählt",
          variant: "destructive",
        })
        return
      }

      const attributes: any = {}
      if (formData.available_from && formData.available_from.trim()) {
        attributes.available_from = formData.available_from.trim()
      }
      // If attributes is empty, send null to clear the field in database
      const attributesValue = Object.keys(attributes).length > 0 ? attributes : null

      const payload = {
        ...formData,
        category_id: categoryId,
        attributes: attributesValue,
      }

      console.log("[v0] Sending request to:", url)
      console.log("[v0] Payload:", payload)

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      console.log("[v0] Response status:", response.status)

      if (response.ok) {
        const result = await response.json()
        console.log("[v0] Success:", result)
        toast({
          title: "Erfolg",
          description: editingProduct ? "Produkt wurde aktualisiert" : "Produkt wurde erstellt",
        })
        setIsDialogOpen(false)
        resetForm()
        fetchProducts()
        fetchCategories()
      } else {
        const error = await response.json()
        console.error("[v0] Error response:", error)
        toast({
          title: "Fehler",
          description: error.error || "Fehler beim Speichern des Produkts",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error saving product:", error)
      toast({
        title: "Fehler",
        description: "Verbindungsfehler beim Speichern",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      description: product.description || "",
      image_url: product.image_url || "",
      weight_kg: product.weight_kg || "",
      origin: product.origin || "",
      unit: product.unit || "Stück",
      min_stock: product.min_stock.toString(),
      is_active: product.is_active,
      available_from: (product as any).attributes?.available_from || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (productId: number) => {
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Erfolg",
          description: "Produkt wurde gelöscht",
        })
        fetchProducts()
        fetchCategories()
      } else {
        toast({
          title: "Fehler",
          description: "Fehler beim Löschen des Produkts",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting product:", error)
      toast({
        title: "Fehler",
        description: "Verbindungsfehler beim Löschen",
        variant: "destructive",
      })
    }
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.origin.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(value)
  }

  useEffect(() => {
    if (isDialogOpen) {
      fetchCategories()
    }
  }, [isDialogOpen])

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Produktverwaltung</h2>
          <p className="text-muted-foreground">Verwalten Sie Ihr Produktsortiment</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchProducts} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Aktualisieren
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Neues Produkt
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Produkt bearbeiten" : "Neues Produkt erstellen"}</DialogTitle>
                <DialogDescription>
                  {editingProduct
                    ? "Bearbeiten Sie die Produktinformationen"
                    : "Erstellen Sie ein neues Produkt für Ihr Sortiment"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Produktname *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="z.B. Sizilianische Orangen"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Kategorie *</Label>
                    {isCreatingNewCategory ? (
                      <div className="flex gap-2">
                        <Input
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Neue Kategorie eingeben"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              handleCreateCategory()
                            }
                          }}
                        />
                        <Button type="button" variant="outline" size="sm" onClick={handleCreateCategory}>
                          OK
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsCreatingNewCategory(false)
                            setNewCategoryName("")
                          }}
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <Select
                        value={formData.category}
                        onValueChange={(value) => {
                          if (value === "__create_new__") {
                            setIsCreatingNewCategory(true)
                          } else {
                            setFormData({ ...formData, category: value })
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Kategorie wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__create_new__" className="text-primary font-medium">
                            <div className="flex items-center">
                              <Plus className="h-4 w-4 mr-2" />
                              Neue Kategorie erstellen
                            </div>
                          </SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.name}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Preis (€) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Einheit</Label>
                    <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Stück">Stück</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="Liter">Liter</SelectItem>
                        <SelectItem value="Flaschen">Flaschen</SelectItem>
                        <SelectItem value="Kisten">Kisten</SelectItem>
                        <SelectItem value="Gläser">Gläser</SelectItem>
                        <SelectItem value="Säcke">Säcke</SelectItem>
                        <SelectItem value="Beutel">Beutel</SelectItem>
                        <SelectItem value="Dosen">Dosen</SelectItem>
                        <SelectItem value="Sets">Sets</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Beschreibung</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Produktbeschreibung..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weight_kg">Gewicht (kg)</Label>
                    <Input
                      id="weight_kg"
                      type="number"
                      step="0.01"
                      value={formData.weight_kg}
                      onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                      placeholder="z.B. 7.5 für 7,5kg Kiste"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="origin">Herkunft</Label>
                    <Input
                      id="origin"
                      value={formData.origin}
                      onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                      placeholder="z.B. Sizilien, Hohenlohe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="image_url">Bild-URL</Label>
                    <Input
                      id="image_url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="/path/to/image.jpg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min_stock">Mindestbestand</Label>
                    <Input
                      id="min_stock"
                      type="number"
                      value={formData.min_stock}
                      onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Produkt ist aktiv</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="available_from">Verfügbar ab (optional)</Label>
                  <Input
                    id="available_from"
                    value={formData.available_from}
                    onChange={(e) => setFormData({ ...formData, available_from: e.target.value })}
                    placeholder="z.B. Januar, Februar 2025, 15. März"
                  />
                  <p className="text-xs text-muted-foreground">
                    Wird unter dem Verfügbarkeitsstatus angezeigt, z.B. "Verfügbar ab Januar"
                  </p>
                </div>
                {/* </CHANGE> */}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Abbrechen
                  </Button>
                  <Button type="submit">{editingProduct ? "Aktualisieren" : "Erstellen"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Produktübersicht
          </CardTitle>
          <CardDescription>
            {products.length} Produkte insgesamt, {products.filter((p) => p.is_active).length} aktiv
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Produkte durchsuchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Kategorie wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Kategorien</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Produkt</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Preis</TableHead>
                  <TableHead>Einheit</TableHead>
                  <TableHead>Herkunft</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Lade Produkte...
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Keine Produkte gefunden
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          {product.image_url && (
                            <img
                              src={product.image_url || "/placeholder.svg"}
                              alt={product.name}
                              className="h-10 w-10 rounded object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none"
                              }}
                            />
                          )}
                          <div>
                            <div className="font-medium">{product.name}</div>
                            {product.weight_kg && (
                              <div className="text-sm text-muted-foreground">{product.weight_kg} kg</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{product.category}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(product.price)}</TableCell>
                      <TableCell>{product.unit}</TableCell>
                      <TableCell>{product.origin || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={product.is_active ? "default" : "secondary"}>
                          {product.is_active ? "Aktiv" : "Inaktiv"}
                        </Badge>
                        {product.attributes?.available_from && (
                          <div className="text-sm text-muted-foreground">
                            Verfügbar ab {product.attributes.available_from}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(product)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Produkt löschen</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Sind Sie sicher, dass Sie "{product.name}" löschen möchten? Diese Aktion kann nicht
                                  rückgängig gemacht werden.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(product.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Löschen
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
