-- Add version field for optimistic locking to checkouts table
ALTER TABLE checkouts 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_checkouts_version ON checkouts(id, version);

-- Create function to auto-increment version on update
CREATE OR REPLACE FUNCTION increment_checkout_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-increment version
DROP TRIGGER IF EXISTS trigger_increment_checkout_version ON checkouts;
CREATE TRIGGER trigger_increment_checkout_version
  BEFORE UPDATE ON checkouts
  FOR EACH ROW
  EXECUTE FUNCTION increment_checkout_version();

COMMENT ON COLUMN checkouts.version IS 'Version number for optimistic locking to prevent race conditions';
