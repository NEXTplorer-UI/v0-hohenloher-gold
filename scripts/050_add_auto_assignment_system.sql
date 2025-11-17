-- Add preferred distribution person to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS preferred_distribution_person_id UUID 
REFERENCES distribution_persons(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_customers_preferred_person 
ON customers(preferred_distribution_person_id);

-- Auto-assignment function with intelligent logic
CREATE OR REPLACE FUNCTION auto_assign_distribution_to_order()
RETURNS TRIGGER AS $$
DECLARE
  person_count INTEGER;
  person_id UUID;
  customer_preferred_person UUID;
  route_id_from_location UUID;
BEGIN
  -- 1. Check if customer has a preferred distribution person
  SELECT preferred_distribution_person_id INTO customer_preferred_person
  FROM customers
  WHERE id = NEW.customer_id;
  
  -- 2. If customer has preferred person AND person is still active
  IF customer_preferred_person IS NOT NULL THEN
    -- Check if person is still active
    IF EXISTS (
      SELECT 1 FROM distribution_persons 
      WHERE id = customer_preferred_person AND is_active = true
    ) THEN
      NEW.distribution_person_id := customer_preferred_person;
      RAISE NOTICE '[Auto-Assignment] Customer has preferred person: %', customer_preferred_person;
    ELSE
      RAISE NOTICE '[Auto-Assignment] Preferred person is inactive, clearing preference';
      -- Clear inactive preferred person
      UPDATE customers
      SET preferred_distribution_person_id = NULL
      WHERE id = NEW.customer_id;
    END IF;
  END IF;
  
  -- 3. If still no assignment: Check pickup location
  IF NEW.distribution_person_id IS NULL THEN
    -- How many ACTIVE distribution persons does this pickup location have?
    SELECT COUNT(*) INTO person_count
    FROM location_persons lp
    JOIN distribution_persons dp ON lp.person_id = dp.id
    WHERE lp.pickup_location_id = NEW.pickup_location_id
      AND dp.is_active = true;
    
    RAISE NOTICE '[Auto-Assignment] Pickup location has % distribution persons', person_count;
    
    -- ONLY if exactly ONE person: Auto-assign
    IF person_count = 1 THEN
      SELECT lp.person_id INTO person_id
      FROM location_persons lp
      JOIN distribution_persons dp ON lp.person_id = dp.id
      WHERE lp.pickup_location_id = NEW.pickup_location_id
        AND dp.is_active = true
      LIMIT 1;
      
      NEW.distribution_person_id := person_id;
      RAISE NOTICE '[Auto-Assignment] One person found, assigned: %', person_id;
      
      -- Save as preferred person for customer (only if not already set)
      UPDATE customers
      SET preferred_distribution_person_id = person_id
      WHERE id = NEW.customer_id
        AND preferred_distribution_person_id IS NULL;
      
      RAISE NOTICE '[Auto-Assignment] Saved as preferred person for customer';
    
    -- Multiple persons: NO auto-assignment (leave NULL for manual assignment)
    ELSIF person_count > 1 THEN
      RAISE NOTICE '[Auto-Assignment] Multiple persons → No auto-assignment (admin must assign manually)';
    ELSE
      RAISE NOTICE '[Auto-Assignment] No distribution persons found for this location';
    END IF;
  END IF;
  
  -- 4. Auto-assign route based on pickup location
  SELECT rl.route_id INTO route_id_from_location
  FROM route_locations rl
  WHERE rl.pickup_location_id = NEW.pickup_location_id
  LIMIT 1;
  
  IF route_id_from_location IS NOT NULL THEN
    NEW.route_id := route_id_from_location;
    RAISE NOTICE '[Auto-Assignment] Route assigned: %', route_id_from_location;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_assign_distribution ON orders;

-- Create trigger
CREATE TRIGGER trigger_auto_assign_distribution
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_distribution_to_order();

-- Add comment for documentation
COMMENT ON FUNCTION auto_assign_distribution_to_order() IS 
'Auto-assigns distribution person and route to new orders based on:
1. Customer preferred person (if set and active)
2. Single distribution person at pickup location (auto-save as preferred)
3. Multiple persons = NULL (requires manual assignment)
4. Route from pickup location mapping';
