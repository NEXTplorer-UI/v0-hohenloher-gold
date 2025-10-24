-- Add fields for double opt-in to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS newsletter_confirmed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS newsletter_confirm_token TEXT;

-- Create UNIQUE index on email_normalized to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS customers_email_normalized_key
ON public.customers (email_normalized);

-- Create index on newsletter_confirm_token for faster lookups
CREATE INDEX IF NOT EXISTS customers_newsletter_confirm_token_idx
ON public.customers (newsletter_confirm_token)
WHERE newsletter_confirm_token IS NOT NULL;
