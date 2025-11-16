import { createAdminClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/api-auth"
import { withErrorHandling } from "@/lib/errors/error-handler"
import { DatabaseError, ValidationError } from "@/lib/errors/api-errors"
import { createHelloCashArticle, mapProductToHelloCash } from "@/lib/hellocash"

export const GET = withErrorHandling(async (request: NextRequest) => {
  await requireAdmin(request)

  const supabase = createAdminClient()

  const { data: products, error } = await supabase
    .from("products")
    .select("*, categories(name)")
    .order("category_id", { ascending: true })
    .order("name", { ascending: true })

  if (error) {
    console.error("Database error:", error)
    throw new DatabaseError("Fehler beim Laden der Produkte", error)
  }

  const transformedProducts =
    products?.map((product: any) => ({
      ...product,
      category: product.categories?.name || "Unbekannt",
    })) || []

  return NextResponse.json(transformedProducts)
})

export const POST = withErrorHandling(async (request: NextRequest) => {
  await requireAdmin(request)

  const supabase = createAdminClient()
  const body = await request.json()
  const {
    name,
    category_id,
    price,
    description,
    image_url,
    weight_kg,
    origin,
    unit,
    min_stock,
    is_active,
    attributes,
    inventory_raw_id,
    is_raw_stock_managed,
  } = body

  if (!name || !category_id || !price) {
    throw new ValidationError("Name, Kategorie und Preis sind erforderlich", {
      missing: [!name && "name", !category_id && "category_id", !price && "price"].filter(Boolean),
    })
  }

  const { data: product, error } = await supabase
    .from("products")
    .insert([
      {
        name,
        category_id,
        price: Number.parseFloat(price),
        description: description || "",
        image_url: image_url || "",
        weight_kg: weight_kg || null,
        origin: origin || "",
        unit: unit || "Stück",
        min_stock: Number.parseInt(min_stock) || 0,
        is_active: is_active !== undefined ? is_active : true,
        attributes: attributes || null,
        inventory_raw_id: inventory_raw_id || null,
        is_raw_stock_managed: is_raw_stock_managed !== undefined ? is_raw_stock_managed : true,
      },
    ])
    .select()
    .single()

  if (error) {
    console.error("Database error:", error)
    throw new DatabaseError("Fehler beim Erstellen des Produkts", error)
  }

  if (process.env.HELLOCASH_API_TOKEN) {
    try {
      console.log("[v0] [HelloCash] Starting sync for product:", product.name)
      const helloCashArticle = mapProductToHelloCash(product)
      const helloCashResult = await createHelloCashArticle(helloCashArticle)

      const articleId = parseInt(helloCashResult.article_id)
      
      if (articleId) {
        const { error: updateError } = await supabase
          .from("products")
          .update({ hellocash_article_id: articleId })
          .eq("id", product.id)

        if (updateError) {
          console.error("[HelloCash] ⚠️ Failed to save HelloCash article_id to database:", updateError)
        } else {
          product.hellocash_article_id = articleId
          console.log(
            `[HelloCash] ✅ Product "${product.name}" synced to HelloCash (ID: ${articleId})`
          )
        }
      } else {
        console.error("[HelloCash] ⚠️ No article_id in response:", helloCashResult)
      }
    } catch (helloCashError) {
      console.error("[HelloCash] ⚠️ Failed to sync product to HelloCash:", helloCashError)
      // Don't fail the product creation if HelloCash sync fails
    }
  } else {
    console.log("[v0] [HelloCash] Token not configured, skipping sync")
  }

  return NextResponse.json(product, { status: 201 })
})
