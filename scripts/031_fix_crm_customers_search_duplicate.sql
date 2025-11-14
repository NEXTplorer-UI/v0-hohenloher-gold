-- =========================================================
-- Fix: Remove duplicate crm_customers_search functions
-- Problem: Multiple function signatures causing ambiguity
-- Solution: Drop ALL versions and recreate ONE clean version
-- =========================================================

-- Drop ALL possible function signatures that might exist
DROP FUNCTION IF EXISTS public.crm_customers_search(integer, integer, text);
DROP FUNCTION IF EXISTS public.crm_customers_search(text, integer, integer);
DROP FUNCTION IF EXISTS public.crm_customers_search(limit_count integer, offset_count integer, q text);
DROP FUNCTION IF EXISTS public.crm_customers_search(q text, limit_count integer, offset_count integer);

-- Recreate ONE clean function with consent fields
CREATE OR REPLACE FUNCTION public.crm_customers_search(
  limit_count  integer DEFAULT 50,
  offset_count integer DEFAULT 0,
  q            text    DEFAULT NULL
)
RETURNS TABLE (
  id                      uuid,
  first_name              text,
  last_name               text,
  email                   text,
  phone                   text,
  city                    text,
  postal_code             text,
  street                  text,
  house_number            text,
  country                 text,
  account_status          text,
  customer_status         text,
  order_count             integer,
  total_spent             numeric(12,2),
  last_activity           timestamptz,
  tags                    text[],
  newsletter_subscribed   boolean,
  marketing_consent       boolean,
  reminder_notifications  boolean,
  created_at              timestamptz,
  updated_at              timestamptz,
  last_order_date         timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.first_name,
    c.last_name,
    c.email,
    c.phone,
    c.city,
    c.postal_code,
    c.street,
    c.house_number,
    c.country,
    c.account_status,
    c.customer_status,
    COALESCE(c.total_orders, 0)                    AS order_count,
    COALESCE(c.total_spent, 0)::numeric(12,2)      AS total_spent,
    GREATEST(c.updated_at, c.last_order_date)      AS last_activity,
    COALESCE(c.favorite_categories, ARRAY[]::text[]) AS tags,
    COALESCE(c.newsletter_subscribed, false)       AS newsletter_subscribed,
    COALESCE(c.marketing_consent, false)           AS marketing_consent,
    COALESCE(c.reminder_notifications, false)      AS reminder_notifications,
    c.created_at,
    c.updated_at,
    c.last_order_date
  FROM public.customers c
  WHERE
    q IS NULL
    OR c.first_name ILIKE '%' || q || '%'
    OR c.last_name  ILIKE '%' || q || '%'
    OR c.email ILIKE '%' || q || '%'
    OR c.city ILIKE '%' || q || '%'
  ORDER BY last_activity DESC NULLS LAST, c.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
$$;

-- Fixed grant statements to use correct function signature with named parameters
-- Grant permissions to all roles
GRANT EXECUTE ON FUNCTION public.crm_customers_search(limit_count integer, offset_count integer, q text) TO anon;
GRANT EXECUTE ON FUNCTION public.crm_customers_search(limit_count integer, offset_count integer, q text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_customers_search(limit_count integer, offset_count integer, q text) TO service_role;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
