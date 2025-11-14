-- Set customer status based on order history
-- Only customers with orders should be "active"

-- Fixed to use only total_orders (order_count doesn't exist)
UPDATE public.customers
SET customer_status = CASE
  WHEN total_orders > 0 THEN 'active'
  ELSE 'inactive'
END,
updated_at = NOW()
WHERE customer_status IS NULL OR customer_status = 'active';

-- Add helpful comment
COMMENT ON COLUMN public.customers.customer_status IS 'Customer activity status: active (has orders), inactive (no orders), blocked (manually blocked)';

-- Log results
DO $$
DECLARE
  active_count integer;
  inactive_count integer;
BEGIN
  SELECT COUNT(*) INTO active_count FROM public.customers WHERE customer_status = 'active';
  SELECT COUNT(*) INTO inactive_count FROM public.customers WHERE customer_status = 'inactive';
  
  RAISE NOTICE 'Customer status updated:';
  RAISE NOTICE '  Active customers: %', active_count;
  RAISE NOTICE '  Inactive customers: %', inactive_count;
END $$;
