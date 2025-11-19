-- Add default distribution person and pickup location columns to customers table
-- This allows storing a customer's preferred distribution person and pickup location
-- for automatic assignment in future orders

ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS default_distribution_person_id UUID REFERENCES distribution_persons(id),
ADD COLUMN IF NOT EXISTS default_pickup_location_id UUID REFERENCES pickup_locations(id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customers_default_distribution_person 
ON customers(default_distribution_person_id);

CREATE INDEX IF NOT EXISTS idx_customers_default_pickup_location 
ON customers(default_pickup_location_id);

COMMENT ON COLUMN customers.default_distribution_person_id IS 'Preferred distribution person for this customer, used for automatic assignment';
COMMENT ON COLUMN customers.default_pickup_location_id IS 'Preferred pickup location for this customer, used for automatic assignment';
