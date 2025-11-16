import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createServerClient()

    const { data: rawStocks, error } = await supabase.rpc("get_raw_stock_overview")

    if (error) {
      console.error("[API] Error fetching raw stocks:", error)
      throw error
    }

    return NextResponse.json({ success: true, rawStocks })
  } catch (error: any) {
    console.error("[API] Error in raw-stock GET:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
