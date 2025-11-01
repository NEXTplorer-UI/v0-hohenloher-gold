-- Add order_number field to checkouts table to track the real order number
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS order_number TEXT;

-- Add checkout_id field to orders table to link back to checkout
ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_id UUID REFERENCES checkouts(id);

-- Add transaction_id to orders for payment tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_checkout_id ON orders(checkout_id);
CREATE INDEX IF NOT EXISTS idx_checkouts_order_number ON checkouts(order_number);
