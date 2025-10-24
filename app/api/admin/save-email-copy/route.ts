import { type NextRequest, NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import { join } from "path"

export async function POST(req: NextRequest) {
  try {
    const { emailCopy } = await req.json()

    // Generate the new copy.tsx file content
    const fileContent = `// Email-Texte für alle Templates
// Diese Datei wird automatisch vom Email-Editor generiert

export const emailCopy = ${JSON.stringify(emailCopy, null, 2)}
`

    // Write to lib/email/copy.tsx
    const filePath = join(process.cwd(), "lib", "email", "copy.tsx")
    await writeFile(filePath, fileContent, "utf-8")

    return NextResponse.json({
      success: true,
      message: "Email-Texte erfolgreich gespeichert",
    })
  } catch (error) {
    console.error("[v0] Error saving email copy:", error)
    return NextResponse.json({ success: false, error: "Fehler beim Speichern der Email-Texte" }, { status: 500 })
  }
}
