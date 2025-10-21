import { createAdminClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/api-auth"
import { withErrorHandling } from "@/lib/errors/error-handler"
import { DatabaseError, ValidationError } from "@/lib/errors/api-errors"

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
  const { name, category_id, price, description, image_url, weight_kg, origin, unit, min_stock, is_active } = body

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
      },
    ])
    .select()
    .single()

  if (error) {
    console.error("Database error:", error)
    throw new DatabaseError("Fehler beim Erstellen des Produkts", error)
  }

  return NextResponse.json(product, { status: 201 })
})
