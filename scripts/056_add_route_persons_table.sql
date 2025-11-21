-- Create route_persons table to track which distribution persons are active in a specific tour
-- This is separate from location_persons which defines who CAN work at a location
CREATE TABLE IF NOT EXISTS route_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES delivery_routes(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES distribution_persons(id) ON DELETE CASCADE,
  pickup_location_id UUID NOT NULL REFERENCES pickup_locations(id) ON DELETE CASCADE,
  stop_order INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(route_id, person_id, pickup_location_id)
);

-- Enable RLS
ALTER TABLE route_persons ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin full access route_persons" ON route_persons
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Public read access
CREATE POLICY "Public read route_persons" ON route_persons
  FOR SELECT
  USING (true);

-- Add index for performance
CREATE INDEX idx_route_persons_route_id ON route_persons(route_id);
CREATE INDEX idx_route_persons_person_id ON route_persons(person_id);
CREATE INDEX idx_route_persons_location_id ON route_persons(pickup_location_id);
