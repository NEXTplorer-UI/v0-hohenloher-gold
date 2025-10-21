import { createAdminClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data: products, error } = await supabase
      .from("products")
      .select("*, categories(name)")
      .order("category_id", { ascending: true })
      .order("name", { ascending: true })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to load products" }, { status: 500 })
    }

    const transformedProducts =
      products?.map((product: any) => ({
        ...product,
        category: product.categories?.name || "Unbekannt",
      })) || []

    return NextResponse.json(transformedProducts)
  } catch (error) {
    console.error("Error in admin products API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const body = await request.json()
    const { name, category_id, price, description, image_url, weight_kg, origin, unit, min_stock, is_active } = body

    // Validate required fields
    if (!name || !category_id || !price) {
      return NextResponse.json({ error: "Name, category_id, and price are required" }, { status: 400 })
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
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
    }

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error("Error creating product:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
