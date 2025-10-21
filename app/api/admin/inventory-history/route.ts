import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    console.log("[v0] Loading inventory history from database...")

    const supabase = createAdminClient()

    const { data: movements, error } = await supabase
      .from("inventory_movements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000)

    if (error) {
      console.error("[v0] Error fetching inventory movements:", error)
      throw error
    }

    console.log(`[v0] Found ${movements?.length || 0} inventory movements`)

    const BOM = "\uFEFF"
    const timestamp = new Date().toISOString().split("T")[0]

    const headers = [
      "Datum",
      "Uhrzeit",
      "Artikel-ID",
      "Artikelname",
      "Kategorie",
      "Bewegungstyp",
      "Menge",
      "Einheit",
      "Grund",
      "Referenz",
      "Bestand vorher",
      "Bestand nachher",
      "Erstellt von",
    ]

    const generateProductId = (productName: string): string => {
      if (!productName) return ""
      let hash = 0
      for (let i = 0; i < productName.length; i++) {
        const char = productName.charCodeAt(i)
        hash = (hash << 5) - hash + char
        hash = hash & hash
      }
      return Math.abs(hash).toString().padStart(6, "0")
    }

    const csvRows =
      movements?.map((movement) => {
        const date = new Date(movement.created_at)
        const dateStr = date.toLocaleDateString("de-DE")
        const timeStr = date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })

        return [
          dateStr,
          timeStr,
          generateProductId(movement.product_name || ""),
          `"${(movement.product_name || "").replace(/"/g, '""')}"`,
          `"${(movement.product_category || "").replace(/"/g, '""')}"`,
          movement.movement_type || "",
          movement.quantity?.toString() || "0",
          `"${(movement.unit || "").replace(/"/g, '""')}"`,
          `"${(movement.reason || "").replace(/"/g, '""')}"`,
          movement.reference_id || "",
          movement.stock_before?.toString() || "",
          movement.stock_after?.toString() || "",
          movement.created_by || "System",
        ].join(";")
      }) || []

    const totalMovements = movements?.length || 0
    const incomingCount = movements?.filter((m) => m.movement_type === "Eingang").length || 0
    const outgoingCount = movements?.filter((m) => m.movement_type === "Ausgang").length || 0
    const correctionCount = movements?.filter((m) => m.movement_type === "Korrektur").length || 0

    const summaryRows = [
      "",
      "ZUSAMMENFASSUNG;;;;;;;;;;;;",
      "",
      `Gesamtbewegungen;${totalMovements};;;;;;;;;;;`,
      `Eingänge;${incomingCount};;;;;;;;;;;`,
      `Ausgänge;${outgoingCount};;;;;;;;;;;`,
      `Korrekturen;${correctionCount};;;;;;;;;;;`,
    ]

    const csv = BOM + headers.join(";") + "\n" + csvRows.join("\n") + "\n" + summaryRows.join("\n")

    console.log("[v0] Generated normalized CSV with", csvRows.length, "rows and summary")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="lagerhistorie-${timestamp}.csv"`,
      },
    })
  } catch (error) {
    console.error("[v0] Error generating inventory history:", error)
    return NextResponse.json({ error: "Failed to generate inventory history" }, { status: 500 })
  }
}
