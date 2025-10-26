import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Inventory history export API called")
    console.log("[v0] Request URL:", request.url)
    console.log("[v0] Request method:", request.method)

    console.log("[v0] Loading inventory history from database...")

    const supabase = createAdminClient()
    console.log("[v0] Admin client created successfully")

    const { data: movements, error } = await supabase
      .from("inventory_movements_with_details")
      .select("*")
      .order("occurred_at", { ascending: false })

    console.log("[v0] Query executed, checking results...")

    if (error) {
      console.error("[v0] Error fetching inventory movements:", error)
      console.error("[v0] Error code:", error.code)
      console.error("[v0] Error message:", error.message)
      console.error("[v0] Error details:", error.details)
      return NextResponse.json(
        { error: "Failed to fetch inventory movements", details: error.message },
        { status: 500 },
      )
    }

    console.log(`[v0] Found ${movements?.length || 0} inventory movements`)

    if (!movements || movements.length === 0) {
      console.log("[v0] No movements found, returning empty CSV")
      const BOM = "\uFEFF"
      const timestamp = new Date().toISOString().split("T")[0]
      const headers = [
        "Datum",
        "Uhrzeit",
        "Artikel-ID",
        "Artikelname",
        "SKU",
        "Kategorie",
        "Bewegungstyp",
        "Menge",
        "Einheit",
        "Grund",
        "Referenz",
        "Quelle",
        "Erstellt von",
      ]
      const csv = BOM + headers.join(";") + "\n"

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="lagerhistorie-${timestamp}.csv"`,
        },
      })
    }

    console.log("[v0] Generating CSV...")
    const BOM = "\uFEFF"
    const timestamp = new Date().toISOString().split("T")[0]

    const headers = [
      "Datum",
      "Uhrzeit",
      "Artikel-ID",
      "Artikelname",
      "SKU",
      "Kategorie",
      "Bewegungstyp",
      "Menge",
      "Einheit",
      "Grund",
      "Referenz",
      "Quelle",
      "Erstellt von",
    ]

    const csvRows = movements.map((movement) => {
      const date = new Date(movement.occurred_at || movement.created_at)
      const dateStr = date.toLocaleDateString("de-DE")
      const timeStr = date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })

      const movementType = movement.qty > 0 ? "Eingang" : "Ausgang"
      const quantity = Math.abs(movement.qty)

      return [
        dateStr,
        timeStr,
        movement.product_id?.toString() || "",
        `"${(movement.product_name || "").replace(/"/g, '""')}"`,
        `"${(movement.product_sku || "").replace(/"/g, '""')}"`,
        `"${(movement.category_name || "").replace(/"/g, '""')}"`,
        movementType,
        quantity.toString(),
        `"${(movement.product_unit || "").replace(/"/g, '""')}"`,
        `"${(movement.reason || "").replace(/"/g, '""')}"`,
        movement.reference_id || "",
        movement.source || "system",
        movement.created_by_name || "System",
      ].join(";")
    })

    const totalMovements = movements.length
    const incomingCount = movements.filter((m) => m.qty > 0).length
    const outgoingCount = movements.filter((m) => m.qty < 0).length
    const totalIncoming = movements.filter((m) => m.qty > 0).reduce((sum, m) => sum + m.qty, 0)
    const totalOutgoing = Math.abs(movements.filter((m) => m.qty < 0).reduce((sum, m) => sum + m.qty, 0))

    const summaryRows = [
      "",
      "ZUSAMMENFASSUNG;;;;;;;;;;;;",
      "",
      `Gesamtbewegungen;${totalMovements};;;;;;;;;;;`,
      `Eingänge;${incomingCount};Menge: ${totalIncoming};;;;;;;;;;`,
      `Ausgänge;${outgoingCount};Menge: ${totalOutgoing};;;;;;;;;;`,
    ]

    const csv = BOM + headers.join(";") + "\n" + csvRows.join("\n") + "\n" + summaryRows.join("\n")

    console.log("[v0] Generated CSV with", csvRows.length, "rows and summary")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="lagerhistorie-${timestamp}.csv"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error: any) {
    console.error("[v0] CRITICAL ERROR in inventory history export:", error)
    console.error("[v0] Error name:", error?.name)
    console.error("[v0] Error message:", error?.message)
    console.error("[v0] Error stack:", error?.stack)
    console.error("[v0] Error type:", typeof error)
    console.error("[v0] Full error object:", JSON.stringify(error, null, 2))

    return NextResponse.json(
      {
        error: "Failed to generate inventory history",
        details: error?.message || "Unknown error",
        errorType: error?.name || typeof error,
        stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
      },
      { status: 500 },
    )
  }
}
