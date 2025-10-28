-- Create newsletter_drafts table for saving draft newsletters
CREATE TABLE IF NOT EXISTS newsletter_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  attachment JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_newsletter_drafts_created_by ON newsletter_drafts(created_by);
CREATE INDEX IF NOT EXISTS idx_newsletter_drafts_created_at ON newsletter_drafts(created_at DESC);

-- Enable RLS
ALTER TABLE newsletter_drafts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own drafts
CREATE POLICY "Users can view their own drafts"
  ON newsletter_drafts
  FOR SELECT
  USING (auth.uid() = created_by);

-- Policy: Users can create their own drafts
CREATE POLICY "Users can create their own drafts"
  ON newsletter_drafts
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own drafts
CREATE POLICY "Users can update their own drafts"
  ON newsletter_drafts
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Policy: Users can delete their own drafts
CREATE POLICY "Users can delete their own drafts"
  ON newsletter_drafts
  FOR DELETE
  USING (auth.uid() = created_by);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_newsletter_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER newsletter_drafts_updated_at
  BEFORE UPDATE ON newsletter_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_newsletter_drafts_updated_at();
