-- =====================================================
-- CRM Tables Creation Script
-- =====================================================
-- Creates all tables needed for customer relationship management,
-- orders, distributors, and pickup locations.

-- Create profiles table for user management
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  is_distributor BOOLEAN DEFAULT FALSE,
  distributor_code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customers table for CRM segmentation
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  email_normalized TEXT GENERATED ALWAYS AS (lower(trim(email))) STORED,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  street TEXT,
  house_number TEXT,
  country TEXT DEFAULT 'DE',
  customer_segment TEXT DEFAULT 'new', -- new, regular, premium, distributor
  account_status TEXT DEFAULT 'no_account' CHECK (account_status IN ('has_account', 'no_account')),
  customer_status TEXT DEFAULT 'active' CHECK (customer_status IN ('active', 'inactive', 'blocked')),
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  last_order_date TIMESTAMP WITH TIME ZONE,
  preferred_products TEXT[], -- array of product categories
  favorite_categories TEXT[] DEFAULT '{}',
  marketing_consent BOOLEAN DEFAULT FALSE,
  marketing_consent_at TIMESTAMP WITH TIME ZONE,
  marketing_consent_ip INET,
  marketing_consent_ua TEXT,
  reminder_notifications BOOLEAN DEFAULT FALSE,
  special_requests TEXT,
  referral_source TEXT,
  distribution_system_benefits JSONB DEFAULT '{"participated": false, "total_benefits": 0, "last_benefit_date": null}'::jsonb,
  search_tsv tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(first_name,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(last_name,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(email,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(phone,'')), 'C')
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order number counters table for race-safe order number generation
CREATE TABLE IF NOT EXISTS public.order_number_counters (
  year INT NOT NULL,
  month INT NOT NULL,
  last_seq INT NOT NULL,
  PRIMARY KEY (year, month)
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_number TEXT UNIQUE NOT NULL,
  order_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  order_number_sequence INTEGER,
  status TEXT DEFAULT 'pending', -- pending, confirmed, ready, completed, cancelled
  delivery_method TEXT NOT NULL, -- pickup, delivery
  pickup_location TEXT,
  pickup_date DATE,
  subtotal NUMERIC(12,2) NOT NULL,
  shipping_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  notes TEXT,
  email_notifications BOOLEAN DEFAULT FALSE,
  pickup_reminders BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT orders_status_chk CHECK (status IN ('pending','confirmed','ready','completed','cancelled')),
  CONSTRAINT orders_delivery_method_chk CHECK (delivery_method IN ('pickup','delivery')),
  CONSTRAINT orders_payment_status_chk CHECK (payment_status IN ('pending','paid','failed','refunded')),
  CONSTRAINT orders_subtotal_chk CHECK (subtotal >= 0),
  CONSTRAINT orders_shipping_cost_chk CHECK (shipping_cost >= 0),
  CONSTRAINT orders_total_chk CHECK (total >= 0)
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  product_category TEXT NOT NULL, -- fresh_fruits, dried_fruits, oils
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  total_price NUMERIC(12,2) GENERATED ALWAYS AS (quantity::numeric * unit_price) STORED,
  product_size TEXT, -- 250g, 500g, 1kg, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT order_items_quantity_chk CHECK (quantity > 0),
  CONSTRAINT order_items_unit_price_chk CHECK (unit_price >= 0)
);

-- Create distributor_commissions table
CREATE TABLE IF NOT EXISTS public.distributor_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  commission_rate DECIMAL(5,2) NOT NULL, -- percentage
  commission_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, paid
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pickup_locations table
CREATE TABLE IF NOT EXISTS public.pickup_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  city TEXT NOT NULL,
  contact_person TEXT,
  contact_phone TEXT,
  distributor_id UUID REFERENCES public.profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Create RLS policies for customers
DROP POLICY IF EXISTS "customers_select_own" ON public.customers;
CREATE POLICY "customers_select_own" ON public.customers FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "customers_insert_own" ON public.customers;
CREATE POLICY "customers_insert_own" ON public.customers FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "customers_update_own" ON public.customers;
CREATE POLICY "customers_update_own" ON public.customers FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for orders
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
CREATE POLICY "orders_select_own" ON public.orders FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;
CREATE POLICY "orders_insert_own" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "orders_update_own" ON public.orders;
CREATE POLICY "orders_update_own" ON public.orders FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for order_items
DROP POLICY IF EXISTS "order_items_select_own" ON public.order_items;
CREATE POLICY "order_items_select_own" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);

