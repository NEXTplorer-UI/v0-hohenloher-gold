-- Add admin_notes column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add comment to document the column
COMMENT ON COLUMN orders.admin_notes IS 'Internal admin notes for order management';
