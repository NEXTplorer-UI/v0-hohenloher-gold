import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function diagnoseBlutorangen() {
  // 1. Find product
  const { data: products, error: prodError } = await supabase.from("products").select("*").ilike("name", "%blutorange%")

  console.log("=== BLUTORANGEN PRODUKT ===")
  console.log(JSON.stringify(products, null, 2))

  if (products && products.length > 0) {
    const product = products[0]

    // 2. Check inventory_raw_stock if linked
    if (product.inventory_raw_id) {
      const { data: rawStock } = await supabase
        .from("inventory_raw_stock")
        .select("*")
        .eq("id", product.inventory_raw_id)
        .single()

      console.log("\n=== LAGERBESTAND (inventory_raw_stock) ===")
      console.log(JSON.stringify(rawStock, null, 2))
    }

    // 3. Check product_availability view
    const { data: availability } = await supabase
      .from("product_availability")
      .select("*")
      .eq("product_id", product.id)
      .single()

    console.log("\n=== VERFÜGBARKEIT (product_availability) ===")
    console.log(JSON.stringify(availability, null, 2))
  }
}

diagnoseBlutorangen()
