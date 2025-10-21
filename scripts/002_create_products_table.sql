-- Create Products Table with improved structure
-- This script creates the products table with normalized categories, better constraints, and full-text search

CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  description TEXT,
  image_url TEXT,
  unit TEXT NOT NULL,
  origin TEXT,
  weight_kg NUMERIC(10, 3) CHECK (weight_kg IS NULL OR weight_kg >= 0),
  min_stock INTEGER DEFAULT 0 CHECK (min_stock >= 0),
  is_active BOOLEAN DEFAULT true,
  
  -- Removed is_seasonal, requires_delivery_schedule, next_delivery_date
  -- These are now computed via products_with_delivery_info view
  
  -- New columns for better product management
  sku TEXT UNIQUE,
  ean13 TEXT,
  attributes JSONB DEFAULT '{}'::jsonb,
  search_tsv TSVECTOR,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate products with same name and unit
  UNIQUE(name, unit)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_ean13 ON products(ean13) WHERE ean13 IS NOT NULL;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN(search_tsv);

-- JSONB attributes index for flexible querying
CREATE INDEX IF NOT EXISTS idx_products_attributes ON products USING GIN(attributes);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- RLS Policies - More granular control
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
DROP POLICY IF EXISTS "Authenticated users can manage products" ON products;

-- Public can only read active products
CREATE POLICY "Public read access for active products"
  ON products FOR SELECT
  USING (is_active = true);

-- Authenticated users can insert products
CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update products
CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can delete products
CREATE POLICY "Authenticated users can delete products"
  ON products FOR DELETE
  USING (auth.role() = 'authenticated');

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update full-text search vector
CREATE OR REPLACE FUNCTION update_products_search_tsv()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_tsv := 
    setweight(to_tsvector('german', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('german', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('german', COALESCE(NEW.origin, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_products_search_tsv_trigger ON products;
CREATE TRIGGER update_products_search_tsv_trigger
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_search_tsv();
