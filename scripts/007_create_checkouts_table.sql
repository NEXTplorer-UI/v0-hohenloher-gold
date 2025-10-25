-- Create checkouts table for tracking all checkout attempts
CREATE TABLE IF NOT EXISTS checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Added temp_order_number field for human-readable reference
  temp_order_number TEXT UNIQUE, -- e.g., SH-TEMP-0001, SH-TEMP-0002
  
  -- Status tracking
  status TEXT NOT NULL CHECK (status IN ('initiated', 'pending', 'paid', 'failed', 'cancelled', 'expired')),
  
  -- Payment provider info
  payment_method TEXT NOT NULL, -- 'sumup', 'bank_transfer', 'cash'
  sumup_checkout_id TEXT, -- SumUp checkout ID
  sumup_transaction_id TEXT, -- SumUp transaction ID after payment
  
  -- Customer info (denormalized for tracking even if customer not created yet)
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  
  -- Delivery info
  delivery_date DATE,
  delivery_time_slot TEXT,
  delivery_address JSONB, -- {street, house_number, postal_code, city, country}
  
  -- Order data (stored as JSON until promoted to real order)
  cart_items JSONB NOT NULL, -- Array of {product_id, name, quantity, price, ...}
  total_amount DECIMAL(10,2) NOT NULL,
  notes TEXT,
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- For abandoned checkout tracking (e.g., 24 hours)
  completed_order_id UUID REFERENCES orders(id) ON DELETE SET NULL, -- Link to order if promoted
  
  -- Metadata
  user_agent TEXT,
  ip_address TEXT,
  referrer TEXT
);

-- Indexes for performance
CREATE INDEX idx_checkouts_status ON checkouts(status);
CREATE INDEX idx_checkouts_email ON checkouts(email);
CREATE INDEX idx_checkouts_customer_id ON checkouts(customer_id);
CREATE INDEX idx_checkouts_sumup_checkout_id ON checkouts(sumup_checkout_id);
CREATE INDEX idx_checkouts_created_at ON checkouts(created_at DESC);
CREATE INDEX idx_checkouts_expires_at ON checkouts(expires_at) WHERE status = 'initiated';
-- Added index for temp_order_number lookups
CREATE INDEX idx_checkouts_temp_order_number ON checkouts(temp_order_number);

-- RLS Policies
ALTER TABLE checkouts ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to checkouts"
  ON checkouts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read their own checkouts
CREATE POLICY "Users can read their own checkouts"
  ON checkouts
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_checkouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_checkouts_updated_at
  BEFORE UPDATE ON checkouts
  FOR EACH ROW
  EXECUTE FUNCTION update_checkouts_updated_at();

-- Function to generate sequential temp order numbers
CREATE OR REPLACE FUNCTION generate_temp_order_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  temp_number TEXT;
BEGIN
  -- Get the highest existing number
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(temp_order_number FROM 'SH-TEMP-(\d+)') AS INTEGER
      )
    ), 0
  ) + 1
  INTO next_number
  FROM checkouts
  WHERE temp_order_number LIKE 'SH-TEMP-%';
  
  -- Format as SH-TEMP-NNNN (4 digits, zero-padded)
  temp_number := 'SH-TEMP-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN temp_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate temp_order_number on insert
CREATE OR REPLACE FUNCTION set_temp_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.temp_order_number IS NULL THEN
    NEW.temp_order_number := generate_temp_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_temp_order_number
  BEFORE INSERT ON checkouts
  FOR EACH ROW
  EXECUTE FUNCTION set_temp_order_number();
