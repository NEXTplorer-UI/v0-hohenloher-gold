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

const fetcher = async (url: string) => {
  const res = await fetch(url)

  // If response is not OK, throw a descriptive error
  if (!res.ok) {
    const error = new Error(`API error: ${res.status} ${res.statusText}`)
    console.error("[v0] Articles fetcher error:", error)
    throw error
  }

  // Parse JSON safely
  try {
    return await res.json()
  } catch (e) {
    console.error("[v0] Articles JSON parse error:", e)
    throw new Error("Invalid JSON response from articles API")
  }
}

export function useArticlesSWR() {
  const { data, error, isLoading, mutate } = useSWR<Article[]>("/api/articles", fetcher, {
    revalidateOnMount: true,
    dedupingInterval: 60000, // Cache for 1 minute
  })

  const articles = Array.isArray(data) ? data : []

  return {
    articles,
    isLoading,
    isError: error,
    refresh: mutate,
    getFeaturedArticle: () => {
      return articles.find((article) => article.featured && article.status === "published")
    },
    getPublishedArticles: () => {
      return articles.filter((article) => article.status === "published")
    },
  }
}
