export type FavoriteProduct = {
  product_id: number | string
  name: string | null
  quantity: number
}

export interface ExtendedCustomer {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  street?: string
  house_number?: string
  postal_code?: string
  city?: string
  country?: string
  newsletter_subscribed?: boolean
  notes?: string | null

  created_at?: string
  updated_at?: string

  // Status
  account_status?: "has_account" | "no_account"
  customer_status?: "active" | "inactive" | "blocked"
  email_confirmed?: boolean
  email_confirmed_at?: string | null

  // KPIs aus RPC
  order_count?: number
  total_spent?: number
  avg_order_value?: number
  last_order_date?: string | null
  days_since_last_order?: number | null
  favorite_products?: FavoriteProduct[]

  // bestehende optionale Felder
  favorite_categories?: string[]
  reminder_notifications?: boolean
  referral_source?: string
}
