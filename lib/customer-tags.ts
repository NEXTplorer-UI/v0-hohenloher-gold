// Utility functions for generating customer tags from customer data

export interface CustomerTagData {
  customer_segment?: string
  preferred_products?: string[]
  favorite_categories?: string[]
  total_orders?: number
  total_spent?: number
  newsletter_subscribed?: boolean
  reminder_notifications?: boolean
  customer_status?: string
  account_status?: string
}

/**
 * Generates tags automatically from customer data
 * @param customer Customer data object
 * @returns Array of generated tags
 */
export function generateCustomerTags(customer: CustomerTagData): string[] {
  const tags: string[] = []

  // Segment-based tags
  if (customer.customer_segment) {
    tags.push(`Segment: ${customer.customer_segment}`)
  }

  // Category-based tags
  if (customer.favorite_categories && customer.favorite_categories.length > 0) {
    customer.favorite_categories.forEach((category) => {
      tags.push(`Kategorie: ${category}`)
    })
  }

  // Product-based tags
  if (customer.preferred_products && customer.preferred_products.length > 0) {
    customer.preferred_products.forEach((product) => {
      tags.push(`Produkt: ${product}`)
    })
  }

  // Behavior-based tags
  if (customer.total_orders !== undefined) {
    if (customer.total_orders === 0) {
      tags.push("Neukunde")
    } else if (customer.total_orders >= 10) {
      tags.push("Stammkunde")
    } else if (customer.total_orders >= 5) {
      tags.push("Wiederkäufer")
    }
  }

  // Spending-based tags
  if (customer.total_spent !== undefined) {
    if (customer.total_spent >= 1000) {
      tags.push("Premium-Kunde")
    } else if (customer.total_spent >= 500) {
      tags.push("Guter Kunde")
    }
  }

  // Communication preference tags
  if (customer.newsletter_subscribed) {
    tags.push("Newsletter-Abonnent")
  }

  if (customer.reminder_notifications) {
    tags.push("Erinnerungen aktiv")
  }

  // Status-based tags
  if (customer.customer_status === "active") {
    tags.push("Aktiver Kunde")
  } else if (customer.customer_status === "inactive") {
    tags.push("Inaktiver Kunde")
  }

  if (customer.account_status === "has_account") {
    tags.push("Registriert")
  }

  return tags
}

/**
 * Gets all unique tags from a list of customers
 * @param customers Array of customers
 * @returns Array of unique tags
 */
export function getAllAvailableTags(customers: CustomerTagData[]): string[] {
  const allTags = new Set<string>()

  customers.forEach((customer) => {
    const tags = generateCustomerTags(customer)
    tags.forEach((tag) => allTags.add(tag))
  })

  return Array.from(allTags).sort()
}
