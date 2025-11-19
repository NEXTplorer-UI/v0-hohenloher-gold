import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    console.log("[v0] [hellocash-sync-all] Starting bulk customer synchronization")

    const helloCashToken = process.env.HELLOCASH_API_TOKEN
    if (!helloCashToken) {
      return NextResponse.json({ error: "HelloCash API token not configured" }, { status: 500 })
    }

    // Get all customers without hellocash_user_id
    const { data: customers, error: customersError } = await supabase
      .from("customers")
      .select("*")
      .is("hellocash_user_id", null)
      .order("created_at", { ascending: true })

    if (customersError) {
      console.error("[v0] [hellocash-sync-all] Error fetching customers:", customersError)
      return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
    }

    if (!customers || customers.length === 0) {
      console.log("[v0] [hellocash-sync-all] No customers to sync")
      return NextResponse.json({
        success: true,
        total: 0,
        synced: 0,
        errors: 0,
        message: "All customers already synced",
      })
    }

    console.log(`[v0] [hellocash-sync-all] Found ${customers.length} customers to sync`)

    const results = {
      total: customers.length,
      synced: 0,
      errors: 0,
      errorDetails: [] as string[],
    }

    // Process customers SEQUENTIALLY (one at a time)
    for (const customer of customers) {
      try {
        console.log(`[v0] [hellocash-sync-all] Processing customer ${customer.id} (${customer.email})`)

        // Prepare user data for HelloCash
        const helloCashUserData: any = {}

        // Required: Either surname OR company name
        if (customer.last_name) {
          helloCashUserData.user_surname = customer.last_name
        }
        if (customer.company_name) {
          helloCashUserData.user_company = customer.company_name
        }

        // If neither surname nor company name, skip this customer
        if (!helloCashUserData.user_surname && !helloCashUserData.user_company) {
          console.warn(`[v0] [hellocash-sync-all] Skipping customer ${customer.id}: No surname or company name`)
          results.errors++
          results.errorDetails.push(`${customer.email}: Missing surname and company name`)
          continue
        }

        // Add optional fields
        if (customer.first_name) {
          helloCashUserData.user_firstname = customer.first_name
        }
        if (customer.email) {
          helloCashUserData.user_email = customer.email
        }
        if (customer.phone) {
          helloCashUserData.user_phoneNumber = customer.phone
        }
        if (customer.street) {
          helloCashUserData.user_street = customer.street
        }
        if (customer.house_number) {
          helloCashUserData.user_houseNumber = customer.house_number
        }
        if (customer.postal_code) {
          helloCashUserData.user_postalCode = customer.postal_code
        }
        if (customer.city) {
          helloCashUserData.user_city = customer.city
        }
        if (customer.country) {
          helloCashUserData.user_country_code = customer.country
        }

        // Create user in HelloCash
        const response = await fetch("https://api.hellocash.business/api/v1/users", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${helloCashToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(helloCashUserData),
        })

        const responseText = await response.text()

        if (!response.ok) {
          console.error(
            `[v0] [hellocash-sync-all] Failed to create user for customer ${customer.id}:`,
            response.status,
            responseText,
          )
          results.errors++
          results.errorDetails.push(`${customer.email}: API error ${response.status}`)
          continue
        }

        let helloCashUser
        try {
          helloCashUser = JSON.parse(responseText)
        } catch (parseError) {
          console.error(`[v0] [hellocash-sync-all] Failed to parse response for customer ${customer.id}:`, responseText)
          results.errors++
          results.errorDetails.push(`${customer.email}: Invalid API response`)
          continue
        }

        // Update customer with HelloCash user ID
        const { error: updateError } = await supabase
          .from("customers")
          .update({
            hellocash_user_id: helloCashUser.user_id,
          })
          .eq("id", customer.id)

        if (updateError) {
          console.error(`[v0] [hellocash-sync-all] Failed to update customer ${customer.id}:`, updateError)
          results.errors++
          results.errorDetails.push(`${customer.email}: Database update failed`)
          continue
        }

        console.log(`[v0] [hellocash-sync-all] Successfully synced customer ${customer.id}, HelloCash ID: ${helloCashUser.user_id}`)
        results.synced++

        // Small delay to avoid rate limiting (100ms between requests)
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error: any) {
        console.error(`[v0] [hellocash-sync-all] Error processing customer ${customer.id}:`, error)
        results.errors++
        results.errorDetails.push(`${customer.email}: ${error.message}`)
      }
    }

    console.log(`[v0] [hellocash-sync-all] Sync completed: ${results.synced} synced, ${results.errors} errors`)

    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (error: any) {
    console.error("[v0] [hellocash-sync-all] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
