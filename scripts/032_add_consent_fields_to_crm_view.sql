-- Add newsletter consent fields to crm_customers view
-- This fixes the issue where newsletter preferences weren't being saved/loaded correctly

-- Update the crm_customers view to include consent fields
CREATE OR REPLACE VIEW public.crm_customers AS
SELECT
  c.id,
  c.first_name,
  c.last_name,
  c.email,
  c.phone,
  c.city,
  c.street,
  c.house_number,
  c.postal_code,
  c.account_status,
  c.customer_status,
  c.registration_date,
  -- Adding consent fields for newsletter management
  c.newsletter_subscribed,
  c.newsletter_confirmed,
  c.newsletter_unsubscribed_at,
  c.marketing_consent,
  c.reminder_notifications,
  -- existing fields
  c.total_orders,
  c.total_spent,
  c.last_order_date,
  c.favorite_categories,
  c.created_at,
  c.updated_at,
  -- derived fields
  GREATEST(c.updated_at, m.last_order_date) AS last_activity,
  COALESCE(c.favorite_categories, '{}') AS tags,
  -- KPIs from materialized view
  m.order_count,
  m.total_spent_calc,
  m.avg_order_value,
  m.first_order_date AS first_order,
  m.last_order_date AS last_order
FROM public.customers c
LEFT JOIN public.crm_customer_metrics m ON m.customer_id = c.id;

GRANT SELECT ON public.crm_customers TO anon, authenticated;
