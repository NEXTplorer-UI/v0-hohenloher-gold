-- Add is_active field to location_persons table to track if person is active in tours
ALTER TABLE location_persons
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN location_persons.is_active IS 'Indicates if this person is currently active in tours for this location';
