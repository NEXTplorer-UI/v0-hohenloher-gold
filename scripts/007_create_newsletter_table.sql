-- Create newsletter subscribers table with double opt-in and GDPR compliance
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  email_normalized VARCHAR(255) GENERATED ALWAYS AS (LOWER(TRIM(email))) STORED UNIQUE,
  
  -- Double Opt-In
  confirmed_at TIMESTAMP WITH TIME ZONE,
  confirm_token VARCHAR(64) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  
  -- Tracking & GDPR
  source VARCHAR(100) DEFAULT 'website',
  consent_ip INET,
  user_agent TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT confirmed_or_pending CHECK (
    (confirmed_at IS NULL AND is_active = false) OR 
    (confirmed_at IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_newsletter_email_normalized ON newsletter_subscribers(email_normalized);
CREATE INDEX IF NOT EXISTS idx_newsletter_confirmed ON newsletter_subscribers(confirmed_at) WHERE confirmed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_newsletter_active ON newsletter_subscribers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_newsletter_token ON newsletter_subscribers(confirm_token);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_newsletter_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER newsletter_updated_at
  BEFORE UPDATE ON newsletter_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION update_newsletter_updated_at();

-- Trigger for unsubscribed_at
CREATE OR REPLACE FUNCTION set_newsletter_unsubscribed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = false AND OLD.is_active = true THEN
    NEW.unsubscribed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER newsletter_unsubscribed_at
  BEFORE UPDATE ON newsletter_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION set_newsletter_unsubscribed_at();

-- RLS Policies
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Public can insert (signup)
CREATE POLICY "Anyone can subscribe to newsletter" ON newsletter_subscribers
  FOR INSERT 
  WITH CHECK (true);

-- Only authenticated users (admins) can read
CREATE POLICY "Only authenticated users can read subscribers" ON newsletter_subscribers
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Only authenticated users (admins) can update
CREATE POLICY "Only authenticated users can update subscribers" ON newsletter_subscribers
  FOR UPDATE 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- RPC Functions for public access (bypassing RLS)

-- Confirm subscription with token
CREATE OR REPLACE FUNCTION confirm_subscription(token TEXT)
RETURNS JSON AS $$
DECLARE
  subscriber_record RECORD;
BEGIN
  -- Find subscriber by token
  SELECT * INTO subscriber_record
  FROM newsletter_subscribers
  WHERE confirm_token = token
  AND confirmed_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or already confirmed token'
    );
  END IF;
  
  -- Confirm subscription
  UPDATE newsletter_subscribers
  SET 
    confirmed_at = NOW(),
    is_active = true,
    updated_at = NOW()
  WHERE id = subscriber_record.id;
  
  RETURN json_build_object(
    'success', true,
    'email', subscriber_record.email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Unsubscribe with token
CREATE OR REPLACE FUNCTION unsubscribe_with_token(token TEXT)
RETURNS JSON AS $$
DECLARE
  subscriber_record RECORD;
BEGIN
  -- Find subscriber by token
  SELECT * INTO subscriber_record
  FROM newsletter_subscribers
  WHERE confirm_token = token;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid token'
    );
  END IF;
  
  -- Unsubscribe
  UPDATE newsletter_subscribers
  SET 
    is_active = false,
    updated_at = NOW()
  WHERE id = subscriber_record.id;
  
  RETURN json_build_object(
    'success', true,
    'email', subscriber_record.email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
