-- Fix permissions for get_admin_orders RPC function
-- This ensures authenticated users can execute the function

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.get_admin_orders(text, text, integer, integer) TO authenticated, anon;

-- Ensure the function owner has proper access to the tables
-- The function uses SECURITY DEFINER, so it runs with the owner's privileges
COMMENT ON FUNCTION public.get_admin_orders IS 
'Returns orders with customer and order items data. Requires admin role check in application layer.';
