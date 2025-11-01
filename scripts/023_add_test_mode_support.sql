-- =====================================================
-- Test Mode Support (Safe for Existing Orders)
-- =====================================================
-- Adds support for test orders and customers with separate order numbering
-- Test orders use TEST-YYYY-MM-NNNN format instead of HG-YYYY-MM-NNNN
-- This script is safe to run on databases with existing orders

-- Add is_test column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE;

-- Add is_test column to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE;

-- Create indexes for test filtering
CREATE INDEX IF NOT EXISTS idx_orders_is_test ON public.orders(is_test);
CREATE INDEX IF NOT EXISTS idx_customers_is_test ON public.customers(is_test);

-- Create separate counter table for test orders
CREATE TABLE IF NOT EXISTS public.test_order_number_counters (
  year INT NOT NULL,
  month INT NOT NULL,
  last_seq INT NOT NULL,
  PRIMARY KEY (year, month)
);

-- Initialize production counters from existing orders to prevent conflicts
-- This ensures the counter continues from the highest existing order number
DO $$
DECLARE
  rec RECORD;
  max_seq INT;
BEGIN
  -- For each year/month combination in existing orders, set the counter
  FOR rec IN 
    SELECT 
      EXTRACT(YEAR FROM order_time)::INT as year,
      EXTRACT(MONTH FROM order_time)::INT as month,
      MAX(order_number_sequence) as max_seq
    FROM public.orders
    WHERE is_test = FALSE OR is_test IS NULL
    GROUP BY EXTRACT(YEAR FROM order_time), EXTRACT(MONTH FROM order_time)
  LOOP
    -- Only insert if counter doesn't exist yet
    INSERT INTO public.order_number_counters(year, month, last_seq)
    VALUES (rec.year, rec.month, COALESCE(rec.max_seq, 0))
    ON CONFLICT (year, month) DO NOTHING; -- Don't overwrite existing counters
    
    RAISE NOTICE 'Initialized counter for %/% to %', rec.year, rec.month, COALESCE(rec.max_seq, 0);
  END LOOP;
END $$;

-- Update the order number generation function to handle test orders
CREATE OR REPLACE FUNCTION public.generate_order_number_and_seq(p_order_time timestamptz, p_is_test boolean DEFAULT FALSE)
RETURNS TABLE(order_number text, seq int) LANGUAGE plpgsql AS $$
DECLARE
  y INT := EXTRACT(YEAR  FROM p_order_time);
  m INT := EXTRACT(MONTH FROM p_order_time);
  next_seq INT;
  prefix TEXT;
BEGIN
  -- Use different prefix and counter table for test orders
  IF p_is_test THEN
    prefix := 'TEST';
    -- Atomically increment test counter for this year/month
    INSERT INTO public.test_order_number_counters(year, month, last_seq)
    VALUES (y, m, 1)
    ON CONFLICT (year, month)
    DO UPDATE SET last_seq = public.test_order_number_counters.last_seq + 1
    RETURNING last_seq INTO next_seq;
  ELSE
    prefix := 'HG';
    -- Atomically increment production counter for this year/month
    INSERT INTO public.order_number_counters(year, month, last_seq)
    VALUES (y, m, 1)
    ON CONFLICT (year, month)
    DO UPDATE SET last_seq = public.order_number_counters.last_seq + 1
    RETURNING last_seq INTO next_seq;
  END IF;

  -- Generate order number in format PREFIX-YYYY-MM-NNNN
  order_number := format('%s-%s-%s-%s',
                         prefix,
                         to_char(p_order_time,'YYYY'),
                         to_char(p_order_time,'MM'),
                         lpad(next_seq::text,4,'0'));
  seq := next_seq;
  RETURN NEXT;
END $$;

-- Update trigger function to pass is_test flag
CREATE OR REPLACE FUNCTION public.set_order_details()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  num text;
  seq int;
BEGIN
  -- Set order time if not already set
  IF NEW.order_time IS NULL THEN
    NEW.order_time := now();
  END IF;

  -- Generate order number if not already set
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    SELECT * INTO num, seq
    FROM public.generate_order_number_and_seq(NEW.order_time, COALESCE(NEW.is_test, FALSE));
    NEW.order_number := num;
    NEW.order_number_sequence := seq;
  END IF;

  RETURN NEW;
END $$;

-- Add comments to explain test mode
COMMENT ON COLUMN public.orders.is_test IS 'Marks test orders that should be excluded from statistics and can be safely deleted';
COMMENT ON COLUMN public.customers.is_test IS 'Marks test customers that should be excluded from statistics and can be safely deleted';

-- Add verification query to check counter initialization
DO $$
DECLARE
  counter_count INT;
BEGIN
  SELECT COUNT(*) INTO counter_count FROM public.order_number_counters;
  RAISE NOTICE 'Production order counters initialized: % entries', counter_count;
END $$;
