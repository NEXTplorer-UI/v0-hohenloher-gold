"use client"
import { useState, useEffect } from "react"
import type React from "react"
import { useAdminCache } from "@/hooks/use-admin-cache"

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
import { Plus, Edit, Trash2, Search, RefreshCw, Package, Cloud, CloudOff, X, Loader2, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"

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
  inventory_raw_id?: number | null
  is_raw_stock_managed?: boolean
  hellocash_article_id?: number | null // Added HelloCash article ID
  hellocash_category_id?: number | null // Added HelloCash category ID
  hellocash_stock_managed?: boolean // Added HelloCash stock managed field
  attributes?: {
    available_from?: string
  }
}

interface Category {
  id: number
  name: string
  slug: string
  is_active: boolean
  hellocash_category_id?: number | null // Added for category mapping
}

interface RawStockGroup {
  id: number
  product_group: string
  stock_grams: number
  unit_type: "weight" | "volume"
  product_count?: number
  product_names?: string[] | null
  minimum_stock_grams?: number // Added for minimum stock
}

interface ProductAssignment {
  product_id: number
  product_name: string
  current_raw_id: number | null
  selected_raw_id: number | null
}

export default function ProductManagement() {
  const {
    data: cachedProducts,
    isLoading: cacheLoading,
    refresh: refreshCache,
    updateCache,
  } = useAdminCache<Product[]>("/api/admin/products", {
    revalidateOnFocus: false,
  })

  const [products, setProducts] = useState<Product[]>(cachedProducts || [])
  const [categories, setCategories] = useState<Category[]>([])
  const [rawStockGroups, setRawStockGroups] = useState<RawStockGroup[]>([])
  const [helloCashCategories, setHelloCashCategories] = useState<any[]>([])
  const [isHelloCashCategoriesDialogOpen, setIsHelloCashCategoriesDialogOpen] = useState(false)
  const [loading, setLoading] = useState(!cachedProducts)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isCreatingNewRawStock, setIsCreatingNewRawStock] = useState(false)
  const [newRawStockName, setNewRawStockName] = useState("")
  const [newRawStockType, setNewRawStockType] = useState<"weight" | "volume">("weight")
  const { toast } = useToast()

  // CHANGE: Added state for minimum stock in dialog
  const [newRawStockMinStock, setNewRawStockMinStock] = useState<string>("5000")
  const [showCreateRawGroupDialog, setShowCreateRawGroupDialog] = useState(false) // State for the new dialog

  const [showCategoryMappings, setShowCategoryMappings] = useState(false)
  const [categoryMappings, setCategoryMappings] = useState<
    Array<{
      id: number
      name: string
      hellocash_category_id: number | null
    }>
  >([])

  const [tempCategoryMappings, setTempCategoryMappings] = useState<
    Array<{
      id: number
      name: string
      hellocash_category_id: number | null
    }>
  >([])

  const [activeTab, setActiveTab] = useState("products")
  const [selectedRawGroup, setSelectedRawGroup] = useState<number | null>(null)
  const [productAssignments, setProductAssignments] = useState<ProductAssignment[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [editingGroupName, setEditingGroupName] = useState<string>("")
  const [editingGroupType, setEditingGroupType] = useState<"weight" | "volume">("weight")
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)

  const [selectedProductsForGroup, setSelectedProductsForGroup] = useState<number[]>([])

  const [modifiedProductIds, setModifiedProductIds] = useState<Set<number>>(new Set())

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
    inventory_raw_id: null as number | null,
    is_raw_stock_managed: true,
    hellocash_article_id: null as number | null, // Added HelloCash article ID
    hellocash_category_id: null as number | null, // Added hellocash_category_id field
    hellocash_stock_managed: false, // Added hellocash_stock_managed field
  })

  const loadProductAssignments = () => {
    if (!selectedRawGroup || products.length === 0) return

    const assignments = products.map((p) => {
      const isAssigned = p.inventory_raw_id === selectedRawGroup
      return {
        product_id: p.id,
        product_name: p.name,
        current_raw_id: p.inventory_raw_id || null,
        selected_raw_id: isAssigned ? selectedRawGroup : null,
      }
    })

    setProductAssignments(assignments)
    setHasUnsavedChanges(false)
  }

  useEffect(() => {
    if (selectedRawGroup && products.length > 0) {
      loadProductAssignments()
    }
  }, [selectedRawGroup]) // Only run when selectedRawGroup changes, not products.length

  const handleProductToggle = (productId: number, checked: boolean) => {
    setProductAssignments((prev) =>
      prev.map((p) => (p.product_id === productId ? { ...p, selected_raw_id: checked ? selectedRawGroup : null } : p)),
    )
    setModifiedProductIds((prev) => new Set(prev).add(productId))
    setHasUnsavedChanges(true)
  }

  const saveProductAssignments = async () => {
    if (!selectedRawGroup) {
      toast({
        title: "Fehler",
        description: "Keine Rohware-Gruppe ausgewählt",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const updates = productAssignments
        .filter((p) => modifiedProductIds.has(p.product_id) && p.selected_raw_id !== p.current_raw_id)
        .map((p) => ({
          product_id: p.product_id,
          inventory_raw_id: p.selected_raw_id,
        }))

      if (updates.length === 0) {
        toast({
          title: "Info",
          description: "Keine Änderungen zu speichern",
        })
        setLoading(false)
        return
      }

      const response = await fetch("/api/admin/inventory/assign-products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignments: updates,
        }),
      })

      if (response.ok) {
        toast({
          title: "Erfolg",
          description: `${updates.length} Produkt(e) wurden zugeordnet`,
        })

        await Promise.all([fetchProducts(), fetchRawStockGroups()])
        await loadProductAssignments()

        setModifiedProductIds(new Set())
        setHasUnsavedChanges(false)
      } else {
        const error = await response.json()
        toast({
          title: "Fehler",
          description: error.error || "Fehler beim Zuordnen der Produkte",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error saving product assignments:", error)
      toast({
        title: "Fehler",
        description: "Fehler beim Zuordnen der Produkte",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveProductFromGroup = async (productId: number) => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/inventory/assign-products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignments: [
            {
              product_id: productId,
              inventory_raw_id: null,
            },
          ],
        }),
      })

      if (response.ok) {
        toast({
          title: "Erfolg",
          description: "Produkt wurde aus der Gruppe entfernt",
        })

        await Promise.all([fetchProducts(), fetchRawStockGroups()])
        if (selectedRawGroup) {
          await loadProductAssignments()
        }
      } else {
        const error = await response.json()
        toast({
          title: "Fehler",
          description: error.error || "Fehler beim Entfernen des Produkts",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error removing product from group:", error)
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // CHANGE: Added handler for creating new raw stock group
  const handleCreateRawStockGroup = async () => {
    if (!newRawStockName.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Namen ein",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/admin/inventory/raw-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_group: newRawStockName.trim(),
          unit_type: newRawStockType,
          min_stock_grams: newRawStockType === "weight" ? 5000 : 5000, // 5kg or 5L default
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Fehler beim Erstellen der Rohware-Gruppe")
      }

      const newGroup = await response.json()

      setRawStockGroups([...rawStockGroups, newGroup])
      setShowCreateRawGroupDialog(false)
      setNewRawStockName("")
      setNewRawStockType("weight")

      toast({
        title: "Erfolg",
        description: `Rohware-Gruppe "${newRawStockName}" wurde erstellt`,
      })
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Fehler beim Erstellen der Rohware-Gruppe",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNewGroup = async () => {
    if (!editingGroupName.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Namen ein",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      const response = await fetch("/api/admin/inventory/raw-stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.JSON.stringify({
          product_group: editingGroupName.trim(),
          unit_type: editingGroupType,
          stock_grams: 0,
          min_stock_grams: editingGroupType === "weight" ? 2000 : 5000,
        }),
      })

      if (response.ok) {
        const newGroup = await response.json()

        if (selectedProductsForGroup.length > 0) {
          await Promise.all(
            selectedProductsForGroup.map((productId) =>
              fetch("/api/admin/products/assign-raw-group", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  productId,
                  rawGroupId: newGroup.id,
                }),
              }),
            ),
          )
        }

        toast({
          title: "Erfolg",
          description: `Rohware-Gruppe wurde erstellt${selectedProductsForGroup.length > 0 ? ` mit ${selectedProductsForGroup.length} Produkten` : ""}`,
        })

        await fetchRawStockGroups()
        setIsCreatingGroup(false)
        setEditingGroupName("")
        setSelectedProductsForGroup([])
        setSelectedRawGroup(newGroup.id)

        loadProductAssignments()
      } else {
        const error = await response.json()
        toast({
          title: "Fehler",
          description: error.error || "Fehler beim Erstellen",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating group:", error)
      toast({
        title: "Fehler",
        description: "Verbindungsfehler",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // CHANGE: Separate effect for auto-selecting first group
  useEffect(() => {
    if (selectedRawGroup === null && rawStockGroups.length > 0) {
      setSelectedRawGroup(rawStockGroups[0].id)
    }
  }, [rawStockGroups.length, selectedRawGroup])

  // CHANGE: Only fetch once when tab activates, not on every rawStockGroups change
  useEffect(() => {
    if (activeTab === "raw-stock") {
      fetchRawStockGroups()
    }
  }, [activeTab])

  const fetchProducts = async () => {
    if (cachedProducts && products.length > 0) {
      console.log("[v0] Using cached products data")
      return
    }

    setLoading(true)
    try {
      await refreshCache()

      toast({
        title: "Aktualisiert",
        description: "Produkte wurden neu geladen",
      })
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
        const categoriesArray = Array.isArray(data) ? data : data.categories || []
        setCategories(categoriesArray)
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

  const fetchRawStockGroups = async () => {
    try {
      console.log("[v0] Fetching raw stock groups...")
      const response = await fetch("/api/admin/inventory/raw-stock")
      console.log("[v0] Raw stock groups response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Raw stock groups loaded:", data)
        setRawStockGroups(data.rawStocks || data || [])
      } else {
        const errorText = await response.text()
        console.error("[v0] Failed to fetch raw stock groups:", response.status, errorText)
      }
    } catch (error) {
      console.error("[v0] Error fetching raw stock groups:", error)
    }
  }

  const fetchHelloCashCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/hellocash/categories")

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] HelloCash categories:", data)
        const categoriesArray = data.categories || []
        setHelloCashCategories(categoriesArray)
        setIsHelloCashCategoriesDialogOpen(true)

        toast({
          title: "HelloCash Kategorien geladen",
          description: `${categoriesArray.length} Kategorien gefunden`,
        })
      } else {
        const error = await response.json()
        toast({
          title: "Fehler",
          description: error.error || "Fehler beim Laden der HelloCash Kategorien",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching HelloCash categories:", error)
      toast({
        title: "Fehler",
        description: "Verbindungsfehler beim Laden der HelloCash Kategorien",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchCategoryMappings = async () => {
    try {
      const [categoriesResponse, helloCashResponse] = await Promise.all([
        fetch("/api/admin/categories"),
        fetch("/api/admin/hellocash/categories"),
      ])

      if (categoriesResponse.ok) {
        const data = await categoriesResponse.json()
        const categoriesArray = Array.isArray(data) ? data : data.categories || []
        const mappings = categoriesArray.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          hellocash_category_id: cat.hellocash_category_id || null,
        }))
        setCategoryMappings(mappings)
        setTempCategoryMappings(mappings)
      }

      if (helloCashResponse.ok) {
        const helloCashData = await helloCashResponse.json()
        setHelloCashCategories(helloCashData.categories || [])
      }

      setShowCategoryMappings(true)
    } catch (error) {
      console.error("Error fetching category mappings:", error)
      toast({
        title: "Fehler",
        description: "Verbindungsfehler beim Laden der Kategorien",
        variant: "destructive",
      })
    }
  }

  const saveCategoryMappings = async () => {
    try {
      const promises = tempCategoryMappings.map(async (mapping) => {
        const response = await fetch(`/api/admin/categories/${mapping.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ hellocash_category_id: mapping.hellocash_category_id }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(`Failed to update category ${mapping.name}: ${error.error || "Unknown error"}`)
        }
      })

      await Promise.all(promises)

      setCategoryMappings(tempCategoryMappings) // Update permanent mappings

      toast({
        title: "Erfolg",
        description: "Alle Kategorie-Mappings wurden gespeichert",
      })
    } catch (error) {
      console.error("Error saving category mappings:", error)
      toast({
        title: "Fehler",
        description: (error as Error).message || "Fehler beim Speichern der Kategorie-Mappings",
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
      inventory_raw_id: null,
      is_raw_stock_managed: true,
      hellocash_article_id: null,
      hellocash_category_id: null,
      hellocash_stock_managed: false,
    })
    setEditingProduct(null)
    setIsCreatingNewCategory(false)
    setNewCategoryName("")
    setIsCreatingNewRawStock(false)
    setNewRawStockName("")
    setNewRawStockType("weight")
    // Reset modified product tracking when resetting the form for a new product
    setModifiedProductIds(new Set())
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

  // DELETED: Redeclared handleCreateRawStockGroup removed
  // const handleCreateRawStockGroup = async () => { ... }

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

    if (formData.is_raw_stock_managed && !formData.inventory_raw_id) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie eine Rohware-Gruppe aus oder erstellen Sie eine neue",
        variant: "destructive",
      })
      return
    }

    if (!formData.weight_kg || Number.parseFloat(formData.weight_kg) <= 0) {
      toast({
        title: "Fehler",
        description: "Gewicht ist erforderlich und muss größer als 0 sein",
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
      const attributesValue = Object.keys(attributes).length > 0 ? attributes : null

      const payload = {
        ...formData,
        category_id: categoryId,
        attributes: attributesValue,
        inventory_raw_id: formData.is_raw_stock_managed ? formData.inventory_raw_id : null,
        is_raw_stock_managed: formData.is_raw_stock_managed,
        hellocash_category_id: formData.hellocash_category_id, // Ensure this is passed
        hellocash_stock_managed: formData.hellocash_stock_managed, // Ensure this is passed
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

        if (editingProduct) {
          const updatedProducts = products.map((p) => (p.id === editingProduct.id ? result : p))
          updateCache(updatedProducts)
        } else {
          const updatedProducts = [...products, result]
          updateCache(updatedProducts)
        }

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
      inventory_raw_id: product.inventory_raw_id || null,
      is_raw_stock_managed: product.is_raw_stock_managed !== false, // Default to true
      hellocash_article_id: product.hellocash_article_id || null, // Added HelloCash article ID
      hellocash_category_id: product.hellocash_category_id || null, // Added hellocash_category_id to edit form
      hellocash_stock_managed: (product as any).hellocash_stock_managed || false, // Load hellocash_stock_managed from product
    })
    setIsDialogOpen(true)
    // Clear modified product tracking when starting to edit an existing product
    setModifiedProductIds(new Set())
  }

  const handleDelete = async (productId: number) => {
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        const updatedProducts = products.filter((p) => p.id !== productId)
        updateCache(updatedProducts)

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

  const handleHelloCashSync = async (product: Product) => {
    try {
      const response = await fetch("/api/admin/products/hellocash-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: product.id,
          hellocash_article_id: product.hellocash_article_id,
          hellocash_category_id: product.hellocash_category_id, // Include category ID for sync
          hellocash_stock_managed: product.hellocash_stock_managed, // Include stock managed flag
        }),
      })

      if (response.ok) {
        const result = await response.json()

        // Update product with HelloCash ID, category ID, and stock managed flag
        const updatedProducts = products.map((p) =>
          p.id === product.id
            ? {
                ...p,
                hellocash_article_id: result.hellocash_article_id,
                hellocash_category_id: result.hellocash_category_id,
                hellocash_stock_managed: result.hellocash_stock_managed, // Update stock managed flag
              }
            : p,
        )
        updateCache(updatedProducts)

        toast({
          title: "Erfolg",
          description: result.message,
        })

        await fetchProducts()
      } else {
        const error = await response.json()
        toast({
          title: "Fehler",
          description: error.error || "Fehler bei der HelloCash Synchronisation",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error syncing with HelloCash:", error)
      toast({
        title: "Fehler",
        description: "Verbindungsfehler bei der HelloCash Synchronisation",
        variant: "destructive",
      })
    }
  }

  const handleBulkHelloCashSync = async () => {
    setLoading(true)
    try {
      toast({
        title: "Synchronisierung gestartet",
        description: "Alle Produkte werden mit HelloCash synchronisiert...",
      })

      const response = await fetch("/api/admin/products/hellocash-sync-all", {
        method: "POST",
      })

      if (response.ok) {
        const result = await response.json()

        toast({
          title: "Synchronisierung abgeschlossen",
          description: result.message,
        })

        if (result.errors && result.errors.length > 0) {
          console.error("[v0] Bulk sync errors:", result.errors)
        }

        await fetchProducts()
      } else {
        const error = await response.json()
        toast({
          title: "Fehler",
          description: error.error || "Fehler bei der Bulk-Synchronisation",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error with bulk HelloCash sync:", error)
      toast({
        title: "Fehler",
        description: "Verbindungsfehler bei der Synchronisation",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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
      fetchRawStockGroups()
    }
  }, [isDialogOpen])

  useEffect(() => {
    if (cachedProducts) {
      setProducts(cachedProducts)
    }
  }, [cachedProducts])

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  // CHANGE: Handle create raw group logic
  const handleCreateRawGroup = async () => {
    if (!newRawStockName.trim() || !newRawStockType) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Pflichtfelder aus",
        variant: "destructive",
      })
      return
    }

    const minStockValue = Number.parseInt(newRawStockMinStock) || (newRawStockType === "weight" ? 5000 : 5000)

    setIsCreatingNewRawStock(true)
    try {
      const response = await fetch("/api/admin/inventory/raw-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_group: newRawStockName,
          unit_type: newRawStockType,
          stock_grams: 0,
          min_stock_grams: minStockValue, // : Send user-defined min stock
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Fehler beim Erstellen der Gruppe")
      }

      // Refresh the list
      fetchRawStockGroups()

      // Reset form
      setNewRawStockName("")
      setNewRawStockType("weight")
      setNewRawStockMinStock("5000") // : Reset min stock field
      setShowCreateRawGroupDialog(false)

      toast({
        title: "Erfolg",
        description: `Rohware-Gruppe "${newRawStockName}" wurde erstellt`,
      })
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Erstellen der Gruppe",
        variant: "destructive",
      })
    } finally {
      setIsCreatingNewRawStock(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Produktverwaltung</h2>
          <p className="text-muted-foreground">Verwalten Sie Ihr Produktsortiment</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchProducts} disabled={loading || cacheLoading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading || cacheLoading ? "animate-spin" : ""}`} />
            Aktualisieren
          </Button>
          {/* CHANGE: Added HelloCash categories button */}
          <Button
            onClick={fetchHelloCashCategories}
            disabled={loading || cacheLoading}
            variant="outline"
            size="sm"
            title="HelloCash Kategorien anzeigen"
          >
            <Package className="h-4 w-4 mr-2" />
            HC Kategorien
          </Button>
          <Button
            onClick={handleBulkHelloCashSync}
            disabled={loading || cacheLoading}
            variant="outline"
            size="sm"
            title="Alle aktiven Produkte mit HelloCash synchronisieren"
          >
            <Cloud className="h-4 w-4 mr-2" />
            Alle synchronisieren
          </Button>
          <Button
            onClick={fetchCategoryMappings}
            disabled={loading || cacheLoading}
            variant="outline"
            size="sm"
            title="Kategorie zu HelloCash Mapping verwalten"
          >
            <Package className="h-4 w-4 mr-2" />
            Kategorie-Mapping
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
                    <Label htmlFor="weight_kg">Gewicht (kg) *</Label>
                    <Input
                      id="weight_kg"
                      type="number"
                      step="0.01"
                      value={formData.weight_kg}
                      onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                      placeholder="z.B. 7.5 für 7,5kg Kiste"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Für Öl: 1L = 1kg. Dieses Gewicht wird vom Rohwaren-Bestand abgezogen.
                    </p>
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

                <div className="space-4 p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Gramm-basierte Lagerverwaltung</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Empfohlen für alle Produkte. Bestand wird in Gramm vom Rohwaren-Lager abgezogen.
                      </p>
                    </div>
                    <Switch
                      id="is_raw_stock_managed"
                      checked={formData.is_raw_stock_managed}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_raw_stock_managed: checked })}
                    />
                  </div>

                  {formData.is_raw_stock_managed && (
                    <div className="space-y-2">
                      <Label htmlFor="inventory_raw_id">Rohware-Gruppe *</Label>
                      {isCreatingNewRawStock ? (
                        <div className="space-y-2">
                          <Input
                            value={newRawStockName}
                            onChange={(e) => setNewRawStockName(e.target.value)}
                            placeholder="Name der Rohware-Gruppe"
                            autoFocus
                          />
                          <div className="flex items-center gap-2">
                            <Label className="text-sm">Typ:</Label>
                            <select
                              value={newRawStockType}
                              onChange={(e) => setNewRawStockType(e.target.value as "weight" | "volume")}
                              className="px-2 py-1 border rounded text-sm"
                            >
                              <option value="weight">Gewicht (kg/g)</option>
                              <option value="volume">Volumen (L/ml)</option>
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleCreateRawStockGroup}
                              className="flex-1 bg-transparent"
                            >
                              Erstellen
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setIsCreatingNewRawStock(false)
                                setNewRawStockName("")
                                setNewRawStockType("weight")
                              }}
                            >
                              Abbrechen
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Select
                          value={formData.inventory_raw_id?.toString() || ""}
                          onValueChange={(value) => {
                            if (value === "__create_new__") {
                              setIsCreatingNewRawStock(true)
                            } else {
                              setFormData({ ...formData, inventory_raw_id: value ? Number.parseInt(value) : null })
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Rohware-Gruppe wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__create_new__" className="text-primary font-medium">
                              <div className="flex items-center">
                                <Plus className="h-4 w-4 mr-2" />
                                Neue Rohware-Gruppe erstellen
                              </div>
                            </SelectItem>
                            {rawStockGroups.map((group) => (
                              <SelectItem key={group.id} value={group.id.toString()}>
                                {group.product_group} ({group.unit_type === "weight" ? "Gewicht" : "Volumen"})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {formData.inventory_raw_id && formData.weight_kg && (
                        <div className="text-sm text-muted-foreground bg-background p-2 rounded border">
                          <strong>Info:</strong> Bei jedem Verkauf werden{" "}
                          {(Number.parseFloat(formData.weight_kg) * 1000).toFixed(0)} g vom Bestand "
                          {rawStockGroups.find((g) => g.id === formData.inventory_raw_id)?.product_group}" abgezogen.
                        </div>
                      )}
                    </div>
                  )}
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

                {/* CHANGE: Added HelloCash stock management checkbox */}
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <Switch
                    id="hellocash_stock_managed"
                    checked={formData.hellocash_stock_managed}
                    onCheckedChange={(checked) => setFormData({ ...formData, hellocash_stock_managed: checked })}
                  />
                  <div className="flex-1">
                    <Label htmlFor="hellocash_stock_managed" className="cursor-pointer">
                      Bestand in HelloCash-Kasse führen
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Wenn aktiviert (article_stock_status: 0), ändert HelloCash den Bestand bei Verkauf. Wenn
                      deaktiviert (article_stock_status: 2), bleibt der Bestand unverändert.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hellocash_category_id">HelloCash Kategorie (optional)</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.hellocash_category_id ? formData.hellocash_category_id.toString() : "none"}
                      onValueChange={(value) => {
                        setFormData({
                          ...formData,
                          hellocash_category_id: value === "none" ? null : Number.parseInt(value),
                        })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="HelloCash Kategorie wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Keine Kategorie</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                            {category.hellocash_category_id && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                (HC ID: {category.hellocash_category_id})
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={fetchHelloCashCategories}
                      title="HelloCash Kategorien anzeigen"
                    >
                      <Package className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Wählen Sie die passende HelloCash Kategorie-ID für die Synchronisation. Klicken Sie auf das Icon um
                    die verfügbaren HelloCash Kategorien anzuzeigen.
                  </p>
                </div>

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

      {/* CHANGE: Added HelloCash categories dialog */}
      <Dialog open={isHelloCashCategoriesDialogOpen} onOpenChange={setIsHelloCashCategoriesDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>HelloCash Kategorien</DialogTitle>
            <DialogDescription>
              Diese Kategorie-IDs werden von HelloCash verwendet. Verwenden Sie diese IDs beim Mapping Ihrer Produkte.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kategorie ID</TableHead>
                  <TableHead>Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {helloCashCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                      Keine Kategorien gefunden
                    </TableCell>
                  </TableRow>
                ) : (
                  helloCashCategories.map((category) => (
                    <TableRow key={category.article_category_id}>
                      <TableCell className="font-mono font-bold">{category.article_category_id}</TableCell>
                      <TableCell>{category.article_category_name}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsHelloCashCategoriesDialogOpen(false)}>Schließen</Button>
            <Button onClick={fetchCategoryMappings}>Kategorie-Mapping</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCategoryMappings} onOpenChange={setShowCategoryMappings}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kategorie zu HelloCash Mapping</DialogTitle>
            <DialogDescription>
              Ordnen Sie Ihre lokalen Kategorien den HelloCash Kategorien zu. Wählen Sie die passende HelloCash
              Kategorie aus dem Dropdown.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {tempCategoryMappings.map((category) => (
              <div key={category.id} className="flex items-center gap-4 p-3 border rounded-lg">
                <div className="flex-1">
                  <label className="text-sm font-medium">{category.name}</label>
                </div>
                <Select
                  value={category.hellocash_category_id?.toString() || "none"}
                  onValueChange={(value) => {
                    const newValue = value === "none" ? null : Number.parseInt(value)
                    setTempCategoryMappings((mappings) =>
                      mappings.map((m) => (m.id === category.id ? { ...m, hellocash_category_id: newValue } : m)),
                    )
                  }}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="HelloCash Kategorie wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Keine Zuordnung</SelectItem>
                    {helloCashCategories.map((hcCat: any) => (
                      <SelectItem key={hcCat.article_category_id} value={hcCat.article_category_id.toString()}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{hcCat.article_category_id}</span>
                          <span>{hcCat.article_category_name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryMappings(false)}>
              Abbrechen
            </Button>
            <Button onClick={saveCategoryMappings}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Produktverwaltung
          </CardTitle>
          <CardDescription>Verwalten Sie Ihr Produktsortiment und Rohware-Gruppen</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="products">Produkte</TabsTrigger>
              <TabsTrigger value="raw-stock">Rohware-Gruppen</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="mt-6">
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
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleHelloCashSync(product)}
                                title={
                                  product.hellocash_article_id
                                    ? "Mit HelloCash synchronisieren"
                                    : "In HelloCash erstellen"
                                }
                              >
                                {product.hellocash_article_id ? (
                                  <Cloud className="h-4 w-4 text-green-600" />
                                ) : (
                                  <CloudOff className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
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
                                      Sind Sie sicher, dass Sie "{product.name}" löschen möchten? Diese Aktion kann
                                      nicht rückgängig gemacht werden.
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
            </TabsContent>

            <TabsContent value="raw-stock" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Rohwarengruppen Liste */}
                <Card>
                  <CardHeader>
                    {/* CHANGE: Added button to create new raw stock group */}
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Rohwarengruppen</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Wählen Sie eine Gruppe aus um Produkte zuzuordnen
                        </p>
                      </div>
                      <Dialog open={showCreateRawGroupDialog} onOpenChange={setShowCreateRawGroupDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Neue Gruppe
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Neue Rohware-Gruppe erstellen</DialogTitle>
                            <DialogDescription>
                              Erstellen Sie eine neue Rohware-Gruppe für gramm- oder literbasierte Produkte
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="raw-group-name">Name der Gruppe *</Label>
                              <Input
                                id="raw-group-name"
                                placeholder="z.B. Orangen, Zitronen, Olivenöl"
                                value={newRawStockName}
                                onChange={(e) => setNewRawStockName(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="raw-group-type">Typ *</Label>
                              <Select
                                value={newRawStockType}
                                onValueChange={(value: "weight" | "volume") => setNewRawStockType(value)}
                              >
                                <SelectTrigger id="raw-group-type">
                                  <SelectValue placeholder="Typ auswählen" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="weight">Gewicht (kg)</SelectItem>
                                  <SelectItem value="volume">Volumen (Liter)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="raw-group-min-stock">
                                Mindestbestand ({newRawStockType === "weight" ? "g" : "ml"})
                              </Label>
                              <Input
                                id="raw-group-min-stock"
                                type="number"
                                placeholder="z.B. 5000"
                                value={newRawStockMinStock}
                                onChange={(e) => setNewRawStockMinStock(e.target.value)}
                              />
                              <p className="text-xs text-muted-foreground">
                                Standard: 5000{newRawStockType === "weight" ? "g (5kg)" : "ml (5L)"}
                              </p>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setShowCreateRawGroupDialog(false)}
                              disabled={isCreatingNewRawStock}
                            >
                              Abbrechen
                            </Button>
                            <Button onClick={handleCreateRawGroup} disabled={isCreatingNewRawStock}>
                              {isCreatingNewRawStock ? "Wird erstellt..." : "Erstellen"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                      {rawStockGroups.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          Noch keine Rohware-Gruppen erstellt
                        </p>
                      ) : (
                        rawStockGroups.map((group) => (
                          <div
                            key={group.id}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                              selectedRawGroup === group.id
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                            onClick={() => {
                              setSelectedRawGroup(group.id)
                              setHasUnsavedChanges(false)
                            }}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold text-lg">{group.product_group}</h3>
                              <Badge variant="secondary">{group.unit_type === "weight" ? "Gewicht" : "Volumen"}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Bestand:</span>
                                <p className="font-medium">{(group.stock_grams / 1000).toFixed(2)} kg</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Produkte:</span>
                                <p className="font-medium">{group.product_count || 0}</p>
                              </div>
                            </div>
                            {group.minimum_stock_grams && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                Mindestbestand: {(group.minimum_stock_grams / 1000).toFixed(2)} kg
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Right: Produkte zuordnen */}
                <Card>
                  <CardHeader>
                    <CardTitle>Produkte zuordnen</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {selectedRawGroup
                        ? `Produkte für "${rawStockGroups.find((g) => g.id === selectedRawGroup)?.product_group}" auswählen`
                        : "Wählen Sie links eine Gruppe aus"}
                    </p>
                  </CardHeader>
                  <CardContent>
                    {!selectedRawGroup ? (
                      <div className="text-center py-12">
                        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          Wählen Sie links eine Rohwarengruppe aus um Produkte zuzuordnen
                        </p>
                      </div>
                    ) : (
                      <>
                        {selectedRawGroup &&
                          productAssignments.filter((p) => p.current_raw_id === selectedRawGroup).length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium mb-2">Aktuell zugeordnet:</h4>
                              <div className="flex flex-wrap gap-2">
                                {productAssignments
                                  .filter((p) => p.current_raw_id === selectedRawGroup)
                                  .map((assignment) => (
                                    <Badge
                                      key={assignment.product_id}
                                      variant="secondary"
                                      className="flex items-center gap-1"
                                    >
                                      {assignment.product_name}
                                      <button
                                        onClick={() => handleRemoveProductFromGroup(assignment.product_id)}
                                        className="ml-1 hover:text-destructive"
                                        disabled={loading}
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </Badge>
                                  ))}
                              </div>
                            </div>
                          )}

                        <div className="max-h-[500px] overflow-y-auto pr-2 space-y-2">
                          {products.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">Keine Produkte verfügbar</p>
                          ) : (
                            products.map((product) => {
                              const assignment = productAssignments.find((p) => p.product_id === product.id)
                              const isAssignedToThisGroup = assignment?.selected_raw_id === selectedRawGroup
                              const isAssignedToOtherGroup =
                                assignment?.current_raw_id && assignment.current_raw_id !== selectedRawGroup
                              const otherGroupName = isAssignedToOtherGroup
                                ? rawStockGroups.find((g) => g.id === assignment?.current_raw_id)?.product_group
                                : null

                              return (
                                <div
                                  key={product.id}
                                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                  <Checkbox
                                    id={`product-${product.id}`}
                                    checked={assignment?.selected_raw_id === selectedRawGroup}
                                    onCheckedChange={(checked) => handleProductToggle(product.id, checked as boolean)}
                                    disabled={loading}
                                  />
                                  <label
                                    htmlFor={`product-${product.id}`}
                                    className="flex-1 cursor-pointer select-none"
                                  >
                                    <div className="font-medium">{product.name}</div>
                                    {otherGroupName && (
                                      <div className="text-xs text-muted-foreground">aktuell: {otherGroupName}</div>
                                    )}
                                  </label>
                                  {isAssignedToThisGroup && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() => handleRemoveProductFromGroup(product.id)}
                                      disabled={loading}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              )
                            })
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-6 pt-4 border-t">
                          <div className="text-sm text-muted-foreground">
                            {hasUnsavedChanges && "Ungespeicherte Änderungen"}
                          </div>
                          <Button onClick={saveProductAssignments} disabled={!hasUnsavedChanges || loading}>
                            {loading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Speichern...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
                                Änderungen speichern
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
