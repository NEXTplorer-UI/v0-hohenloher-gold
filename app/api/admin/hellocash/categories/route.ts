import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/api-auth"

export async function GET() {
  try {
    await requireAdmin()

    const token = process.env.HELLOCASH_API_TOKEN

    if (!token) {
      return NextResponse.json(
        { error: "HelloCash API token not configured" },
        { status: 500 }
      )
    }

    console.log("[v0] [HelloCash] Fetching categories...")

    const response = await fetch("https://api.hellocash.business/api/v1/articles/categories", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })

    console.log("[v0] [HelloCash] Categories API response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] [HelloCash] Categories API error:", errorText)
      return NextResponse.json(
        { error: "Failed to fetch HelloCash categories", details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log("[v0] [HelloCash] Categories fetched:", JSON.stringify(data, null, 2))

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] [HelloCash] Error fetching categories:", error)
    return NextResponse.json(
      { error: "Failed to fetch HelloCash categories", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
