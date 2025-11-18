-- Add mapping_ignored field to orders table to track orders that should be hidden from mapping UI
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mapping_ignored BOOLEAN DEFAULT FALSE;

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_orders_mapping_ignored ON orders(mapping_ignored) WHERE mapping_ignored = TRUE;

-- Add comment
COMMENT ON COLUMN orders.mapping_ignored IS 'If true, this order will be hidden from the pickup location mapping interface';
