-- Add hellocash_stock_managed field to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS hellocash_stock_managed BOOLEAN DEFAULT false;

-- Comment explaining the field
COMMENT ON COLUMN products.hellocash_stock_managed IS 'If true, HelloCash will manage stock (article_stock_status=0). If false, HelloCash will not change stock when selling (article_stock_status=2)';
