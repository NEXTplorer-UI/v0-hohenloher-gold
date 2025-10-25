import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

function jsonError(message: string, status = 500) {
  console.error("[v0] [upload-image] Error:", message)
  return NextResponse.json({ success: false, error: message }, { status, headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest) {
  console.log("[v0] [upload-image] API called")

  try {
    const supabase = createAdminClient()
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      console.log("[v0] [upload-image] No file provided")
      return jsonError("No file provided", 400)
    }

    console.log("[v0] [upload-image] File received:", {
      name: file.name,
      type: file.type,
      size: file.size,
    })

    const bucketName = "articles"

    const now = new Date()
    const dateFolder = now.toISOString().split("T")[0] // YYYY-MM-DD
    const fileExt = file.name.split(".").pop()
    const uuid = crypto.randomUUID()
    const filePath = `${dateFolder}/${uuid}.${fileExt}`

    console.log("[v0] [upload-image] Uploading file to:", filePath)

    const arrayBuffer = await file.arrayBuffer()

    console.log("[v0] [upload-image] Attempting upload to bucket:", bucketName)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error("[v0] [upload-image] Supabase upload error:", {
        message: uploadError.message,
        statusCode: uploadError.statusCode,
        error: uploadError,
      })
      return jsonError(`Upload failed: ${uploadError.message}`, uploadError.statusCode || 500)
    }

    console.log("[v0] [upload-image] File uploaded successfully:", uploadData)

    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath)

    console.log("[v0] [upload-image] Public URL generated:", urlData.publicUrl)

    return NextResponse.json(
      {
        success: true,
        url: urlData.publicUrl,
      },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error: any) {
    console.error("[v0] [upload-image] Unexpected error:", {
      message: error.message,
      stack: error.stack,
      error,
    })
    return jsonError(error.message || "Internal server error", 500)
  }
}
