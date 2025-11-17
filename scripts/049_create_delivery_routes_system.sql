-- =====================================================
-- DELIVERY ROUTES & DISTRIBUTION PERSONS SYSTEM
-- =====================================================
-- This system enables tour planning and distribution person management
-- for organizing deliveries to pickup locations

-- =====================================================
-- 1. DELIVERY ROUTES (Tours/Regions)
-- =====================================================
CREATE TABLE IF NOT EXISTS delivery_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- e.g. "Tour Nord", "Region Hohenlohe"
  region TEXT,                           -- e.g. "Nord", "Süd", "Ost", "West"
  color TEXT DEFAULT '#3B82F6',          -- Hex color for UI display
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,       -- Order for sorting in UI
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active routes
CREATE INDEX IF NOT EXISTS idx_delivery_routes_active ON delivery_routes(is_active);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_display_order ON delivery_routes(display_order);

-- =====================================================
-- 2. ROUTE LOCATIONS (m:n - Routes ↔ Pickup Locations)
-- =====================================================
CREATE TABLE IF NOT EXISTS route_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES delivery_routes(id) ON DELETE CASCADE,
  pickup_location_id UUID NOT NULL REFERENCES pickup_locations(id) ON DELETE CASCADE,
  stop_order INTEGER NOT NULL DEFAULT 0, -- Order of stops on the route
  estimated_duration_minutes INTEGER,     -- Optional: time at this stop
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(route_id, pickup_location_id)   -- Each location only once per route
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_route_locations_route ON route_locations(route_id);
CREATE INDEX IF NOT EXISTS idx_route_locations_pickup ON route_locations(pickup_location_id);
CREATE INDEX IF NOT EXISTS idx_route_locations_order ON route_locations(route_id, stop_order);

-- =====================================================
-- 3. DISTRIBUTION PERSONS (Verteilpersonen)
-- =====================================================
CREATE TABLE IF NOT EXISTS distribution_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active persons
CREATE INDEX IF NOT EXISTS idx_distribution_persons_active ON distribution_persons(is_active);
CREATE INDEX IF NOT EXISTS idx_distribution_persons_name ON distribution_persons(name);

-- =====================================================
-- 4. LOCATION PERSONS (m:n - Pickup Locations ↔ Distribution Persons)
-- =====================================================
CREATE TABLE IF NOT EXISTS location_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_location_id UUID NOT NULL REFERENCES pickup_locations(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES distribution_persons(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,      -- Primary contact for this location
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pickup_location_id, person_id)  -- Each person only once per location
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_location_persons_location ON location_persons(pickup_location_id);
CREATE INDEX IF NOT EXISTS idx_location_persons_person ON location_persons(person_id);
CREATE INDEX IF NOT EXISTS idx_location_persons_primary ON location_persons(pickup_location_id, is_primary);

-- =====================================================
-- 5. EXTEND ORDERS TABLE
-- =====================================================
-- Add route and distribution person assignments to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES delivery_routes(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS distribution_person_id UUID REFERENCES distribution_persons(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS loading_sequence INTEGER;  -- Order for loading the vehicle

-- Indexes for order assignments
CREATE INDEX IF NOT EXISTS idx_orders_route ON orders(route_id);
CREATE INDEX IF NOT EXISTS idx_orders_distribution_person ON orders(distribution_person_id);
CREATE INDEX IF NOT EXISTS idx_orders_route_loading ON orders(route_id, loading_sequence);

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_persons ENABLE ROW LEVEL SECURITY;

-- Public read access (for customers to see delivery info if needed)
CREATE POLICY "Public read delivery_routes" ON delivery_routes FOR SELECT USING (is_active = true);
CREATE POLICY "Public read route_locations" ON route_locations FOR SELECT USING (true);
CREATE POLICY "Public read distribution_persons" ON distribution_persons FOR SELECT USING (is_active = true);
CREATE POLICY "Public read location_persons" ON location_persons FOR SELECT USING (true);

-- Admin full access (using profiles table with role check)
CREATE POLICY "Admin full access delivery_routes" ON delivery_routes FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

CREATE POLICY "Admin full access route_locations" ON route_locations FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

CREATE POLICY "Admin full access distribution_persons" ON distribution_persons FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

CREATE POLICY "Admin full access location_persons" ON location_persons FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- =====================================================
-- 7. HELPER FUNCTION: Get orders by route with details
-- =====================================================
CREATE OR REPLACE FUNCTION get_route_orders_export(
  p_route_id UUID,
  p_pickup_date DATE DEFAULT NULL
)
RETURNS TABLE (
  route_name TEXT,
  route_region TEXT,
  distribution_person_name TEXT,
  pickup_location_name TEXT,
  order_number TEXT,
  customer_name TEXT,
  total_amount DECIMAL,
  loading_sequence INTEGER,
  product_summary TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dr.name as route_name,
    dr.region as route_region,
    dp.name as distribution_person_name,
    pl.name as pickup_location_name,
    o.order_number,
    c.name as customer_name,
    o.total as total_amount,
    o.loading_sequence,
    STRING_AGG(
      oi.product_name || ' (' || oi.quantity || 'x)',
      ', '
    ) as product_summary
  FROM orders o
  JOIN delivery_routes dr ON o.route_id = dr.id
  LEFT JOIN distribution_persons dp ON o.distribution_person_id = dp.id
  JOIN pickup_locations pl ON o.pickup_location_id = pl.id
  JOIN customers c ON o.customer_id = c.id
  LEFT JOIN order_items oi ON oi.order_id = o.id
  WHERE o.route_id = p_route_id
    AND (p_pickup_date IS NULL OR o.pickup_date = p_pickup_date)
  GROUP BY dr.name, dr.region, dp.name, pl.name, o.order_number, c.name, o.total, o.loading_sequence
  ORDER BY o.loading_sequence NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMPLETED: Delivery Routes System
-- =====================================================
-- Next steps:
-- 1. Create Admin UI for route management
-- 2. Create Admin UI for distribution persons
-- 3. Create assignment interfaces for orders
-- 4. Create Excel export functionality
