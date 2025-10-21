import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { orderData, type } = await request.json()

    // In a real implementation, you would use a PDF generation library like:
    // - puppeteer
    // - jsPDF
    // - react-pdf
    // - @react-pdf/renderer

    // For now, we'll simulate PDF generation
    const pdfContent = generatePDFContent(orderData, type)

    // Convert to blob (in real implementation, this would be actual PDF bytes)
    const blob = new Blob([pdfContent], { type: "application/pdf" })

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${type}-${orderData.invoiceNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error("PDF generation error:", error)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}

function generatePDFContent(orderData: any, type: string): string {
  // This is a simplified version - in reality you'd generate actual PDF bytes
  return `
    ${type === "invoice" ? "RECHNUNG" : "QUITTUNG"} #${orderData.invoiceNumber}
    
    Hohenloher Gold - Südfrüchte Hohenlohe
    Gerlinde Fink
    Weststraße 28, 74629 Pfedelbach
    
    Kunde: ${orderData.customer.name}
    ${orderData.customer.address}
    ${orderData.customer.postalCode} ${orderData.customer.city}
    
    Datum: ${orderData.date}
    ${type === "invoice" ? `Fällig: ${orderData.dueDate}` : ""}
    
    POSITIONEN:
    ${orderData.items
      .map((item: any) => `${item.name} - ${item.quantity}x ${item.price.toFixed(2)}€ = ${item.total.toFixed(2)}€`)
      .join("\n")}
    
    Zwischensumme: ${orderData.subtotal.toFixed(2)}€
    MwSt. (7%): ${orderData.tax.toFixed(2)}€
    GESAMT: ${orderData.total.toFixed(2)}€
    
    Zahlungsart: ${orderData.paymentMethod}
  `
}
