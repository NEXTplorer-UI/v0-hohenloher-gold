-- Add reminder_sent field to orders table to track if pickup reminder was sent
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE;

-- Add comment to explain the fields
COMMENT ON COLUMN orders.reminder_sent IS 'Tracks if pickup reminder email was sent for this order';
COMMENT ON COLUMN orders.reminder_sent_at IS 'Timestamp when pickup reminder email was sent';

-- Create index for efficient querying of orders that need reminders
CREATE INDEX IF NOT EXISTS idx_orders_pickup_reminders 
ON orders(pickup_date, pickup_reminders, reminder_sent) 
WHERE pickup_reminders = TRUE AND reminder_sent = FALSE;
