import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Inventory history export API called")
    console.log("[v0] Request URL:", request.url)

    const searchParams = request.nextUrl.searchParams
    const groupBy = searchParams.get("groupBy") || "none"
    const sortBy = searchParams.get("sortBy") || "date"
    const sortOrder = searchParams.get("sortOrder") || "desc"
    const showSummary = searchParams.get("showSummary") === "true"
    const emptyLinesBetweenGroups = searchParams.get("emptyLinesBetweenGroups") === "true"

    console.log("[v0] Export options:", { groupBy, sortBy, sortOrder, showSummary, emptyLinesBetweenGroups })
    console.log("[v0] Loading inventory history from database...")

    const supabase = createAdminClient()

    let query = supabase.from("inventory_movements_with_details").select("*")

    // Apply sorting based on sortBy parameter
    switch (sortBy) {
      case "product":
        query = query.order("product_name", { ascending: sortOrder === "asc" })
        break
      case "category":
        query = query.order("category_name", { ascending: sortOrder === "asc" })
        break
      case "reason":
        query = query.order("reason", { ascending: sortOrder === "asc" })
        break
      case "quantity":
        query = query.order("qty", { ascending: sortOrder === "asc" })
        break
      case "date":
      default:
        query = query.order("occurred_at", { ascending: sortOrder === "asc" })
        break
    }

    const { data: movements, error } = await query

    if (error) {
      console.error("[v0] Error fetching inventory movements:", error)
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
        "Preis",
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

    console.log("[v0] Generating CSV with grouping:", groupBy)
    const BOM = "\uFEFF"
    const timestamp = new Date().toISOString().split("T")[0]

    let headers: string[]
    if (groupBy === "analysis") {
      headers = ["Produkt", "SKU", "Preis (EUR)", "Bewegungstyp", "Grund", "Anzahl Bewegungen", "Gesamtmenge"]
    } else {
      headers = [
        "Datum",
        "Uhrzeit",
        "Artikel-ID",
        "Artikelname",
        "SKU",
        "Preis",
        "Kategorie",
        "Bewegungstyp",
        "Menge",
        "Einheit",
        "Grund",
        "Referenz",
        "Quelle",
        "Erstellt von",
      ]
    }

    let csvRows: string[] = []

    if (groupBy === "analysis") {
      // Group by product SKU + movement type + reason
      const analysisMap = new Map<
        string,
        {
          productName: string
          sku: string
          price: number
          movementType: string
          reason: string
          count: number
          totalQty: number
        }
      >()

      movements.forEach((movement) => {
        const productName = movement.product_name || movement.raw_product_group || "Unbekannt"
        const sku = movement.product_sku || "RAW"
        const movementType = (movement.qty_grams ? movement.qty_grams : movement.qty) > 0 ? "Eingang" : "Ausgang"
        const key = `${sku}|${movementType}|${movement.reason || "Kein Grund"}`

        if (!analysisMap.has(key)) {
          analysisMap.set(key, {
            productName: productName,
            sku: sku,
            price: movement.product_price || 0,
            movementType,
            reason: movement.reason || "Kein Grund",
            count: 0,
            totalQty: 0,
          })
        }

        const entry = analysisMap.get(key)!
        entry.count++
        entry.totalQty += Math.abs(movement.qty_grams || movement.qty)
      })

      // Convert to CSV rows
      csvRows = Array.from(analysisMap.values()).map((entry) => {
        return [
          `"${entry.productName.replace(/"/g, '""')}"`,
          `"${entry.sku.replace(/"/g, '""')}"`,
          entry.price.toFixed(2),
          entry.movementType,
          `"${entry.reason.replace(/"/g, '""')}"`,
          entry.count.toString(),
          entry.totalQty.toString(),
        ].join(";")
      })

      console.log(`[v0] Generated ${csvRows.length} analysis rows`)

      // Generate summary for analysis view
      if (showSummary) {
        const totalIncoming = Array.from(analysisMap.values())
          .filter((e) => e.movementType === "Eingang")
          .reduce((sum, e) => sum + e.totalQty, 0)
        const totalOutgoing = Array.from(analysisMap.values())
          .filter((e) => e.movementType === "Ausgang")
          .reduce((sum, e) => sum + e.totalQty, 0)

        csvRows.push("")
        csvRows.push("ZUSAMMENFASSUNG;;;;;;")
        csvRows.push("")
        csvRows.push(`Gesamt Eingänge;;${totalIncoming};;;;`)
        csvRows.push(`Gesamt Ausgänge;;${totalOutgoing};;;;`)
      }

      const csv = BOM + headers.join(";") + "\n" + csvRows.join("\n")

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="lagerhistorie-analyse-${timestamp}.csv"`,
          "Cache-Control": "no-store",
        },
      })
    }

    if (groupBy !== "none") {
      const grouped = new Map<string, typeof movements>()

      movements.forEach((movement) => {
        let groupKey = ""
        switch (groupBy) {
          case "product":
            const productDisplay = movement.product_name || movement.raw_product_group || "Unbekannt"
            const skuDisplay = movement.product_sku || "RAW"
            groupKey = `${productDisplay} (${skuDisplay})`
            break
          case "category":
            groupKey = movement.category_name || "Keine Kategorie"
            break
          case "reason":
            groupKey = movement.reason || "Kein Grund"
            break
        }

        if (!grouped.has(groupKey)) {
          grouped.set(groupKey, [])
        }
        grouped.get(groupKey)!.push(movement)
      })

      // Generate CSV with groups
      Array.from(grouped.entries()).forEach(([groupKey, groupMovements], index) => {
        if (index > 0 && emptyLinesBetweenGroups) {
          csvRows.push("")
        }

        // Group header
        csvRows.push(`"=== ${groupKey.toUpperCase()} (${groupMovements.length} Bewegungen) ==="`)

        // Group movements
        groupMovements.forEach((movement) => {
          const date = new Date(movement.occurred_at || movement.created_at)
          const dateStr = date.toLocaleDateString("de-DE")
          const timeStr = date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
          const hasQtyGrams = movement.qty_grams !== null && movement.qty_grams !== undefined
          const movementType = (hasQtyGrams ? movement.qty_grams : movement.qty) > 0 ? "Eingang" : "Ausgang"
          const quantity = Math.abs(hasQtyGrams ? movement.qty_grams : movement.qty)
          const price = movement.product_price ? movement.product_price.toFixed(2) : "0.00"
          const productName = movement.product_name || movement.raw_product_group || ""
          const unit = hasQtyGrams ? (movement.raw_unit_type === "volume" ? "ml" : "g") : movement.product_unit || ""

          csvRows.push(
            [
              dateStr,
              timeStr,
              movement.product_id?.toString() || "",
              `"${productName.replace(/"/g, '""')}"`,
              `"${(movement.product_sku || "RAW").replace(/"/g, '""')}"`,
              price,
              `"${(movement.category_name || "").replace(/"/g, '""')}"`,
              movementType,
              quantity.toString(),
              `"${unit.replace(/"/g, '""')}"`,
              `"${(movement.reason || "").replace(/"/g, '""')}"`,
              movement.reference_id || "",
              movement.source || "system",
              movement.created_by_name || "System",
            ].join(";"),
          )
        })

        // Group summary
        const groupIncoming = groupMovements
          .filter((m) => (m.qty_grams !== null && m.qty_grams !== undefined ? m.qty_grams : m.qty) > 0)
          .reduce((sum, m) => sum + (m.qty_grams || m.qty), 0)
        const groupOutgoing = Math.abs(
          groupMovements
            .filter((m) => (m.qty_grams !== null && m.qty_grams !== undefined ? m.qty_grams : m.qty) < 0)
            .reduce((sum, m) => sum + (m.qty_grams || m.qty), 0),
        )
        csvRows.push(`"Zwischensumme ${groupKey}:";Eingänge: ${groupIncoming};Ausgänge: ${groupOutgoing}`)
      })
    } else {
      // No grouping - original format
      csvRows = movements.map((movement) => {
        const date = new Date(movement.occurred_at || movement.created_at)
        const dateStr = date.toLocaleDateString("de-DE")
        const timeStr = date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
        const hasQtyGrams = movement.qty_grams !== null && movement.qty_grams !== undefined
        const movementType = (hasQtyGrams ? movement.qty_grams : movement.qty) > 0 ? "Eingang" : "Ausgang"
        const quantity = Math.abs(hasQtyGrams ? movement.qty_grams : movement.qty)
        const price = movement.product_price ? movement.product_price.toFixed(2) : "0.00"
        const productName = movement.product_name || movement.raw_product_group || ""
        const unit = hasQtyGrams ? (movement.raw_unit_type === "volume" ? "ml" : "g") : movement.product_unit || ""

        return [
          dateStr,
          timeStr,
          movement.product_id?.toString() || "",
          `"${productName.replace(/"/g, '""')}"`,
          `"${(movement.product_sku || "RAW").replace(/"/g, '""')}"`,
          price,
          `"${(movement.category_name || "").replace(/"/g, '""')}"`,
          movementType,
          quantity.toString(),
          `"${unit.replace(/"/g, '""')}"`,
          `"${(movement.reason || "").replace(/"/g, '""')}"`,
          movement.reference_id || "",
          movement.source || "system",
          movement.created_by_name || "System",
        ].join(";")
      })
    }

    let summaryRows: string[] = []
    if (showSummary && groupBy !== "analysis") {
      const totalMovements = movements.length
      const incomingCount = movements.filter((m) => {
        const val = m.qty_grams !== null && m.qty_grams !== undefined ? m.qty_grams : m.qty
        return val > 0
      }).length
      const outgoingCount = movements.filter((m) => {
        const val = m.qty_grams !== null && m.qty_grams !== undefined ? m.qty_grams : m.qty
        return val < 0
      }).length
      const totalIncoming = movements
        .filter((m) => {
          const val = m.qty_grams !== null && m.qty_grams !== undefined ? m.qty_grams : m.qty
          return val > 0
        })
        .reduce((sum, m) => sum + (m.qty_grams || m.qty), 0)
      const totalOutgoing = Math.abs(
        movements
          .filter((m) => {
            const val = m.qty_grams !== null && m.qty_grams !== undefined ? m.qty_grams : m.qty
            return val < 0
          })
          .reduce((sum, m) => sum + (m.qty_grams || m.qty), 0),
      )

      summaryRows = [
        "",
        "ZUSAMMENFASSUNG;;;;;;;;;;;;;",
        "",
        `Gesamtbewegungen;${totalMovements};;;;;;;;;;;;`,
        `Eingänge;${incomingCount};Menge: ${totalIncoming};;;;;;;;;;;`,
        `Ausgänge;${outgoingCount};Menge: ${totalOutgoing};;;;;;;;;;;`,
      ]
    }

    const csv =
      BOM +
      headers.join(";") +
      "\n" +
      csvRows.join("\n") +
      (showSummary && groupBy !== "analysis" ? "\n" + summaryRows.join("\n") : "")

    console.log("[v0] Generated CSV with", csvRows.length, "rows")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          groupBy === "analysis"
            ? `attachment; filename="lagerhistorie-analyse-${timestamp}.csv"`
            : `attachment; filename="lagerhistorie-${timestamp}.csv"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error: any) {
    console.error("[v0] CRITICAL ERROR in inventory history export:", error)
    return NextResponse.json(
      {
        error: "Failed to generate inventory history",
        details: error?.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
