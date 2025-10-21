"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { FileText, Edit, Save, Plus, Star, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

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

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export default function ContentManagementSystem() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    slug: "", // Added slug field
    content: "",
    excerpt: "",
    featured: false,
    status: "draft",
    category: "article",
    author: "",
  })

  const supabase = useMemo(() => createClient(), [])

  const loadArticles = async () => {
    try {
      const { data, error } = await supabase.from("articles").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setArticles(data || [])
    } catch (error) {
      console.error("Error loading articles:", error)
    } finally {
      setLoading(false)
    }
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Upload failed")
      }

      const { url } = await response.json()
      return url
    } catch (error) {
      console.error("Error uploading image:", error)
      alert(`Fehler beim Hochladen des Bildes: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`)
      return null
    }
  }

  const saveArticle = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert("Bitte füllen Sie Titel und Inhalt aus.")
      return
    }

    setUploading(true)
    try {
      let imageUrl = editingArticle?.image_url || null

      // Upload new image if selected
      if (imageFile) {
        imageUrl = await uploadImage(imageFile)
      }

      // If setting as featured, remove featured status from other articles
      if (formData.featured) {
        await supabase
          .from("articles")
          .update({ featured: false })
          .neq("id", editingArticle?.id || 0)
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      const articleData = {
        ...formData,
        image_url: imageUrl,
        excerpt: formData.excerpt || formData.content.substring(0, 150) + "...",
        author_id: user?.id || null, // Added author_id
        updated_at: new Date().toISOString(),
      }

      if (editingArticle) {
        // Update existing article
        const { error } = await supabase.from("articles").update(articleData).eq("id", editingArticle.id)

        if (error) throw error
      } else {
        // Create new article
        const { error } = await supabase.from("articles").insert([
          {
            ...articleData,
            created_at: new Date().toISOString(),
          },
        ])

        if (error) throw error
      }

      await loadArticles()
      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error saving article:", error)
      alert("Fehler beim Speichern des Artikels.")
    } finally {
      setUploading(false)
    }
  }

  const deleteArticle = async (id: number) => {
    if (!confirm("Sind Sie sicher, dass Sie diesen Artikel löschen möchten?")) {
      return
    }

    try {
      const { error } = await supabase.from("articles").delete().eq("id", id)

      if (error) throw error
      await loadArticles()
    } catch (error) {
      console.error("Error deleting article:", error)
      alert("Fehler beim Löschen des Artikels.")
    }
  }

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "", // Reset slug
      content: "",
      excerpt: "",
      featured: false,
      status: "draft",
      category: "article",
      author: "",
    })
    setEditingArticle(null)
    setImageFile(null)
  }

  const startEdit = (article: Article) => {
    setEditingArticle(article)
    setFormData({
      title: article.title,
      slug: article.slug, // Load slug
      content: article.content,
      excerpt: article.excerpt,
      featured: article.featured,
      status: article.status,
      category: article.category,
      author: article.author,
    })
    setIsDialogOpen(true)
  }

  useEffect(() => {
    loadArticles()
  }, [])

  if (loading) {
    return <div className="p-6">Lade Artikel...</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Content Management</CardTitle>
          <CardDescription>Verwaltung von Artikeln und Rezepten</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Neuer Artikel
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingArticle ? "Artikel bearbeiten" : "Neuer Artikel"}</DialogTitle>
                  <DialogDescription>Erstellen oder bearbeiten Sie einen Artikel oder ein Rezept.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Titel</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => {
                        const newTitle = e.target.value
                        setFormData((prev) => ({
                          ...prev,
                          title: newTitle,
                          slug: editingArticle ? prev.slug : generateSlug(newTitle),
                        }))
                      }}
                      placeholder="Artikel-Titel eingeben..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="slug">URL-Slug (SEO)</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                      placeholder="artikel-url-slug"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Wird automatisch aus dem Titel generiert. Nur Kleinbuchstaben und Bindestriche.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="author">Autor</Label>
                    <Input
                      id="author"
                      value={formData.author}
                      onChange={(e) => setFormData((prev) => ({ ...prev, author: e.target.value }))}
                      placeholder="Autor-Name eingeben..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="excerpt">Kurzbeschreibung</Label>
                    <Input
                      id="excerpt"
                      value={formData.excerpt}
                      onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))}
                      placeholder="Kurze Beschreibung (optional)..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="content">Inhalt</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                      placeholder="Artikel-Inhalt eingeben..."
                      rows={8}
                    />
                  </div>

                  <div>
                    <Label htmlFor="image">Bild</Label>
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    />
                    {editingArticle?.image_url && (
                      <div className="mt-2">
                        <img
                          src={editingArticle.image_url || "/placeholder.svg"}
                          alt="Aktuelles Bild"
                          className="w-32 h-32 object-cover rounded"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Kategorie</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="article">Artikel</SelectItem>
                          <SelectItem value="recipe">Rezept</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Entwurf</SelectItem>
                          <SelectItem value="published">Veröffentlicht</SelectItem>
                          <SelectItem value="archived">Archiviert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="featured"
                      checked={formData.featured}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, featured: checked }))}
                    />
                    <Label htmlFor="featured">Als Hauptartikel markieren</Label>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={saveArticle} disabled={uploading}>
                      <Save className="h-4 w-4 mr-2" />
                      {uploading ? "Speichere..." : "Speichern"}
                    </Button>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Abbrechen
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {articles.map((article) => (
              <Card key={article.id} className={`p-4 ${article.featured ? "border-yellow-400 bg-yellow-50" : ""}`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{article.title}</span>
                      {article.featured && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                      <Badge
                        variant={
                          article.status === "published"
                            ? "default"
                            : article.status === "draft"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {article.status === "published"
                          ? "Veröffentlicht"
                          : article.status === "draft"
                            ? "Entwurf"
                            : "Archiviert"}
                      </Badge>
                      <Badge variant="outline">{article.category === "article" ? "Artikel" : "Rezept"}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">/{article.slug}</div>
                    <div className="text-sm text-muted-foreground">
                      Von {article.author} • Erstellt: {new Date(article.created_at).toLocaleDateString("de-DE")}
                      {article.published_at && article.status === "published" && (
                        <> • Veröffentlicht: {new Date(article.published_at).toLocaleDateString("de-DE")}</>
                      )}
                    </div>
                    {article.excerpt && <p className="text-sm text-muted-foreground">{article.excerpt}</p>}
                    {article.image_url && (
                      <img
                        src={article.image_url || "/placeholder.svg"}
                        alt={article.title}
                        className="w-24 h-24 object-cover rounded mt-2"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button size="sm" variant="outline" onClick={() => startEdit(article)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Bearbeiten
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteArticle(article.id)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Löschen
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {articles.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Noch keine Artikel vorhanden. Erstellen Sie Ihren ersten Artikel!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
