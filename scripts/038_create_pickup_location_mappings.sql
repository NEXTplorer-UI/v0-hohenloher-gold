-- Create pickup_location_mappings table for normalizing pickup locations
-- This allows mapping of different spelling variants to canonical locations

CREATE TABLE IF NOT EXISTS pickup_location_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant text NOT NULL UNIQUE, -- The variant text (e.g. "HN", "heilbronn", "Heilbronn Stadt")
  canonical_location_id uuid NOT NULL REFERENCES pickup_locations(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_pickup_location_mappings_variant ON pickup_location_mappings(variant);
CREATE INDEX IF NOT EXISTS idx_pickup_location_mappings_canonical ON pickup_location_mappings(canonical_location_id);

-- Enable RLS
ALTER TABLE pickup_location_mappings ENABLE ROW LEVEL SECURITY;

-- Admin can manage mappings
CREATE POLICY "Admins can manage pickup location mappings"
  ON pickup_location_mappings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Public can read mappings (for checkout normalization)
CREATE POLICY "Anyone can view pickup location mappings"
  ON pickup_location_mappings
  FOR SELECT
  TO anon, authenticated
  USING (true);

COMMENT ON TABLE pickup_location_mappings IS 'Maps different spelling variants of pickup locations to canonical locations';
COMMENT ON COLUMN pickup_location_mappings.variant IS 'The variant text as entered by customers (case-insensitive)';
COMMENT ON COLUMN pickup_location_mappings.canonical_location_id IS 'The canonical pickup location this variant maps to';
