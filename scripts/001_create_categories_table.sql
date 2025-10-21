-- Create categories table
-- This must run BEFORE 002_create_products_table.sql

CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add slug column to existing table if it doesn't exist
ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Update existing categories with slug values
UPDATE categories SET slug = 'suedfruechtе' WHERE name = 'Südfrüchte' AND slug IS NULL;
UPDATE categories SET slug = 'trockenfruechte' WHERE name = 'Trockenfrüchte' AND slug IS NULL;
UPDATE categories SET slug = 'olivenoel' WHERE name = 'Olivenöl' AND slug IS NULL;
UPDATE categories SET slug = 'suesse-spezialitaeten' WHERE name = 'Süße Spezialitäten' AND slug IS NULL;
UPDATE categories SET slug = 'geschenkkisten' WHERE name = 'Geschenkkisten' AND slug IS NULL;

-- Make slug NOT NULL after populating existing rows
ALTER TABLE categories ALTER COLUMN slug SET NOT NULL;

-- Insert default categories (only if they don't exist)
INSERT INTO categories (name, slug, description, display_order) VALUES
  ('Südfrüchte', 'suedfruechtе', 'Frische Zitrusfrüchte aus Sizilien', 1),
  ('Trockenfrüchte', 'trockenfruechte', 'Hochwertige getrocknete Früchte und Nüsse', 2),
  ('Olivenöl', 'olivenoel', 'Natives Olivenöl Extra aus Sizilien', 3),
  ('Süße Spezialitäten', 'suesse-spezialitaeten', 'Süßigkeiten und Konfekt', 4),
  ('Geschenkkisten', 'geschenkkisten', 'Zusammengestellte Geschenkboxen', 5)
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Public read access for active categories" ON categories;
CREATE POLICY "Public read access for active categories"
  ON categories FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Authenticated users can manage categories" ON categories;
CREATE POLICY "Authenticated users can manage categories"
  ON categories FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Create index
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
