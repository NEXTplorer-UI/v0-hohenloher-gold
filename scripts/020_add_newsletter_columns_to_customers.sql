-- Migration: Add newsletter subscription columns to customers table
-- This unifies newsletter management into the customers table

-- Add new columns for newsletter subscription tracking
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS newsletter_subscribed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS newsletter_subscribed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS newsletter_unsubscribed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS newsletter_source text;

-- Create index for faster newsletter queries
CREATE INDEX IF NOT EXISTS idx_customers_newsletter_subscribed 
ON public.customers(newsletter_subscribed) 
WHERE newsletter_subscribed = true;

-- Create index for email lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_customers_email_normalized 
ON public.customers(email_normalized);

-- Add comment to explain the columns
COMMENT ON COLUMN public.customers.newsletter_subscribed IS 'Whether the customer is subscribed to the newsletter';
COMMENT ON COLUMN public.customers.newsletter_subscribed_at IS 'When the customer subscribed to the newsletter';
COMMENT ON COLUMN public.customers.newsletter_unsubscribed_at IS 'When the customer unsubscribed from the newsletter';
COMMENT ON COLUMN public.customers.newsletter_source IS 'Source of newsletter subscription (e.g., homepage, checkout, news-page)';
