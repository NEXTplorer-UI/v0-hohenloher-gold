-- Create admin notifications table for error tracking
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'order_creation_failed', 'email_failed', 'payment_error', etc.
  severity TEXT NOT NULL DEFAULT 'error', -- 'info', 'warning', 'error', 'critical'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB, -- Additional context (customer email, order number, error details, etc.)
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);

-- Create failed emails queue table
CREATE TABLE IF NOT EXISTS pending_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  email_to TEXT NOT NULL,
  email_type TEXT NOT NULL, -- 'order_confirmation', 'pickup_reminder', etc.
  email_data JSONB NOT NULL, -- All data needed to send the email
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ
);

-- Create index for processing queue
CREATE INDEX IF NOT EXISTS idx_pending_emails_scheduled ON pending_emails(scheduled_for) WHERE sent_at IS NULL AND failed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pending_emails_order_id ON pending_emails(order_id);

-- Enable RLS
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_emails ENABLE ROW LEVEL SECURITY;

-- Fixed RLS policies to use profiles table with auth.uid() instead of customers table
-- RLS Policies (admin only)
CREATE POLICY "Admin can view all notifications" ON admin_notifications
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "System can insert notifications" ON admin_notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can update notifications" ON admin_notifications
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "System can manage pending emails" ON pending_emails
  FOR ALL USING (true);
