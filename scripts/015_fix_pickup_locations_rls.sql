-- =====================================================
-- Fix Pickup Locations RLS Policies
-- =====================================================
-- Allows authenticated users (admins) to manage pickup locations
-- while keeping public read access for checkout

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "pickup_locations_insert_distributor" ON public.pickup_locations;
DROP POLICY IF EXISTS "pickup_locations_update_own" ON public.pickup_locations;

-- Create new policies that allow authenticated users to manage locations
-- (This allows admins to create/edit/delete pickup locations from the CRM)

-- Allow authenticated users to insert pickup locations
CREATE POLICY "pickup_locations_insert_authenticated" 
ON public.pickup_locations 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update any pickup location
CREATE POLICY "pickup_locations_update_authenticated" 
ON public.pickup_locations 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete pickup locations
CREATE POLICY "pickup_locations_delete_authenticated" 
ON public.pickup_locations 
FOR DELETE 
TO authenticated
USING (true);

-- Keep public read access (for checkout page)
-- (This policy already exists from the original script)
-- DROP POLICY IF EXISTS "pickup_locations_select_all" ON public.pickup_locations;
-- CREATE POLICY "pickup_locations_select_all" ON public.pickup_locations FOR SELECT USING (true);
