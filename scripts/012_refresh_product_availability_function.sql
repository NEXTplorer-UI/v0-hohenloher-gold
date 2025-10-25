-- Create function to refresh product_availability materialized view
CREATE OR REPLACE FUNCTION refresh_product_availability()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY product_availability;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION refresh_product_availability() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_product_availability() TO service_role;
