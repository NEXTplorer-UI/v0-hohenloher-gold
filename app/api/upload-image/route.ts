import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some((bucket) => bucket.name === "articles")

    if (!bucketExists) {
      const { error: bucketError } = await supabase.storage.createBucket("articles", {
        public: true,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        fileSizeLimit: 5242880, // 5MB
      })

      if (bucketError) {
        console.error("Error creating bucket:", bucketError)
        return NextResponse.json({ error: "Failed to create storage bucket" }, { status: 500 })
      }
    }

    const fileExt = file.name.split(".").pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `articles/${fileName}`

    const { error: uploadError } = await supabase.storage.from("articles").upload(filePath, file)

    if (uploadError) {
      console.error("Error uploading file:", uploadError)
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
    }

    const { data } = supabase.storage.from("articles").getPublicUrl(filePath)

    return NextResponse.json({ url: data.publicUrl })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
