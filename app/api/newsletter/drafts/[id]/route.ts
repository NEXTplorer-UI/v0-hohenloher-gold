import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET - Get a specific draft
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: draft, error } = await supabase
      .from("newsletter_drafts")
      .select("*")
      .eq("id", id)
      .eq("created_by", user.id)
      .single()

    if (error) throw error

    return NextResponse.json({ draft })
  } catch (error) {
    console.error("Error fetching draft:", error)
    return NextResponse.json({ error: "Failed to fetch draft" }, { status: 500 })
  }
}

// PUT - Update a draft
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, subject, content, imageUrl, attachment } = body

    const { data: draft, error } = await supabase
      .from("newsletter_drafts")
      .update({
        title,
        subject,
        content,
        image_url: imageUrl || null,
        attachment: attachment || null,
      })
      .eq("id", id)
      .eq("created_by", user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ draft })
  } catch (error) {
    console.error("Error updating draft:", error)
    return NextResponse.json({ error: "Failed to update draft" }, { status: 500 })
  }
}

// DELETE - Delete a draft
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { error } = await supabase.from("newsletter_drafts").delete().eq("id", id).eq("created_by", user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting draft:", error)
    return NextResponse.json({ error: "Failed to delete draft" }, { status: 500 })
  }
}
