import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET - List all drafts for the current user
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: drafts, error } = await supabase
      .from("newsletter_drafts")
      .select("*")
      .eq("created_by", user.id)
      .order("updated_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ drafts })
  } catch (error) {
    console.error("Error fetching drafts:", error)
    return NextResponse.json({ error: "Failed to fetch drafts" }, { status: 500 })
  }
}

// POST - Create a new draft
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, subject, content, imageUrl, attachment } = body

    if (!title || !subject || !content) {
      return NextResponse.json({ error: "Title, subject, and content are required" }, { status: 400 })
    }

    const { data: draft, error } = await supabase
      .from("newsletter_drafts")
      .insert({
        title,
        subject,
        content,
        image_url: imageUrl || null,
        attachment: attachment || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ draft })
  } catch (error) {
    console.error("Error creating draft:", error)
    return NextResponse.json({ error: "Failed to create draft" }, { status: 500 })
  }
}
