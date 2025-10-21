import useSWR from "swr"

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

export function useProductsSWR() {
  const { data, error, isLoading, mutate } = useSWR<Product[]>("/api/products", {
    revalidateOnMount: true,
    dedupingInterval: 60000, // Cache for 1 minute
  })

  return {
    products: data || [],
    isLoading,
    isError: error,
    refresh: mutate,
    getProductsByCategory: (category: string) => {
      return (data || []).filter((product) => product.category === category)
    },
    getAllCategories: () => {
      const categories = [...new Set((data || []).map((product) => product.category))]
      return categories.sort()
    },
  }
}
