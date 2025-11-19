import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/api-auth"

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    console.log("[v0] [hellocash-employees] Fetching employees from HelloCash API")

    const helloCashToken = process.env.HELLOCASH_API_TOKEN
    if (!helloCashToken) {
      return NextResponse.json({ error: "HelloCash API token not configured" }, { status: 500 })
    }

    const response = await fetch("https://api.hellocash.business/api/v1/employees", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${helloCashToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.error("[v0] [hellocash-employees] API error:", response.status, response.statusText)
      const errorText = await response.text()
      console.error("[v0] [hellocash-employees] Error response:", errorText)
      return NextResponse.json({ error: "Failed to fetch employees from HelloCash" }, { status: response.status })
    }

    const employees = await response.json()
    console.log("[v0] [hellocash-employees] Successfully fetched", employees.length, "employees")

    return NextResponse.json({ employees })
  } catch (error) {
    console.error("[v0] [hellocash-employees] Error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
