-- Create detailed email send tracking for individual recipients

CREATE TABLE IF NOT EXISTS email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_send_id UUID REFERENCES newsletter_sends(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_sends_newsletter_id ON email_sends(newsletter_send_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_recipient ON email_sends(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON email_sends(status);
CREATE INDEX IF NOT EXISTS idx_email_sends_sent_at ON email_sends(sent_at DESC);

-- Enable RLS
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all email sends
CREATE POLICY "Admins can view all email sends"
  ON email_sends
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: System can insert email sends
CREATE POLICY "System can create email sends"
  ON email_sends
  FOR INSERT
  WITH CHECK (true);

-- Policy: System can update email sends
CREATE POLICY "System can update email sends"
  ON email_sends
  FOR UPDATE
  USING (true);
