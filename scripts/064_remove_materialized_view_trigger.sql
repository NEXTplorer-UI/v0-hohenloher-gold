-- Remove the trigger and function that refreshes the materialized view
-- Since product_availability is now a normal VIEW, it doesn't need to be refreshed

-- Drop the trigger that fires on inventory_movements
DROP TRIGGER IF EXISTS trigger_refresh_product_availability ON inventory_movements;

-- Drop the function that refreshes the materialized view
DROP FUNCTION IF EXISTS refresh_product_availability();

-- Note: The product_availability is now a normal VIEW (created in script 061)
-- Normal views always show live data and don't need to be refreshed
