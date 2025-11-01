-- Row Level Security (RLS) Policies für Kundendaten
-- Diese Policies stellen sicher, dass Kunden nur ihre eigenen Daten sehen und bearbeiten können
-- Version 2: Mit DROP IF EXISTS für idempotente Ausführung

-- ============================================================================
-- CUSTOMERS TABLE - Kundendaten
-- ============================================================================

-- RLS aktivieren (falls noch nicht aktiviert)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Alte Policies löschen falls vorhanden
DROP POLICY IF EXISTS "customers_select_own" ON customers;
DROP POLICY IF EXISTS "customers_update_own" ON customers;
DROP POLICY IF EXISTS "customers_insert_authenticated" ON customers;
DROP POLICY IF EXISTS "customers_select_admin" ON customers;
DROP POLICY IF EXISTS "customers_update_admin" ON customers;

-- Policy: Kunden können nur ihr eigenes Profil sehen
CREATE POLICY "customers_select_own"
ON customers FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Kunden können nur ihr eigenes Profil aktualisieren
CREATE POLICY "customers_update_own"
ON customers FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Nur authentifizierte Benutzer können Kundenprofile erstellen
CREATE POLICY "customers_insert_authenticated"
ON customers FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Admins können alle Kundendaten sehen
CREATE POLICY "customers_select_admin"
ON customers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy: Admins können alle Kundendaten aktualisieren
CREATE POLICY "customers_update_admin"
ON customers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================================================
-- ORDERS TABLE - Bestellungen
-- ============================================================================

-- RLS aktivieren (falls noch nicht aktiviert)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Alte Policies löschen falls vorhanden
DROP POLICY IF EXISTS "orders_select_own" ON orders;
DROP POLICY IF EXISTS "orders_insert_own" ON orders;
DROP POLICY IF EXISTS "orders_update_own" ON orders;
DROP POLICY IF EXISTS "orders_select_admin" ON orders;
DROP POLICY IF EXISTS "orders_update_admin" ON orders;

-- Policy: Kunden können nur ihre eigenen Bestellungen sehen
CREATE POLICY "orders_select_own"
ON orders FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Kunden können ihre eigenen Bestellungen erstellen
CREATE POLICY "orders_insert_own"
ON orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Kunden können ihre eigenen Bestellungen aktualisieren
CREATE POLICY "orders_update_own"
ON orders FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Admins können alle Bestellungen sehen
CREATE POLICY "orders_select_admin"
ON orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy: Admins können alle Bestellungen aktualisieren
CREATE POLICY "orders_update_admin"
ON orders FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================================================
-- ORDER_ITEMS TABLE - Bestellpositionen
-- ============================================================================

-- RLS aktivieren (falls noch nicht aktiviert)
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Alte Policies löschen falls vorhanden
DROP POLICY IF EXISTS "order_items_select_own" ON order_items;
DROP POLICY IF EXISTS "order_items_insert_own" ON order_items;
DROP POLICY IF EXISTS "order_items_select_admin" ON order_items;

-- Policy: Kunden können nur Positionen ihrer eigenen Bestellungen sehen
CREATE POLICY "order_items_select_own"
ON order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);

-- Policy: Kunden können Positionen zu ihren eigenen Bestellungen hinzufügen
CREATE POLICY "order_items_insert_own"
ON order_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);

-- Policy: Admins können alle Bestellpositionen sehen
CREATE POLICY "order_items_select_admin"
ON order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
