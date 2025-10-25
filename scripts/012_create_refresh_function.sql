-- Create function to refresh product_availability materialized view
CREATE OR REPLACE FUNCTION refresh_product_availability()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Refresh the materialized view
  REFRESH MATERIALIZED VIEW CONCURRENTLY product_availability;
  
  RAISE NOTICE 'product_availability view refreshed successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to refresh product_availability: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION refresh_product_availability() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_product_availability() TO service_role;

COMMENT ON FUNCTION refresh_product_availability() IS 'Refreshes the product_availability materialized view to show current stock levels';
