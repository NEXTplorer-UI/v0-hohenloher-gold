-- Add tracking fields to email_sends table for Resend webhook integration

ALTER TABLE email_sends
ADD COLUMN IF NOT EXISTS resend_email_id TEXT,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS complained_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_clicked_url TEXT;

-- Create index for faster webhook lookups
CREATE INDEX IF NOT EXISTS idx_email_sends_resend_id ON email_sends(resend_email_id);

-- Add comment
COMMENT ON COLUMN email_sends.resend_email_id IS 'Resend email ID for tracking via webhooks';
COMMENT ON COLUMN email_sends.delivered_at IS 'When email was delivered to recipient mail server';
COMMENT ON COLUMN email_sends.opened_at IS 'When recipient first opened the email';
COMMENT ON COLUMN email_sends.clicked_at IS 'When recipient first clicked a link';
COMMENT ON COLUMN email_sends.bounced_at IS 'When email bounced';
COMMENT ON COLUMN email_sends.complained_at IS 'When recipient marked as spam';
COMMENT ON COLUMN email_sends.click_count IS 'Total number of link clicks';
COMMENT ON COLUMN email_sends.last_clicked_url IS 'Last URL clicked by recipient';
