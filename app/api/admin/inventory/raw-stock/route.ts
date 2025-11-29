import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/api-auth"

export async function GET() {
  try {
    const supabase = await createServerClient()

    const { data: rawStocks, error } = await supabase
      .from("inventory_raw_stock")
      .select(`
        id,
        product_group,
        unit_type,
        stock_grams,
        min_stock_grams,
        created_at,
        updated_at,
        products:products(id, name)
      `)
      .order("product_group")

    if (error) {
      console.error("[API] Error fetching raw stocks:", error)
      throw error
    }

    const transformedData =
      rawStocks?.map((stock) => ({
        ...stock,
        product_names: stock.products?.map((p) => p.name) || [],
        product_count: stock.products?.length || 0,
      })) || []

    return NextResponse.json({ success: true, rawStocks: transformedData })
  } catch (error: any) {
    console.error("[API] Error in raw-stock GET:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { supabase } = await requireAdmin()

  try {
    const body = await request.json()
    const { product_group, unit_type, stock_grams, min_stock_grams } = body

    if (!product_group || !unit_type) {
      return NextResponse.json({ error: "product_group and unit_type are required" }, { status: 400 })
    }

    const { data: existing, error: checkError } = await supabase
      .from("inventory_raw_stock")
      .select("id, product_group")
      .eq("product_group", product_group)
      .maybeSingle() // Returns null if no rows found, doesn't throw 406

    if (checkError) {
      console.error("[v0] Error checking for duplicate:", checkError)
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    if (existing) {
      return NextResponse.json({ error: `Rohware-Gruppe "${product_group}" existiert bereits` }, { status: 400 })
    }

    // Create new raw stock group
    const { data: newGroup, error: insertError } = await supabase
      .from("inventory_raw_stock")
      .insert({
        product_group,
        unit_type,
        stock_grams: stock_grams || 0,
        min_stock_grams: min_stock_grams || (unit_type === "weight" ? 2000 : 5000),
      })
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Error creating raw stock group:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, ...newGroup })
  } catch (error: any) {
    console.error("[v0] Error in raw stock POST:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
