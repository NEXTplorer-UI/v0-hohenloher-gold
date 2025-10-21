-- Fix RLS policies for customers table to allow guest customer creation
-- This allows the checkout process to create customer records for users without accounts

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "customers_select_own" ON public.customers;
DROP POLICY IF EXISTS "customers_insert_own" ON public.customers;
DROP POLICY IF EXISTS "customers_update_own" ON public.customers;

-- Allow users to select their own customer records (by user_id or email)
CREATE POLICY "customers_select_own" ON public.customers 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR email_normalized = lower(trim((SELECT email FROM auth.users WHERE id = auth.uid())))
);

-- Allow authenticated users to insert customer records for themselves
-- Also allow service role to insert any customer (for admin operations)
CREATE POLICY "customers_insert_authenticated" ON public.customers 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  OR user_id IS NULL  -- Allow guest customers (no account)
  OR auth.jwt()->>'role' = 'service_role'  -- Allow admin operations
);

-- Allow users to update their own customer records
CREATE POLICY "customers_update_own" ON public.customers 
FOR UPDATE 
USING (
  auth.uid() = user_id
  OR auth.jwt()->>'role' = 'service_role'  -- Allow admin operations
);

-- Allow service role to delete any customer (admin only)
CREATE POLICY "customers_delete_admin" ON public.customers 
FOR DELETE 
USING (
  auth.jwt()->>'role' = 'service_role'
);

-- Add similar policies for orders to allow guest orders
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;
DROP POLICY IF EXISTS "orders_update_own" ON public.orders;

-- Allow users to select their own orders
CREATE POLICY "orders_select_own" ON public.orders 
FOR SELECT 
USING (
  auth.uid() = user_id
  OR auth.jwt()->>'role' = 'service_role'
);

-- Allow authenticated users and guests to insert orders
CREATE POLICY "orders_insert_authenticated" ON public.orders 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  OR user_id IS NULL  -- Allow guest orders
  OR auth.jwt()->>'role' = 'service_role'
);

-- Allow users to update their own orders
CREATE POLICY "orders_update_own" ON public.orders 
FOR UPDATE 
USING (
  auth.uid() = user_id
  OR auth.jwt()->>'role' = 'service_role'
);
