import { createAdminClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { createHelloCashArticle, mapProductToHelloCash } from "@/lib/hellocash"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

console.log("[v0] Products API module loaded")

export async function GET(request: NextRequest) {
  console.log("[v0] Products API: GET handler started")
  console.log("[v0] Products API: Starting GET request")

  try {
    const supabase = createAdminClient()
    console.log("[v0] Products API: Admin client created")

    console.log("[v0] Products API: Attempting to fetch products with categories")
    const { data: products, error } = await supabase
      .from("products")
      .select(`
        id,
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
        hellocash_article_id,
        created_at,
        updated_at,
        categories (
          id,
          name
        )
      `)
      .order("category_id", { ascending: true })
      .order("name", { ascending: true })

    console.log("[v0] Products API: Fetch completed", {
      productCount: products?.length || 0,
      hasError: !!error,
      errorCode: error?.code,
      errorMessage: error?.message,
    })

    if (error) {
      console.error("[v0] Products API: Database error:", error)
      return NextResponse.json({ error: "Fehler beim Laden der Produkte" }, { status: 500 })
    }

    const transformedProducts =
      products?.map((product: any) => ({
        ...product,
        category: product.categories?.name || "Unbekannt",
      })) || []

    console.log("[v0] Products API: Returning", transformedProducts.length, "products")
    return NextResponse.json(transformedProducts)
  } catch (err) {
    console.error("[v0] Products API: Unexpected error:", err)
    return NextResponse.json({ error: "Unerwarteter Fehler beim Laden der Produkte" }, { status: 500 })
  }
}

export const POST = async (request: NextRequest) => {
  try {
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
      return NextResponse.json({ error: "Name, Kategorie und Preis sind erforderlich" }, { status: 400 })
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
      return NextResponse.json({ error: "Fehler beim Erstellen des Produkts" }, { status: 500 })
    }

    if (process.env.HELLOCASH_API_TOKEN) {
      try {
        console.log("[v0] [HelloCash] Starting sync for product:", product.name)
        const helloCashArticle = mapProductToHelloCash(product)
        const helloCashResult = await createHelloCashArticle(helloCashArticle)

        const articleId = Number.parseInt(helloCashResult.article_id)

        if (articleId) {
          const { error: updateError } = await supabase
            .from("products")
            .update({ hellocash_article_id: articleId })
            .eq("id", product.id)

          if (updateError) {
            console.error("[HelloCash] ⚠️ Failed to save HelloCash article_id to database:", updateError)
          } else {
            product.hellocash_article_id = articleId
            console.log(`[HelloCash] ✅ Product "${product.name}" synced to HelloCash (ID: ${articleId})`)
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
  } catch (err) {
    console.error("[v0] Products API POST: Unexpected error:", err)
    return NextResponse.json({ error: "Unerwarteter Fehler beim Erstellen des Produkts" }, { status: 500 })
  }
}
