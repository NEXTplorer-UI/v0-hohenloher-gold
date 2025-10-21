-- Migration: Drop newsletter_subscribers table after successful migration
-- WARNING: Only run this after verifying the migration was successful!

-- Create a backup view before dropping (optional safety measure)
CREATE OR REPLACE VIEW newsletter_subscribers_backup AS
SELECT 
  c.id as customer_id,
  c.email,
  c.newsletter_subscribed as is_active,
  c.newsletter_subscribed_at as subscribed_at,
  c.newsletter_unsubscribed_at as unsubscribed_at,
  c.newsletter_source as source,
  c.created_at,
  c.updated_at
FROM public.customers c
WHERE c.newsletter_subscribed = true OR c.newsletter_unsubscribed_at IS NOT NULL;

-- Drop the old newsletter_subscribers table
DROP TABLE IF EXISTS newsletter_subscribers CASCADE;

RAISE NOTICE 'newsletter_subscribers table dropped. Backup view created: newsletter_subscribers_backup';
