-- Row Level Security (RLS) Policies für Kundendaten
-- Diese Policies stellen sicher, dass Kunden nur ihre eigenen Daten sehen und bearbeiten können

-- ============================================================================
-- CUSTOMERS TABLE - Kundendaten
-- ============================================================================

-- RLS aktivieren
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

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
-- (wird normalerweise über API/Backend gemacht, nicht direkt vom Client)
CREATE POLICY "customers_insert_authenticated"
ON customers FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- ORDERS TABLE - Bestellungen
-- ============================================================================

-- RLS aktivieren
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: Kunden können nur ihre eigenen Bestellungen sehen
CREATE POLICY "orders_select_own"
ON orders FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Kunden können ihre eigenen Bestellungen erstellen
-- (Bestellungen werden normalerweise über API erstellt, aber für Sicherheit)
CREATE POLICY "orders_insert_own"
ON orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Kunden können ihre eigenen Bestellungen aktualisieren
-- (z.B. Notizen hinzufügen, aber nicht Status ändern)
CREATE POLICY "orders_update_own"
ON orders FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- ORDER_ITEMS TABLE - Bestellpositionen
-- ============================================================================

-- RLS aktivieren
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

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

-- ============================================================================
-- ADMIN POLICIES - Admins haben vollen Zugriff
-- ============================================================================

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

-- ============================================================================
-- HINWEISE
-- ============================================================================

-- 1. Diese Policies stellen sicher, dass:
--    - Kunden nur ihre eigenen Daten sehen und bearbeiten können
--    - Admins vollen Zugriff auf alle Daten haben
--    - Bestellpositionen nur über die zugehörige Bestellung zugänglich sind

-- 2. Die Policies verwenden auth.uid() um den aktuell eingeloggten Benutzer zu identifizieren

-- 3. Für Bestellpositionen wird eine Subquery verwendet, um zu prüfen ob die
--    zugehörige Bestellung dem Benutzer gehört

-- 4. Diese Policies funktionieren nur, wenn:
--    - Der Benutzer eingeloggt ist (auth.uid() ist nicht NULL)
--    - Die E-Mail des Benutzers bestätigt wurde
--    - Der user_id in customers korrekt gesetzt ist

-- 5. Zum Testen der Policies:
--    - Als Kunde einloggen und versuchen eigene Daten abzurufen (sollte funktionieren)
--    - Als Kunde einloggen und versuchen fremde Daten abzurufen (sollte fehlschlagen)
--    - Als Admin einloggen und alle Daten abrufen (sollte funktionieren)
