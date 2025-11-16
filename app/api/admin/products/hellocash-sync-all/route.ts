import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/api-auth"
import { syncProductToHelloCash } from "@/lib/hellocash"

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function POST() {
  try {
    console.log("[v0] [HelloCash Bulk Sync] Starting bulk sync")
    
    const { supabase, user } = await requireAdmin()
    console.log("[v0] [HelloCash Bulk Sync] Admin verified, fetching products...")

    // Fetch all active products
    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, category_id, price, description, unit, weight_kg, min_stock, hellocash_article_id, hellocash_stock_managed")
      .eq("is_active", true)
      .order("id")

    if (error) {
      console.error("[v0] [HelloCash Bulk Sync] Error fetching products:", error)
      return NextResponse.json({ error: "Fehler beim Laden der Produkte" }, { status: 500 })
    }

    if (!products || products.length === 0) {
      return NextResponse.json({ message: "Keine aktiven Produkte gefunden", synced: 0 }, { status: 200 })
    }

    console.log(`[v0] [HelloCash Bulk Sync] Found ${products.length} products to sync`)

    const results = {
      synced: 0,
      failed: 0,
      errors: [] as { product_id: number; name: string; error: string }[],
    }

    for (const product of products) {
      try {
        console.log(`[v0] [HelloCash Bulk Sync] Syncing product ${product.id}: ${product.name}`)
        
        const result = await syncProductToHelloCash(product, product.hellocash_article_id || null)

        if (result.success && result.hellocash_article_id) {
          // Save article ID to database
          await supabase
            .from("products")
            .update({ hellocash_article_id: result.hellocash_article_id })
            .eq("id", product.id)

          results.synced++
          console.log(`[v0] [HelloCash Bulk Sync] ✅ Synced ${product.name} (Article ID: ${result.hellocash_article_id})`)
        } else {
          results.failed++
          results.errors.push({
            product_id: product.id,
            name: product.name,
            error: result.error || "Unknown error",
          })
          console.error(`[v0] [HelloCash Bulk Sync] ❌ Failed to sync ${product.name}:`, result.error)
        }
        
        await delay(200)
      } catch (error: any) {
        results.failed++
        results.errors.push({
          product_id: product.id,
          name: product.name,
          error: error.message || "Unknown error",
        })
        console.error(`[v0] [HelloCash Bulk Sync] ❌ Exception syncing ${product.name}:`, error)
      }
    }

    console.log(`[v0] [HelloCash Bulk Sync] Completed: ${results.synced} synced, ${results.failed} failed`)

    return NextResponse.json({
      message: `${results.synced} Produkte synchronisiert, ${results.failed} fehlgeschlagen`,
      synced: results.synced,
      failed: results.failed,
      errors: results.errors,
    })
  } catch (error: any) {
    console.error("[v0] [HelloCash Bulk Sync] Error:", error)
    return NextResponse.json({ error: error.message || "Interner Server-Fehler" }, { status: 500 })
  }
}
