"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"

interface Product {
  id: number
  name: string
  category: string
  price: number
  description: string
  image_url: string
  unit: string
  origin: string
  active: boolean
  created_at?: string
  updated_at?: string
}

interface ProductsContextType {
  products: Product[]
  loading: boolean
  error: string | null
  refreshProducts: () => Promise<void>
  getProductsByCategory: (category: string) => Product[]
  getAllCategories: () => string[]
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined)

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/products")
      if (!response.ok) {
        throw new Error("Failed to fetch products")
      }

      const data = await response.json()
      setProducts(data)
    } catch (err) {
      console.error("Error fetching products:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch products")
    } finally {
      setLoading(false)
    }
  }

  const refreshProducts = async () => {
    await fetchProducts()
  }

  const getProductsByCategory = (category: string): Product[] => {
    return products.filter((product) => product.category === category)
  }

  const getAllCategories = (): string[] => {
    const categories = [...new Set(products.map((product) => product.category))]
    return categories.sort()
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const value: ProductsContextType = {
    products,
    loading,
    error,
    refreshProducts,
    getProductsByCategory,
    getAllCategories,
  }

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>
}

export function useProducts() {
  const context = useContext(ProductsContext)
  if (context === undefined) {
    throw new Error("useProducts must be used within a ProductsProvider")
  }
  return context
}
