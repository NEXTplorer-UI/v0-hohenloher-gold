-- Add pickup_location_id column to orders table
-- This creates a proper foreign key relationship to pickup_locations
-- while keeping the old pickup_location text field for backward compatibility

-- Add the new column (nullable initially for existing orders)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS pickup_location_id UUID;

-- Add foreign key constraint
ALTER TABLE orders
ADD CONSTRAINT fk_orders_pickup_location
FOREIGN KEY (pickup_location_id) 
REFERENCES pickup_locations(id)
ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_pickup_location_id 
ON orders(pickup_location_id);

-- Optional: Try to match existing orders to pickup locations by name
-- This will populate pickup_location_id for existing orders where possible
UPDATE orders o
SET pickup_location_id = pl.id
FROM pickup_locations pl
WHERE o.pickup_location = pl.name
AND o.pickup_location_id IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN orders.pickup_location_id IS 'Foreign key to pickup_locations table. NULL for old orders or if location was deleted.';
