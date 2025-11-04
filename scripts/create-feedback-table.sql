-- Create customer_feedback table for feedback and bug reports
CREATE TABLE IF NOT EXISTS customer_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('feedback', 'bug')),
  subject text NOT NULL,
  email text,
  message text NOT NULL,
  affected_page text,
  error_text text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'answered', 'closed')),
  admin_response text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_feedback_status ON customer_feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON customer_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON customer_feedback(user_id);

-- Enable RLS
ALTER TABLE customer_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own feedback
CREATE POLICY "Users can view own feedback"
  ON customer_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Anyone can insert feedback (even anonymous users)
CREATE POLICY "Anyone can submit feedback"
  ON customer_feedback
  FOR INSERT
  WITH CHECK (true);

-- Policy: Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
  ON customer_feedback
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
