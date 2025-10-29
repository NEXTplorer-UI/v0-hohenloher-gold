-- Add admin_notes field to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN orders.admin_notes IS 'Internal admin notes for order management (not visible to customers)';
