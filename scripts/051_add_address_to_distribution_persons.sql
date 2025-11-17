-- =====================================================
-- ADD ADDRESS FIELDS TO DISTRIBUTION PERSONS
-- =====================================================

ALTER TABLE distribution_persons 
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Deutschland';

-- Create index for city search
CREATE INDEX IF NOT EXISTS idx_distribution_persons_city ON distribution_persons(city);

COMMENT ON COLUMN distribution_persons.street IS 'Street address of the distribution person';
COMMENT ON COLUMN distribution_persons.postal_code IS 'Postal code of the distribution person';
COMMENT ON COLUMN distribution_persons.city IS 'City of the distribution person';
COMMENT ON COLUMN distribution_persons.country IS 'Country of the distribution person';
