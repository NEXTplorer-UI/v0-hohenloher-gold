import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/api-auth"
import { createHelloCashArticle, updateHelloCashArticle, mapProductToHelloCash } from "@/lib/hellocash"

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAdmin()
    
    console.log("[v0] [HelloCash Sync] Starting sync for user:", user.id)

    const body = await request.json()
    const { product_id, hellocash_article_id } = body

    console.log("[v0] [HelloCash Sync] Syncing product:", product_id, "Article ID:", hellocash_article_id)

    // Fetch product from database
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", product_id)
      .single()

    if (productError || !product) {
      console.error("[v0] [HelloCash Sync] Product not found:", productError)
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    console.log("[v0] [HelloCash Sync] Product found:", product.name)

    // Map product to HelloCash format - MUST await the async function
    const helloCashArticle = await mapProductToHelloCash(product)
    
    console.log("[v0] [HelloCash Sync] Mapped article:", JSON.stringify(helloCashArticle))

    let result
    if (hellocash_article_id) {
      // Update existing HelloCash article
      console.log("[v0] [HelloCash Sync] Updating existing article:", hellocash_article_id)
      result = await updateHelloCashArticle(hellocash_article_id, helloCashArticle)
    } else {
      // Create new HelloCash article
      console.log("[v0] [HelloCash Sync] Creating new article")
      result = await createHelloCashArticle(helloCashArticle)
    }

    console.log("[v0] [HelloCash Sync] HelloCash API result:", result)

    // Save HelloCash article ID back to product
    if (result.article_id) {
      const articleId = typeof result.article_id === 'string' 
        ? parseInt(result.article_id, 10) 
        : result.article_id

      console.log("[v0] [HelloCash Sync] Saving article ID to database:", articleId)
      
      const { error: updateError } = await supabase
        .from("products")
        .update({ hellocash_article_id: articleId })
        .eq("id", product_id)

      if (updateError) {
        console.error("[v0] [HelloCash Sync] Error saving article ID:", updateError)
      }
    }

    return NextResponse.json({
      success: true,
      hellocash_article_id: result.article_id,
      message: hellocash_article_id
        ? "Produkt wurde mit HelloCash synchronisiert"
        : "Produkt wurde in HelloCash erstellt",
    })
  } catch (error: any) {
    console.error("[v0] [HelloCash Sync] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to sync with HelloCash" },
      { status: 500 }
    )
  }
}
