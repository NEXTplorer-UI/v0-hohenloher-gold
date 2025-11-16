-- Add hellocash_category_id to categories table instead of products table
-- This allows mapping local categories to HelloCash categories once per category
-- instead of per product

ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS hellocash_category_id INTEGER;

COMMENT ON COLUMN categories.hellocash_category_id IS 'Maps this category to a HelloCash category ID for synchronization';
