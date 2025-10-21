-- Create delivery schedules table for managing fresh fruit delivery dates
-- Changed id from UUID to BIGSERIAL for consistency with products table
CREATE TABLE IF NOT EXISTS delivery_schedules (
  id BIGSERIAL PRIMARY KEY,
  delivery_date DATE NOT NULL,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'confirmed', 'completed', 'cancelled')),
  order_deadline DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Removed fruit_types array - will be replaced by junction table

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_delivery_schedules_date ON delivery_schedules(delivery_date);
CREATE INDEX IF NOT EXISTS idx_delivery_schedules_status ON delivery_schedules(status);

-- Create junction table to link products with delivery schedules (many-to-many)
CREATE TABLE IF NOT EXISTS delivery_schedule_products (
  delivery_schedule_id BIGINT NOT NULL REFERENCES delivery_schedules(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (delivery_schedule_id, product_id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for the junction table
CREATE INDEX IF NOT EXISTS idx_dsp_schedule ON delivery_schedule_products(delivery_schedule_id);
CREATE INDEX IF NOT EXISTS idx_dsp_product ON delivery_schedule_products(product_id);

-- Removed ALTER TABLE statements for products
-- is_seasonal, next_delivery_date are now computed via materialized view

-- Changed delivery_schedule_id from UUID to BIGINT
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS expected_delivery_date DATE,
ADD COLUMN IF NOT EXISTS delivery_schedule_id BIGINT REFERENCES delivery_schedules(id);

-- Create index for order_items delivery lookups
CREATE INDEX IF NOT EXISTS idx_order_items_delivery ON order_items(delivery_schedule_id);

-- Create materialized view for products with delivery information
-- This replaces the redundant columns in products table
DROP MATERIALIZED VIEW IF EXISTS products_with_delivery_info CASCADE;

CREATE MATERIALIZED VIEW products_with_delivery_info AS
SELECT 
  p.*,
  -- Is the product seasonal? (linked to any delivery schedule)
  EXISTS(
    SELECT 1 FROM delivery_schedule_products dsp 
    WHERE dsp.product_id = p.id
  ) as is_seasonal,
  -- Next delivery date (earliest future delivery)
  (
    SELECT MIN(ds.delivery_date) 
    FROM delivery_schedules ds
    JOIN delivery_schedule_products dsp ON ds.id = dsp.delivery_schedule_id
    WHERE dsp.product_id = p.id 
    AND ds.delivery_date >= CURRENT_DATE
    AND ds.status IN ('planned', 'confirmed')
  ) as next_delivery_date
FROM products p;

-- Create indexes on the materialized view for better query performance
CREATE UNIQUE INDEX idx_products_delivery_info_id ON products_with_delivery_info(id);
CREATE INDEX idx_products_delivery_info_seasonal ON products_with_delivery_info(is_seasonal);
CREATE INDEX idx_products_delivery_info_next_date ON products_with_delivery_info(next_delivery_date);
CREATE INDEX idx_products_delivery_info_active ON products_with_delivery_info(is_active);

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_products_delivery_info()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY products_with_delivery_info;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-refresh the view when data changes
DROP TRIGGER IF EXISTS refresh_products_delivery_info_on_schedule ON delivery_schedules;
CREATE TRIGGER refresh_products_delivery_info_on_schedule
  AFTER INSERT OR UPDATE OR DELETE ON delivery_schedules
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_products_delivery_info();

DROP TRIGGER IF EXISTS refresh_products_delivery_info_on_mapping ON delivery_schedule_products;
CREATE TRIGGER refresh_products_delivery_info_on_mapping
  AFTER INSERT OR UPDATE OR DELETE ON delivery_schedule_products
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_products_delivery_info();

DROP TRIGGER IF EXISTS refresh_products_delivery_info_on_products ON products;
CREATE TRIGGER refresh_products_delivery_info_on_products
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_products_delivery_info();

-- Enable Row Level Security
ALTER TABLE delivery_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_schedule_products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (public read, authenticated write)
CREATE POLICY "delivery_schedules_select_all" ON delivery_schedules FOR SELECT USING (true);
CREATE POLICY "delivery_schedules_insert_admin" ON delivery_schedules FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "delivery_schedules_update_admin" ON delivery_schedules FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "delivery_schedules_delete_admin" ON delivery_schedules FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "dsp_select_all" ON delivery_schedule_products FOR SELECT USING (true);
CREATE POLICY "dsp_insert_admin" ON delivery_schedule_products FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "dsp_update_admin" ON delivery_schedule_products FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "dsp_delete_admin" ON delivery_schedule_products FOR DELETE USING (auth.role() = 'authenticated');