DROP POLICY IF EXISTS "order_items_insert_own" ON public.order_items;
CREATE POLICY "order_items_insert_own" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);

-- Create RLS policies for distributor_commissions
DROP POLICY IF EXISTS "commissions_select_own" ON public.distributor_commissions;
CREATE POLICY "commissions_select_own" ON public.distributor_commissions FOR SELECT USING (auth.uid() = distributor_id);

-- Create RLS policies for pickup_locations (public read, distributor write)
DROP POLICY IF EXISTS "pickup_locations_select_all" ON public.pickup_locations;
CREATE POLICY "pickup_locations_select_all" ON public.pickup_locations FOR SELECT USING (true);

DROP POLICY IF EXISTS "pickup_locations_insert_distributor" ON public.pickup_locations;
CREATE POLICY "pickup_locations_insert_distributor" ON public.pickup_locations FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_distributor = true)
);

DROP POLICY IF EXISTS "pickup_locations_update_own" ON public.pickup_locations;
CREATE POLICY "pickup_locations_update_own" ON public.pickup_locations FOR UPDATE USING (auth.uid() = distributor_id);

-- Replaced generate_order_number() with race-safe version using counter table
CREATE OR REPLACE FUNCTION public.generate_order_number_and_seq(p_order_time timestamptz)
RETURNS TABLE(order_number text, seq int) LANGUAGE plpgsql AS $$
DECLARE
  y INT := EXTRACT(YEAR  FROM p_order_time);
  m INT := EXTRACT(MONTH FROM p_order_time);
  next_seq INT;
BEGIN
  -- Atomically increment counter for this year/month
  INSERT INTO public.order_number_counters(year, month, last_seq)
  VALUES (y, m, 1)
  ON CONFLICT (year, month)
  DO UPDATE SET last_seq = public.order_number_counters.last_seq + 1
  RETURNING last_seq INTO next_seq;

  -- Generate order number in format HG-YYYY-MM-NNNN
  order_number := format('HG-%s-%s-%s',
                         to_char(p_order_time,'YYYY'),
                         to_char(p_order_time,'MM'),
                         lpad(next_seq::text,4,'0'));
  seq := next_seq;
  RETURN NEXT;
END $$;

-- Updated trigger function to use race-safe order number generation
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
    FROM public.generate_order_number_and_seq(NEW.order_time);
    NEW.order_number := num;
    NEW.order_number_sequence := seq;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trigger_set_order_details ON public.orders;
CREATE TRIGGER trigger_set_order_details
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.set_order_details();

-- Added trigger for automatic updated_at timestamp
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_orders_touch ON public.orders;
CREATE TRIGGER trg_orders_touch
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_customers_touch ON public.customers;
CREATE TRIGGER trg_customers_touch
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Added indexes for order number performance
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_order_time ON orders(order_time);

-- Added indexes for customer email normalization and search
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_email_normalized ON customers(email_normalized);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_search_tsv ON customers USING GIN(search_tsv);
CREATE INDEX IF NOT EXISTS idx_customers_account_status ON customers(account_status);
CREATE INDEX IF NOT EXISTS idx_customers_customer_status ON customers(customer_status);
CREATE INDEX IF NOT EXISTS idx_customers_last_order_date ON customers(last_order_date);
