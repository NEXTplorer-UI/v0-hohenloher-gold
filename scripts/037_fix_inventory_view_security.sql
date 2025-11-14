-- Fix security warning: Remove auth.users exposure from inventory_movements_with_details view
-- The view was joining auth.users which triggered a Supabase security warning
-- We can join directly to profiles since profiles.id = auth.users.id
-- Keep SECURITY DEFINER (default) so the view can access all profiles for created_by_name

-- Drop the existing view
DROP VIEW IF EXISTS public.inventory_movements_with_details;

-- Recreate without auth.users join and with default SECURITY DEFINER
-- Removed security_invoker = true to keep SECURITY DEFINER behavior
CREATE VIEW public.inventory_movements_with_details
AS
SELECT 
    im.id,
    im.product_id,
    im.order_id,
    im.order_item_id,
    im.qty,
    im.reason,
    im.reference_id,
    im.occurred_at,
    im.created_at,
    im.updated_at,
    im.created_by,
    im.source,
    p.name as product_name,
    p.sku as product_sku,
    p.price as product_price,
    p.unit as product_unit,
    c.name as category_name,
    -- Direct join to profiles instead of via auth.users to fix security warning
    COALESCE(
        CONCAT(pr.first_name, ' ', pr.last_name),
        pr.email,
        'System'
    ) as created_by_name
FROM inventory_movements im
JOIN products p ON im.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN profiles pr ON im.created_by = pr.id;

-- Grant permissions
GRANT SELECT ON public.inventory_movements_with_details TO authenticated;
GRANT SELECT ON public.inventory_movements_with_details TO anon;
