-- ============================================================================
-- Setup Revenue Analytics Materialized View with pg_cron
-- ============================================================================
-- This script implements Option C (Decoupling): 
-- - Creates revenue_analytics materialized view
-- - Adds unique index for CONCURRENT refresh
-- - Sets up pg_cron to refresh every 5 minutes
-- - Removes any blocking refreshes from order insert path
-- ============================================================================

-- Step 1: Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Drop existing revenue_analytics view if it exists
DROP MATERIALIZED VIEW IF EXISTS revenue_analytics CASCADE;

-- Step 3: Create revenue_analytics materialized view
CREATE MATERIALIZED VIEW revenue_analytics AS
SELECT 
  DATE_TRUNC('day', o.created_at) as date,
  COUNT(DISTINCT o.id) as order_count,
  COUNT(DISTINCT o.customer_id) as unique_customers,
  SUM(o.total_amount) as total_revenue,
  AVG(o.total_amount) as avg_order_value,
  SUM(CASE WHEN o.status = 'completed' THEN o.total_amount ELSE 0 END) as completed_revenue,
  SUM(CASE WHEN o.status = 'pending' THEN o.total_amount ELSE 0 END) as pending_revenue,
  SUM(CASE WHEN o.status = 'cancelled' THEN o.total_amount ELSE 0 END) as cancelled_revenue
FROM orders o
GROUP BY DATE_TRUNC('day', o.created_at);

-- Step 4: Create UNIQUE INDEX (required for CONCURRENT refresh)
-- Using date as unique key since we group by day
CREATE UNIQUE INDEX idx_revenue_analytics_date ON revenue_analytics(date);

-- Step 5: Create additional indexes for better query performance
CREATE INDEX idx_revenue_analytics_order_count ON revenue_analytics(order_count);
CREATE INDEX idx_revenue_analytics_revenue ON revenue_analytics(total_revenue);

-- Step 6: Remove any existing triggers that refresh on order insert
-- (These would block the order insert path)
DROP TRIGGER IF EXISTS refresh_revenue_analytics_on_order ON orders;
DROP FUNCTION IF EXISTS refresh_revenue_analytics();

-- Step 7: Set up pg_cron to refresh every 5 minutes
-- First, unschedule any existing job with the same name
SELECT cron.unschedule('refresh_revenue_analytics');

-- Schedule the refresh job (every 5 minutes)
SELECT cron.schedule(
  'refresh_revenue_analytics',           -- Job name
  '*/5 * * * *',                         -- Every 5 minutes (cron syntax)
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.revenue_analytics;$$
);

-- Step 8: Do an initial refresh to populate the view
REFRESH MATERIALIZED VIEW CONCURRENTLY revenue_analytics;

-- Step 9: Grant permissions
GRANT SELECT ON revenue_analytics TO authenticated;
GRANT SELECT ON revenue_analytics TO anon;

-- ============================================================================
-- Verification queries (optional - comment out after running)
-- ============================================================================

-- Check if pg_cron is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check scheduled cron jobs
SELECT * FROM cron.job WHERE jobname = 'refresh_revenue_analytics';

-- Check if the materialized view has data
SELECT COUNT(*) as row_count FROM revenue_analytics;

-- Check the unique index exists
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'revenue_analytics' 
AND indexname = 'idx_revenue_analytics_date';

-- ============================================================================
-- Notes:
-- ============================================================================
-- - The view refreshes every 5 minutes automatically
-- - Orders are NEVER blocked by analytics refreshes
-- - The UNIQUE INDEX allows CONCURRENT refresh (no table locks)
-- - Analytics data may be up to 5 minutes old (acceptable trade-off)
-- - To change refresh frequency, update the cron schedule:
--   - Every minute: '* * * * *'
--   - Every 10 minutes: '*/10 * * * *'
--   - Every hour: '0 * * * *'
-- ============================================================================
