-- Add hellocash_article_id column to products table for HelloCash integration

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS hellocash_article_id INTEGER;

COMMENT ON COLUMN products.hellocash_article_id IS 'HelloCash API article ID for synchronization';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_hellocash_article_id ON products(hellocash_article_id);
