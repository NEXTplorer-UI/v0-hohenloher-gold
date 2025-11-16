-- Fix products table RLS policies to use profiles.role instead of non-existent is_admin

-- Drop incorrect admin policies that may use is_admin
DROP POLICY IF EXISTS "Admins can view all products" ON products;
DROP POLICY IF EXISTS "Admins can manage products" ON products;

-- Create correct admin policies using profiles.role
CREATE POLICY "Admins can view all products"
  ON products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add comment for documentation
COMMENT ON POLICY "Admins can view all products" ON products IS 'Allows users with admin role to view all products including inactive ones';
COMMENT ON POLICY "Admins can manage products" ON products IS 'Allows users with admin role to create, update, and delete products';
