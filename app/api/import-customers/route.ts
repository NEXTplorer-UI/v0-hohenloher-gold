import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    const { customers } = await request.json()

    const supabase = createAdminClient()

    console.log("[v0] Server: Importing customers with service role key:", customers.length)

    const { data: existingCustomers, error: fetchError } = await supabase.from("customers").select("email")

    if (fetchError) {
      console.error("[v0] Server: Error fetching existing customers:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 400 })
    }

    const existingEmails = new Set(existingCustomers?.map((c) => c.email.toLowerCase()) || [])

    const newCustomers = customers.filter((customer: any) => {
      const email = customer.email?.toLowerCase()
      return email && !existingEmails.has(email)
    })

    const duplicateCount = customers.length - newCustomers.length
    console.log("[v0] Server: Found duplicates:", duplicateCount)
    console.log("[v0] Server: New customers to import:", newCustomers.length)

    if (newCustomers.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        duplicates: duplicateCount,
        message: "Alle Kunden bereits vorhanden - keine neuen Kunden importiert",
      })
    }

    const { data, error } = await supabase.from("customers").insert(newCustomers).select()

    if (error) {
      console.error("[v0] Server: Error importing customers:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log("[v0] Server: Successfully imported customers:", data?.length || 0)
    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      duplicates: duplicateCount,
      data: data,
    })
  } catch (error) {
    console.error("[v0] Server: Error during CSV import:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
