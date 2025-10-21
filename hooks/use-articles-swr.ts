import useSWR from "swr"

interface Article {
  id: number
  title: string
  slug: string
  content: string
  excerpt: string
  image_url: string | null
  featured: boolean
  status: string
  author: string
  author_id: string | null
  category: string
  published_at: string | null
  created_at: string
  updated_at: string
}

export function useArticlesSWR() {
  const { data, error, isLoading, mutate } = useSWR<Article[]>("/api/articles", {
    revalidateOnMount: true,
    dedupingInterval: 60000, // Cache for 1 minute
  })

  return {
    articles: data || [],
    isLoading,
    isError: error,
    refresh: mutate,
    getFeaturedArticle: () => {
      return (data || []).find((article) => article.featured && article.status === "published")
    },
    getPublishedArticles: () => {
      return (data || []).filter((article) => article.status === "published")
    },
  }
}
