import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET: Search for existing HelloCash user by email
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email parameter required" }, { status: 400 })
    }

    console.log("[v0] [hellocash-users] Searching for user with email:", email)

    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    const helloCashToken = process.env.HELLOCASH_API_TOKEN
    if (!helloCashToken) {
      return NextResponse.json({ error: "HelloCash API token not configured" }, { status: 500 })
    }

    // Search HelloCash users by email
    const response = await fetch(`https://api.hellocash.business/api/v1/users?limit=1000&offset=1`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${helloCashToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.error("[v0] [hellocash-users] Failed to fetch users:", response.status)
      return NextResponse.json({ error: "Failed to fetch HelloCash users" }, { status: response.status })
    }

    const data = await response.json()
    const users = data.users || []

    // Find user by email
    const matchingUser = users.find((u: any) => u.user_email?.toLowerCase() === email.toLowerCase())

    console.log("[v0] [hellocash-users] Search result:", matchingUser ? "Found" : "Not found")

    return NextResponse.json({
      found: !!matchingUser,
      user: matchingUser || null,
    })
  } catch (error: any) {
    console.error("[v0] [hellocash-users] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Create new HelloCash user
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { customerId } = body

    if (!customerId) {
      return NextResponse.json({ error: "Customer ID required" }, { status: 400 })
    }

    console.log("[v0] [hellocash-users] Creating HelloCash user for customer:", customerId)

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Check if already synced
    if (customer.hellocash_user_id) {
      console.log("[v0] [hellocash-users] Customer already has HelloCash user ID:", customer.hellocash_user_id)
      return NextResponse.json({
        success: true,
        userId: customer.hellocash_user_id,
        message: "Customer already synced",
      })
    }

    const helloCashToken = process.env.HELLOCASH_API_TOKEN
    if (!helloCashToken) {
      return NextResponse.json({ error: "HelloCash API token not configured" }, { status: 500 })
    }

    // Prepare user data for HelloCash
    const helloCashUserData: any = {}

    // Required: Either surname OR company name
    if (customer.last_name) {
      helloCashUserData.user_surname = customer.last_name
    }
    if (customer.company_name) {
      helloCashUserData.user_company = customer.company_name
    }

    // Add optional fields if available
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

    console.log("[v0] [hellocash-users] Creating user with data:", {
      ...helloCashUserData,
      user_email: "***",
    })

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
      console.error("[v0] [hellocash-users] Failed to create user:", response.status, responseText)
      return NextResponse.json(
        {
          error: `Failed to create HelloCash user: ${response.status}`,
          details: responseText,
        },
        { status: response.status },
      )
    }

    let helloCashUser
    try {
      helloCashUser = JSON.parse(responseText)
    } catch (parseError) {
      console.error("[v0] [hellocash-users] Failed to parse response:", responseText)
      return NextResponse.json({ error: "Invalid response from HelloCash" }, { status: 500 })
    }

    console.log("[v0] [hellocash-users] User created successfully, ID:", helloCashUser.user_id)

    // Update customer with HelloCash user ID
    const { error: updateError } = await supabase
      .from("customers")
      .update({
        hellocash_user_id: helloCashUser.user_id,
      })
      .eq("id", customerId)

    if (updateError) {
      console.error("[v0] [hellocash-users] Failed to update customer:", updateError)
      // User is created in HelloCash but not saved in our DB - log warning
      console.warn(
        "[v0] [hellocash-users] WARNING: HelloCash user created but not saved in database. User ID:",
        helloCashUser.user_id,
      )
    }

    return NextResponse.json({
      success: true,
      userId: helloCashUser.user_id,
      user: helloCashUser,
    })
  } catch (error: any) {
    console.error("[v0] [hellocash-users] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT: Update existing HelloCash user
export async function PUT(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { customerId } = body

    if (!customerId) {
      return NextResponse.json({ error: "Customer ID required" }, { status: 400 })
    }

    console.log("[v0] [hellocash-users] Updating HelloCash user for customer:", customerId)

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    if (!customer.hellocash_user_id) {
      return NextResponse.json({ error: "Customer not synced with HelloCash yet. Create first." }, { status: 400 })
    }

    const helloCashToken = process.env.HELLOCASH_API_TOKEN
    if (!helloCashToken) {
      return NextResponse.json({ error: "HelloCash API token not configured" }, { status: 500 })
    }

    const helloCashUserData: any = {}

    // Required: Either surname OR company name
    if (customer.last_name) {
      helloCashUserData.user_surname = customer.last_name
    }
    if (customer.company_name) {
      helloCashUserData.user_company = customer.company_name
    }

    // Add optional fields if available
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

    console.log("[v0] [hellocash-users] Updating user with ID:", customer.hellocash_user_id)

    const response = await fetch(`https://api.hellocash.business/api/v1/users/${customer.hellocash_user_id}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${helloCashToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(helloCashUserData),
    })

    const responseText = await response.text()

    if (!response.ok) {
      console.error("[v0] [hellocash-users] Failed to update user:", response.status, responseText)
      return NextResponse.json(
        {
          error: `Failed to update HelloCash user: ${response.status}`,
          details: responseText,
        },
        { status: response.status },
      )
    }

    console.log("[v0] [hellocash-users] User updated successfully")

    return NextResponse.json({
      success: true,
      userId: customer.hellocash_user_id,
      message: "User updated successfully",
    })
  } catch (error: any) {
    console.error("[v0] [hellocash-users] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
