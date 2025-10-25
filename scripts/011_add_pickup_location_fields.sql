-- Add missing fields to pickup_locations table
-- email, pickup_hours_start, pickup_hours_end, notes

ALTER TABLE pickup_locations
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS pickup_hours_start TEXT,
ADD COLUMN IF NOT EXISTS pickup_hours_end TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN pickup_locations.email IS 'Contact email for the pickup location';
COMMENT ON COLUMN pickup_locations.pickup_hours_start IS 'Pickup start time in format HH:MM';
COMMENT ON COLUMN pickup_locations.pickup_hours_end IS 'Pickup end time in format HH:MM';
COMMENT ON COLUMN pickup_locations.notes IS 'Additional notes or instructions for the pickup location';

-- Update the central warehouse with the correct data
UPDATE pickup_locations
SET 
  email = 'kontakt@suedfruechte-hohenlohe.de',
  pickup_hours_start = NULL,
  pickup_hours_end = NULL,
  notes = 'Das Lager befindet sich auf der Rückseite des Gebäudes. Abholzeiten nach telefonischer Vereinbarung.'
WHERE name = 'Zentrallager Hohenloher Gold';
