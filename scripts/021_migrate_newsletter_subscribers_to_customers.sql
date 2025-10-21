-- Migration: Transfer data from newsletter_subscribers to customers table
-- This consolidates all newsletter subscriptions into the customers table

-- Insert newsletter subscribers who are not yet customers
INSERT INTO public.customers (
  email,
  email_normalized,
  newsletter_subscribed,
  newsletter_subscribed_at,
  newsletter_unsubscribed_at,
  newsletter_source,
  created_at,
  updated_at
)
SELECT 
  ns.email,
  LOWER(TRIM(ns.email)) as email_normalized,
  ns.is_active as newsletter_subscribed,
  ns.subscribed_at as newsletter_subscribed_at,
  ns.unsubscribed_at as newsletter_unsubscribed_at,
  COALESCE(ns.source, 'legacy-migration') as newsletter_source,
  ns.created_at,
  ns.updated_at
FROM newsletter_subscribers ns
WHERE NOT EXISTS (
  SELECT 1 FROM public.customers c 
  WHERE c.email_normalized = LOWER(TRIM(ns.email))
)
ON CONFLICT (email_normalized) DO NOTHING;

-- Update existing customers who are also newsletter subscribers
UPDATE public.customers c
SET 
  newsletter_subscribed = ns.is_active,
  newsletter_subscribed_at = ns.subscribed_at,
  newsletter_unsubscribed_at = ns.unsubscribed_at,
  newsletter_source = COALESCE(ns.source, 'legacy-migration'),
  updated_at = NOW()
FROM newsletter_subscribers ns
WHERE c.email_normalized = LOWER(TRIM(ns.email))
  AND c.newsletter_subscribed IS NULL; -- Only update if not already set

-- Log migration results
DO $$
DECLARE
  total_subscribers integer;
  migrated_count integer;
BEGIN
  SELECT COUNT(*) INTO total_subscribers FROM newsletter_subscribers;
  SELECT COUNT(*) INTO migrated_count FROM public.customers WHERE newsletter_subscribed = true;
  
  RAISE NOTICE 'Newsletter migration completed:';
  RAISE NOTICE '  Total newsletter_subscribers: %', total_subscribers;
  RAISE NOTICE '  Customers with newsletter_subscribed=true: %', migrated_count;
END $$;
