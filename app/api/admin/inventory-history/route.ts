import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/auth/api-auth"

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    console.log("[v0] Loading inventory history from database...")

    const supabase = createAdminClient()

    const { data: movements, error } = await supabase
      .from("inventory_movements_with_details")
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

    const csvRows =
      movements?.map((movement) => {
        const date = new Date(movement.created_at)
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
      }) || []

    const totalMovements = movements?.length || 0
    const incomingCount = movements?.filter((m) => m.qty > 0).length || 0
    const outgoingCount = movements?.filter((m) => m.qty < 0).length || 0
    const totalIncoming = movements?.filter((m) => m.qty > 0).reduce((sum, m) => sum + m.qty, 0) || 0
    const totalOutgoing = Math.abs(movements?.filter((m) => m.qty < 0).reduce((sum, m) => sum + m.qty, 0) || 0)

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
      },
    })
  } catch (error) {
    console.error("[v0] Error generating inventory history:", error)
    return NextResponse.json({ error: "Failed to generate inventory history" }, { status: 500 })
  }
}
