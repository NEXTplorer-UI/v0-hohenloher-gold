-- Add internal_status column to orders table for internal order marking
-- Allows admins to mark orders with statuses like 'incomplete', 'needs_clarification', 'priority', 'ready'

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS internal_status TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN public.orders.internal_status IS 'Internal status for admin order marking (incomplete, needs_clarification, priority, ready, or null for normal)';
