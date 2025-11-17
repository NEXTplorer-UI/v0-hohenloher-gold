// HelloCash API Integration
const HELLOCASH_API_URL = "https://api.hellocash.business/api/v1"

export interface HelloCashArticle {
  article_id?: number
  article_name: string
  article_code?: string
  article_unit?: string
  article_comment?: string
  article_gross_selling_price: string
  article_tax_rate?: number
  article_net_purchase_price?: number
  article_stock?: number
  article_min_stock?: string
  article_category_id?: number
  article_ean_code?: string
  article_image?: string
  article_stock_status?: number // 0 = change stock when selling, 2 = do not change stock
}

export interface HelloCashArticleResponse {
  article_id: string // HelloCash returns article_id as string
  article_name: string
  article_gross_sellingPrice: string
  article_stock: string
  // ... other fields
}

export async function createHelloCashArticle(article: HelloCashArticle): Promise<HelloCashArticleResponse> {
  console.log("[v0] [HelloCash] createHelloCashArticle called with:", JSON.stringify(article))
  
  const token = process.env.HELLOCASH_API_TOKEN

  if (!token) {
    console.log("[v0] [HelloCash] ❌ HELLOCASH_API_TOKEN not configured")
    throw new Error("HELLOCASH_API_TOKEN not configured")
  }

  console.log("[v0] [HelloCash] Token found, making API request to:", `${HELLOCASH_API_URL}/articles`)

  try {
    const response = await fetch(`${HELLOCASH_API_URL}/articles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(article),
    })

    console.log("[v0] [HelloCash] API response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] [HelloCash] ❌ Error response:", errorText)
      throw new Error(`HelloCash API Error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log("[v0] [HelloCash] ✅ Article created successfully:", result)
    return result
  } catch (error) {
    console.error("[v0] [HelloCash] ❌ Request failed:", error)
    throw error
  }
}

export async function updateHelloCashArticle(articleId: number, article: HelloCashArticle): Promise<HelloCashArticleResponse> {
  console.log("[v0] [HelloCash] updateHelloCashArticle called with ID:", articleId, "article:", article)
  
  const token = process.env.HELLOCASH_API_TOKEN

  if (!token) {
    console.log("[v0] [HelloCash] ❌ HELLOCASH_API_TOKEN not configured")
    throw new Error("HELLOCASH_API_TOKEN not configured")
  }

  console.log("[v0] [HelloCash] Token found, making API request to:", `${HELLOCASH_API_URL}/articles`)

  try {
    // Include the article_id in the body to update instead of create
    const articleWithId = {
      ...article,
      article_id: articleId
    }
    
    const response = await fetch(`${HELLOCASH_API_URL}/articles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(articleWithId),
    })

    console.log("[v0] [HelloCash] API response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] [HelloCash] ❌ Error response:", errorText)
      throw new Error(`HelloCash API Error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log("[v0] [HelloCash] ✅ Article updated successfully:", result)
    return result
  } catch (error) {
    console.error("[v0] [HelloCash] ❌ Request failed:", error)
    throw error
  }
}

// Helper function to convert image URL to base64
async function imageUrlToBase64(imageUrl: string): Promise<string | null> {
  try {
    console.log("[v0] [HelloCash] 📸 Starting image conversion for:", imageUrl)
    
    // Skip if no image URL
    if (!imageUrl) {
      console.log("[v0] [HelloCash] ⚠️ No image URL provided, skipping")
      return null
    }

    // Convert local paths to full URLs (for Vercel/Next.js deployments)
    let fullUrl = imageUrl
    if (imageUrl.startsWith('/')) {
      // For local paths, skip image conversion in development/preview
      // In production, you should upload to Supabase Storage first
      console.log("[v0] [HelloCash] ⚠️ Local path detected, skipping image sync (upload to Supabase Storage first)")
      return null
    }

    // Only proceed with valid HTTP(S) URLs
    if (!fullUrl.startsWith('http')) {
      console.log("[v0] [HelloCash] ⚠️ Invalid image URL format, skipping")
      return null
    }

    console.log("[v0] [HelloCash] 🔄 Fetching image from URL...")
    const response = await fetch(fullUrl)
    if (!response.ok) {
      console.error("[v0] [HelloCash] ❌ Failed to fetch image, status:", response.status)
      return null
    }

    console.log("[v0] [HelloCash] 🔄 Converting to base64...")
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    
    // Check if base64 is too large (HelloCash might have size limits)
    const sizeInKB = Math.round(base64.length / 1024)
    console.log(`[v0] [HelloCash] ✅ Image converted to base64 (size: ${sizeInKB} KB)`)
    
    if (sizeInKB > 500) {
      console.warn(`[v0] [HelloCash] ⚠️ Warning: Image is large (${sizeInKB} KB), HelloCash may reject it`)
    }
    
    return base64
  } catch (error) {
    console.error("[v0] [HelloCash] ❌ Error converting image to base64:", error)
    return null
  }
}

export async function mapProductToHelloCash(product: {
  name: string
  price: number
  category_id?: number
  hellocash_category_id?: number // Added hellocash_category_id parameter
  weight_kg?: string
  unit?: string
  description?: string
  min_stock?: number
  image_url?: string
  hellocash_stock_managed?: boolean
}): Promise<HelloCashArticle> {
  console.log("[v0] [HelloCash] 🔧 mapProductToHelloCash called for:", product.name)
  console.log("[v0] [HelloCash] Product has image_url:", !!product.image_url, product.image_url)
  
  let helloCashCategoryId: number | undefined
  if (product.category_id) {
    try {
      const { createClient } = await import("@/lib/supabase/server")
      const supabase = await createClient()
      
      const { data: category } = await supabase
        .from("categories")
        .select("hellocash_category_id")
        .eq("id", product.category_id)
        .single()
      
      if (category?.hellocash_category_id) {
        helloCashCategoryId = category.hellocash_category_id
        console.log("[v0] [HelloCash] Found HelloCash category ID from categories table:", helloCashCategoryId)
      }
    } catch (error) {
      console.error("[v0] [HelloCash] Error fetching category:", error)
    }
  }
  
  let articleImage: string | undefined
  if (product.image_url) {
    console.log("[v0] [HelloCash] 🖼️ Product has image, starting conversion...")
    const base64Image = await imageUrlToBase64(product.image_url)
    if (base64Image) {
      articleImage = base64Image
      console.log("[v0] [HelloCash] ✅ Image will be included in sync")
    } else {
      console.log("[v0] [HelloCash] ⚠️ Image conversion failed or skipped, syncing without image")
    }
  } else {
    console.log("[v0] [HelloCash] ℹ️ No image URL provided for this product")
  }
  
  const mapped: HelloCashArticle = {
    article_name: product.name,
    article_code: "", 
    article_unit: product.unit || "Stück",
    article_comment: product.description || "",
    article_gross_selling_price: product.price.toFixed(2),
    article_tax_rate: 7,
    article_stock: 0,
    article_min_stock: product.min_stock?.toString() || "0",
    article_stock_status: product.hellocash_stock_managed ? 0 : 2, // 0 = manage stock, 2 = do not manage stock
    ...(helloCashCategoryId && { article_category_id: helloCashCategoryId }),
    ...(articleImage && { article_image: articleImage }),
  }
  
  console.log("[v0] [HelloCash] 📦 Mapped article:", { 
    name: mapped.article_name,
    price: mapped.article_gross_selling_price,
    category: mapped.article_category_id,
    has_image: !!mapped.article_image,
    image_size: mapped.article_image ? `${Math.round(mapped.article_image.length / 1024)} KB` : 'N/A'
  })
  
  return mapped
}

/**
 * Syncs a product to HelloCash
 * 
 * **Update vs. Create Logic:**
 * - If `existingArticleId` is provided: UPDATES the existing HelloCash article
 * - If `existingArticleId` is null/undefined: CREATES a new HelloCash article
 * 
 * The HelloCash API uses the same POST endpoint for both operations:
 * - Without `article_id` in body → Creates new article
 * - With `article_id` in body → Updates existing article
 * 
 * @param product - The product data from your database
 * @param existingArticleId - The HelloCash article ID if already synced, null to create new
 * @returns Success status and the HelloCash article ID
 */
export async function syncProductToHelloCash(
  product: any,
  existingArticleId: number | null
): Promise<{ success: boolean; hellocash_article_id?: number; error?: string }> {
  try {
    console.log(`[v0] [HelloCash] syncProductToHelloCash: Syncing product ${product.id} (${product.name})`)
    
    const helloCashArticle = await mapProductToHelloCash(product)

    let result: HelloCashArticleResponse

    if (existingArticleId) {
      console.log(`[v0] [HelloCash] syncProductToHelloCash: Updating existing article ${existingArticleId}`)
      result = await updateHelloCashArticle(existingArticleId, helloCashArticle)
    } else {
      console.log("[v0] [HelloCash] syncProductToHelloCash: Creating new article")
      result = await createHelloCashArticle(helloCashArticle)
    }

    const articleIdNumber = parseInt(result.article_id, 10)
    console.log(`[v0] [HelloCash] syncProductToHelloCash: ✅ Success (Article ID: ${articleIdNumber})`)

    return {
      success: true,
      hellocash_article_id: articleIdNumber,
    }
  } catch (error: any) {
    console.error(`[v0] [HelloCash] syncProductToHelloCash: ❌ Error:`, error)
    return {
      success: false,
      error: error.message || "Unknown error",
    }
  }
}
