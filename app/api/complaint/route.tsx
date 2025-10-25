import { type NextRequest, NextResponse } from "next/server"
import { complaintSchema } from "@/lib/validation/schemas"
import { buildEmail } from "@/lib/email/build"
import { EmailService } from "@/lib/email/email-service"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Complaint form API called")
    const formData = await request.formData()

    // Extract fields from FormData
    const firstName = formData.get("firstName") as string
    const lastName = formData.get("lastName") as string
    const email = formData.get("email") as string
    const orderNumber = formData.get("orderNumber") as string
    const description = formData.get("description") as string
    const image = formData.get("image") as File

    console.log("[v0] Complaint form data:", { firstName, lastName, email, orderNumber, hasImage: !!image })

    // Validate the data
    const validationResult = complaintSchema.safeParse({
      firstName,
      lastName,
      email,
      orderNumber,
      description,
      image,
    })

    if (!validationResult.success) {
      console.error("[v0] Complaint form error:", validationResult.error.issues)
      return NextResponse.json({ error: "Validierungsfehler", details: validationResult.error.issues }, { status: 400 })
    }

    const validData = validationResult.data

    // Convert image to base64 for email attachment
    const imageBuffer = await validData.image.arrayBuffer()
    const imageBase64 = Buffer.from(imageBuffer).toString("base64")
    const imageMimeType = validData.image.type

    // Send email to business with image attachment
    const businessEmailHtml = `
      <h2>Neue Reklamation</h2>
      <p><strong>Von:</strong> ${validData.firstName} ${validData.lastName}</p>
      <p><strong>E-Mail:</strong> ${validData.email}</p>
      <p><strong>Bestellnummer:</strong> ${validData.orderNumber}</p>
      <p><strong>Beschreibung:</strong></p>
      <p>${validData.description.replace(/\n/g, "<br>")}</p>
      <p><strong>Foto:</strong> Siehe Anhang</p>
    `

    await EmailService.sendEmail({
      to: "kontakt@suedfruechte-hohenlohe.de",
      subject: `Reklamation - Bestellung ${validData.orderNumber}`,
      html: businessEmailHtml,
      attachments: [
        {
          filename: validData.image.name,
          content: imageBase64,
          encoding: "base64",
          contentType: imageMimeType,
        },
      ],
    })

    // Send confirmation email to customer using template
    const { subject, html } = buildEmail("complaintConfirmation", {
      customerName: `${validData.firstName} ${validData.lastName}`,
      orderNumber: validData.orderNumber,
      description: validData.description,
    })

    await EmailService.sendEmail({
      to: validData.email,
      subject,
      html,
    })

    console.log("[v0] Complaint form processed successfully")
    return NextResponse.json({ success: true, message: "Reklamation erfolgreich eingereicht" })
  } catch (error) {
    console.error("[v0] Complaint form error:", error)
    return NextResponse.json(
      {
        error: "Fehler beim Einreichen der Reklamation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
