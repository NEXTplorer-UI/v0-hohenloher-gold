-- Add hellocash_user_id column to customers table for HelloCash customer synchronization
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS hellocash_user_id INTEGER;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_hellocash_user_id ON customers(hellocash_user_id);

-- Add comment
COMMENT ON COLUMN customers.hellocash_user_id IS 'HelloCash user ID for invoice generation - synced when customer is created or first invoice is generated';
