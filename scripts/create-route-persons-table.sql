-- Create the route_persons table to manage tour-specific person assignments
-- This allows tracking which distribution person handles which pickup location on a specific route

CREATE TABLE IF NOT EXISTS route_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  route_id UUID NOT NULL REFERENCES delivery_routes(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES distribution_persons(id) ON DELETE CASCADE,
  pickup_location_id UUID NOT NULL REFERENCES pickup_locations(id) ON DELETE CASCADE,
  
  -- Route-specific data
  stop_order INTEGER,
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a person can only be assigned once per route-location combination
  UNIQUE(route_id, person_id, pickup_location_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_route_persons_route_id ON route_persons(route_id);
CREATE INDEX IF NOT EXISTS idx_route_persons_person_id ON route_persons(person_id);
CREATE INDEX IF NOT EXISTS idx_route_persons_location_id ON route_persons(pickup_location_id);
CREATE INDEX IF NOT EXISTS idx_route_persons_stop_order ON route_persons(route_id, stop_order);

-- Enable Row Level Security
ALTER TABLE route_persons ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins have full access
CREATE POLICY "Admin full access route_persons"
  ON route_persons
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Public read access (for route planning)
CREATE POLICY "Public read route_persons"
  ON route_persons
  FOR SELECT
  USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_route_persons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER route_persons_updated_at
  BEFORE UPDATE ON route_persons
  FOR EACH ROW
  EXECUTE FUNCTION update_route_persons_updated_at();

-- Add comment
COMMENT ON TABLE route_persons IS 'Manages tour-specific assignments of distribution persons to pickup locations on delivery routes';
