import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin, createAdminClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()

    const supabase = createAdminClient()

    const { data: product, error } = await supabase.from("products").select("*").eq("id", params.id).single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    if (error instanceof Error && (error.message.includes("Unauthorized") || error.message.includes("Forbidden"))) {
      return NextResponse.json({ error: error.message }, { status: error.message.includes("Forbidden") ? 403 : 401 })
    }
    console.error("Error fetching product:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()

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
    } = body

    // Validate required fields
    if (!name || !category_id || !price) {
      return NextResponse.json({ error: "Name, category_id, and price are required" }, { status: 400 })
    }

    const { data: product, error } = await supabase
      .from("products")
      .update({
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
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
    }

    return NextResponse.json(product)
  } catch (error) {
    if (error instanceof Error && (error.message.includes("Unauthorized") || error.message.includes("Forbidden"))) {
      return NextResponse.json({ error: error.message }, { status: error.message.includes("Forbidden") ? 403 : 401 })
    }
    console.error("Error updating product:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()

    const supabase = createAdminClient()

    const { error } = await supabase.from("products").delete().eq("id", params.id)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to delete product" }, { status: 500 })
    }

    return NextResponse.json({ message: "Product deleted successfully" })
  } catch (error) {
    if (error instanceof Error && (error.message.includes("Unauthorized") || error.message.includes("Forbidden"))) {
      return NextResponse.json({ error: error.message }, { status: error.message.includes("Forbidden") ? 403 : 401 })
    }
    console.error("Error deleting product:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
