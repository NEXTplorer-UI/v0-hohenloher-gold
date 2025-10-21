import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.json()

    const emailContent = `
Neue Verteiler-Bewerbung

Persönliche Daten:
- Name: ${formData.firstName} ${formData.lastName}
- E-Mail: ${formData.email}
- Telefon: ${formData.phone}
- PLZ/Ort: ${formData.plz} ${formData.city}

Geschäftsinformationen:
- Art des Geschäfts: ${formData.businessType || "Nicht angegeben"}
- Erfahrung: ${formData.experience || "Nicht angegeben"}
- Motivation: ${formData.motivation || "Nicht angegeben"}
- Verfügbarkeit: ${formData.availability || "Nicht angegeben"}

Gesendet am: ${new Date().toLocaleString("de-DE")}
    `

    const emailAddresses = ["kontakt@suedfruechte-hohenlohe.de", "kontakt@hohenloher-gold.de", "gerlindefink@gmx.de"]

    // In a real application, you would use an email service like SendGrid, Resend, etc.
    // For now, we'll simulate the email sending
    console.log("Sending distributor application to:", emailAddresses)
    console.log("Email content:", emailContent)

    // Simulate email sending delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    return NextResponse.json({
      success: true,
      message: "Bewerbung erfolgreich versendet",
    })
  } catch (error) {
    console.error("Error sending distributor application:", error)
    return NextResponse.json({ success: false, message: "Fehler beim Versenden der Bewerbung" }, { status: 500 })
  }
}
