"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, ArrowRight, User } from "lucide-react"
import { NextArrivalBanner } from "@/components/next-arrival-banner"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState, Suspense } from "react"
import { LoadingSpinner } from "@/components/loading-spinner"

interface Article {
  id: string
  title: string
  content: string
  excerpt: string | null
  image_url: string | null
  featured: boolean
  status: string
  author: string
  category: string
  created_at: string
}

function ArticlesList() {
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const fetchArticles = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching articles:", error)
        throw error
      }

      setArticles(data || [])
    }

    fetchArticles()
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("de-DE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const openArticleModal = (article: Article) => {
    setSelectedArticle(article)
    setIsModalOpen(true)
  }

  return (
    <>
      {/* Featured Article */}
      {articles
        .filter((article) => article.featured)
        .map((article) => (
          <section key={article.id} className="py-20 bg-background">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-6xl mx-auto">
                <Badge variant="outline" className="mb-6">
                  Hauptartikel
                </Badge>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="grid lg:grid-cols-2 gap-0">
                    <div className="relative h-64 lg:h-auto cursor-pointer" onClick={() => openArticleModal(article)}>
                      <img
                        src={
                          article.image_url ||
                          "/placeholder.svg?height=400&width=600&query=Hohenloher Gold featured article" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg"
                        }
                        alt={article.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-8 lg:p-12 flex flex-col justify-center">
                      <div className="space-y-4">
                        <Badge variant="secondary">{article.category}</Badge>
                        <h2 className="font-serif font-bold text-2xl lg:text-3xl text-foreground leading-tight">
                          {article.title}
                        </h2>
                        <p className="text-muted-foreground leading-relaxed">
                          {article.excerpt || article.content.substring(0, 200) + "..."}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(article.created_at)}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4" />
                            <span>{article.author}</span>
                          </div>
                        </div>
                        <Button className="w-fit mt-4" onClick={() => openArticleModal(article)}>
                          Weiterlesen
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </section>
        ))}

      {/* News Grid */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-serif font-bold text-3xl text-card-foreground mb-12">Weitere Neuigkeiten</h2>
            {articles.filter((article) => !article.featured).length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">Noch keine weiteren Artikel verfügbar.</p>
                <p className="text-muted-foreground text-sm mt-2">Schauen Sie bald wieder vorbei!</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {articles
                  .filter((article) => !article.featured)
                  .map((article) => (
                    <Card key={article.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="relative h-48 cursor-pointer" onClick={() => openArticleModal(article)}>
                        <img
                          src={
                            article.image_url ||
                            "/placeholder.svg?height=200&width=400&query=Hohenloher Gold news article" ||
                            "/placeholder.svg" ||
                            "/placeholder.svg"
                          }
                          alt={article.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <CardHeader className="space-y-3">
                        <Badge variant="outline" className="w-fit">
                          {article.category}
                        </Badge>
                        <h3 className="font-serif font-bold text-lg text-card-foreground leading-tight">
                          {article.title}
                        </h3>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {(article.excerpt || article.content).substring(0, 120)}...
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(article.created_at)}</span>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => openArticleModal(article)}>
                            Lesen
                            <ArrowRight className="ml-1 w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Article Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="!w-[50vw] !max-w-[50vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Artikel lesen</DialogTitle>
          </DialogHeader>
          {selectedArticle && (
            <div className="space-y-6">
              {selectedArticle.image_url && (
                <div className="relative h-64 w-full rounded-lg overflow-hidden">
                  <img
                    src={selectedArticle.image_url || "/placeholder.svg"}
                    alt={selectedArticle.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="space-y-4">
                <Badge variant="secondary">{selectedArticle.category}</Badge>
                <h1 className="font-serif font-bold text-2xl lg:text-3xl text-foreground leading-tight">
                  {selectedArticle.title}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(selectedArticle.created_at)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>{selectedArticle.author}</span>
                  </div>
                </div>
                <div className="prose prose-lg max-w-none">
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">{selectedArticle.content}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function NewsPage() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "news_page" }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: "success", text: data.message })
        setEmail("")
      } else {
        setMessage({ type: "error", text: data.error || "Ein Fehler ist aufgetreten" })
      }
    } catch (error) {
      console.error("Newsletter subscription error:", error)
      setMessage({ type: "error", text: "Verbindungsfehler. Bitte versuchen Sie es später erneut." })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <NextArrivalBanner />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-card to-background py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge variant="secondary" className="w-fit mx-auto">
              Aktuelles
            </Badge>
            <h1 className="font-serif font-bold text-4xl lg:text-6xl text-foreground leading-tight">
              Aktuelles & <span className="text-primary">Neuigkeiten</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              Bleiben Sie auf dem Laufenden über neue Ernten, Partnerschaften und alles rund um Hohenloher Gold und
              unsere sizilianischen Südfrüchte.
            </p>
          </div>
        </div>
      </section>

      <Suspense fallback={<LoadingSpinner className="py-20" text="Artikel werden geladen..." />}>
        <ArticlesList />
      </Suspense>

      {/* Newsletter Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="font-serif font-bold text-3xl lg:text-4xl">Bleiben Sie informiert</h2>
            <p className="text-lg opacity-90">
              Abonnieren Sie unseren Newsletter und erfahren Sie als Erste von neuen Ernten, Produkten und besonderen
              Angeboten.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="pt-4 max-w-md mx-auto space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <input
                  type="email"
                  placeholder="Ihre E-Mail-Adresse"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 rounded-lg text-foreground bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
                <Button type="submit" variant="secondary" size="lg" className="px-8" disabled={isSubmitting}>
                  {isSubmitting ? "Wird gesendet..." : "Anmelden"}
                </Button>
              </div>
              {message && (
                <p
                  className={`text-sm ${
                    message.type === "success" ? "text-green-200" : "text-red-200"
                  } bg-black/20 px-4 py-2 rounded-lg`}
                >
                  {message.text}
                </p>
              )}
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}
