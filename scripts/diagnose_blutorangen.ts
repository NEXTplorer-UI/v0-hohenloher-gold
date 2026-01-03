import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnoseBlutorangen() {
  console.log("=== BLUTORANGEN DIAGNOSE ===\n")

  // 1. Find Blutorangen in products table
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, is_active, stock_quantity, inventory_raw_id, unit, price, category_id")
    .ilike("name", "%blutorange%")

  if (productsError) {
    console.error("Error fetching products:", productsError)
    return
  }

  console.log('1. PRODUKTE MIT "BLUTORANGE" IM NAMEN:')
  console.log(JSON.stringify(products, null, 2))
  console.log("\n")

  if (!products || products.length === 0) {
    console.log("❌ Keine Blutorangen gefunden!")
    return
  }

  const blutorange = products[0]
  console.log(`2. BLUTORANGEN DETAILS:`)
  console.log(`   - ID: ${blutorange.id}`)
  console.log(`   - Name: ${blutorange.name}`)
  console.log(`   - Aktiv: ${blutorange.is_active}`)
  console.log(`   - Stock Quantity: ${blutorange.stock_quantity}`)
  console.log(`   - Inventory Raw ID: ${blutorange.inventory_raw_id}`)
  console.log(`   - Unit: ${blutorange.unit}`)
  console.log("\n")

  // 2. Check inventory_raw_stock if it has inventory_raw_id
  if (blutorange.inventory_raw_id) {
    const { data: rawStock, error: rawStockError } = await supabase
      .from("inventory_raw_stock")
      .select("*")
      .eq("id", blutorange.inventory_raw_id)
      .single()

    if (rawStockError) {
      console.error("Error fetching raw stock:", rawStockError)
    } else {
      console.log("3. GRAMM-BASIERTES LAGER:")
      console.log(`   - Raw Stock ID: ${rawStock.id}`)
      console.log(`   - Product Group: ${rawStock.product_group}`)
      console.log(`   - Stock Grams: ${rawStock.stock_grams}`)
      console.log(`   - Min Stock Grams: ${rawStock.min_stock_grams}`)
      console.log(`   - Unit Type: ${rawStock.unit_type}`)
      console.log("\n")
    }
  } else {
    console.log("3. LAGER-TYP: Stückbasiert (kein inventory_raw_id)\n")
  }

  // 3. Check product_availability view
  const { data: availability, error: availabilityError } = await supabase
    .from("product_availability")
    .select("*")
    .eq("product_id", blutorange.id)
    .single()

  if (availabilityError) {
    console.error("Error fetching availability:", availabilityError)
  } else {
    console.log("4. PRODUCT_AVAILABILITY VIEW:")
    console.log(JSON.stringify(availability, null, 2))
    console.log("\n")
  }

  // 4. Check category
  if (blutorange.category_id) {
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id, name, slug, is_active")
      .eq("id", blutorange.category_id)
      .single()

    if (!categoryError && category) {
      console.log("5. KATEGORIE:")
      console.log(`   - Name: ${category.name}`)
      console.log(`   - Slug: ${category.slug}`)
      console.log(`   - Aktiv: ${category.is_active}`)
      console.log("\n")
    }
  }

  console.log("=== DIAGNOSE ABGESCHLOSSEN ===")
}

diagnoseBlutorangen()
