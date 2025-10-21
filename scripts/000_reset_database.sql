-- ⚠️⚠️⚠️ DANGER: This script will DELETE ALL DATA in the database! ⚠️⚠️⚠️
-- 
-- This script is ACTIVE and will execute immediately!
-- After running, COMMENT OUT all DROP statements to prevent accidental re-runs!
--
-- This script should ONLY be used in development environments!
-- NEVER run this in production!

SET client_min_messages = WARNING;

-- ============================================
-- DROP ALL TABLES (in correct order due to foreign keys)
-- ============================================

--DROP TABLE IF EXISTS delivery_schedule_products CASCADE;
--DROP TABLE IF EXISTS delivery_schedules CASCADE;
--DROP TABLE IF EXISTS order_items CASCADE;
--DROP TABLE IF EXISTS orders CASCADE;
--DROP TABLE IF EXISTS products CASCADE;
--DROP TABLE IF EXISTS categories CASCADE;
--DROP TABLE IF EXISTS customers CASCADE;
--DROP TABLE IF EXISTS admin_users CASCADE;

-- ============================================
-- DROP ALL FUNCTIONS
-- ============================================

--DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================
-- CONFIRMATION MESSAGE
-- ============================================

SELECT '✅ Database has been completely reset. All tables and data have been deleted.' AS status;

-- ============================================
-- NEXT STEPS AFTER RESET:
-- ============================================
-- 1. Comment out all DROP statements above (add -- before each line)
-- 2. Run all setup scripts in order:
--    - 001_create_crm_tables.sql
--    - 001_create_categories_table.sql
--    - 002_create_products_table.sql
--    - 003_create_admin_users.sql
--    - 007_create_delivery_schedules.sql
--    - seed-products.sql
