-- ============================================================================
-- PHASE 1: Gramm-basiertes Inventarsystem - Datenbank-Schema
-- ============================================================================
-- Datum: 2025-01-XX
-- Zweck: Ermöglicht gemeinsamen Lagerbestand für verschiedene Gebindegrößen
-- 
-- BEISPIEL: 
-- - "Olivenöl 1L", "Olivenöl 3L", "Olivenöl 5L" ziehen alle vom gleichen
--   physischen Bestand ab (gespeichert in Gramm/Milliliter)
--
-- NÄCHSTE PHASE: Phase 2 - Trigger für automatischen Abzug bei Bestellungen
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. NEUE TABELLE: inventory_raw_stock
-- ----------------------------------------------------------------------------
-- Speichert den physischen Rohwaren-Bestand in Gramm/Milliliter
-- Ein Eintrag = Eine Rohware (z.B. "Olivenöl Extra Vergine")
-- Mehrere Produkte können darauf verweisen (1L, 3L, 5L Flaschen)

CREATE TABLE IF NOT EXISTS inventory_raw_stock (
  id BIGSERIAL PRIMARY KEY,
  
  -- Name der Rohware (muss eindeutig sein)
  product_group TEXT NOT NULL UNIQUE,
  
  -- Aktueller Bestand in Gramm (für Öl: 1ml = 1g)
  stock_grams INTEGER NOT NULL DEFAULT 0 CHECK (stock_grams >= 0),
  
  -- Mindestbestand für Warnungen (in Gramm)
  min_stock_grams INTEGER DEFAULT 2000,
  
  -- Art der Einheit: 'weight' (kg/g) oder 'volume' (L/ml)
  unit_type TEXT NOT NULL CHECK (unit_type IN ('weight', 'volume')),
  
  -- Zeitstempel
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index für schnelle Suche nach product_group
CREATE INDEX idx_inventory_raw_stock_product_group 
  ON inventory_raw_stock(product_group);

-- Kommentare für Dokumentation
COMMENT ON TABLE inventory_raw_stock IS 
  'Phase 1: Rohwaren-Bestand in Gramm. Mehrere Produkte können vom gleichen Bestand abziehen.';
COMMENT ON COLUMN inventory_raw_stock.stock_grams IS 
  'Bestand in Gramm (für Öl: 1ml = 1g Umrechnung)';
COMMENT ON COLUMN inventory_raw_stock.unit_type IS 
  'weight = Gewicht (kg/g), volume = Volumen (L/ml)';

-- ----------------------------------------------------------------------------
-- 2. ERWEITERE TABELLE: products
-- ----------------------------------------------------------------------------
-- Fügt Verknüpfung zur Rohware hinzu

-- Spalte: Verknüpfung zur Rohware (NULL = alte Logik)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS inventory_raw_id BIGINT REFERENCES inventory_raw_stock(id);

-- Spalte: Flag ob Produkt gramm-basiert verwaltet wird
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_raw_stock_managed BOOLEAN DEFAULT FALSE;

-- Index für Performance bei JOINs
CREATE INDEX IF NOT EXISTS idx_products_inventory_raw_id 
  ON products(inventory_raw_id) WHERE inventory_raw_id IS NOT NULL;

-- Kommentare
COMMENT ON COLUMN products.weight_kg IS 
  'Gewicht in kg (für Öl: 1L = 1kg). Wird in Phase 2 für Gramm-Berechnung verwendet.';
COMMENT ON COLUMN products.inventory_raw_id IS 
  'Phase 1: Verknüpfung zur Rohware. NULL = alte Stückzahl-basierte Logik.';
COMMENT ON COLUMN products.is_raw_stock_managed IS 
  'Phase 1: TRUE = Bestand wird über inventory_raw_stock verwaltet (gramm-basiert).';

-- ----------------------------------------------------------------------------
-- 3. ERWEITERE TABELLE: inventory_movements
-- ----------------------------------------------------------------------------
-- Fügt Unterstützung für Gramm-basierte Movements hinzu

-- Spalte: Verknüpfung zur Rohware (alternativ zu product_id)
ALTER TABLE inventory_movements 
ADD COLUMN IF NOT EXISTS inventory_raw_id BIGINT REFERENCES inventory_raw_stock(id);

-- Spalte: Menge in Gramm (nur für gramm-basierte Movements)
ALTER TABLE inventory_movements 
ADD COLUMN IF NOT EXISTS qty_grams INTEGER;

-- Spalte: Typ des Movements
ALTER TABLE inventory_movements 
ADD COLUMN IF NOT EXISTS movement_type TEXT DEFAULT 'product' 
  CHECK (movement_type IN ('product', 'raw'));

-- Index für Performance
CREATE INDEX IF NOT EXISTS idx_inventory_movements_raw_id 
  ON inventory_movements(inventory_raw_id) WHERE inventory_raw_id IS NOT NULL;

-- Kommentare
COMMENT ON COLUMN inventory_movements.inventory_raw_id IS 
  'Phase 1: Für gramm-basierte Movements. Alternativ zu product_id.';
COMMENT ON COLUMN inventory_movements.qty_grams IS 
  'Phase 1: Menge in Gramm (nur wenn movement_type = raw). Signiert: + IN, - OUT.';
COMMENT ON COLUMN inventory_movements.movement_type IS 
  'Phase 1: product = Stückzahl-basiert (ALT), raw = Gramm-basiert (NEU)';

-- ----------------------------------------------------------------------------
-- 4. ÜBERARBEITE VIEW: inventory_movements_with_details
-- ----------------------------------------------------------------------------
-- Erweitert die View um Rohwaren-Anzeige
-- Behält alle bestehenden Spalten bei und fügt neue hinzu

CREATE OR REPLACE VIEW inventory_movements_with_details AS
SELECT 
  -- Alle bestehenden inventory_movements Spalten
  im.id,
  im.product_id,
  im.order_id,
  im.order_item_id,
  im.qty,
  im.reason,
  im.reference_id,
  im.occurred_at,
  im.created_at,
  im.updated_at,
  im.created_by,
  im.source,
  p.name as product_name,
  p.sku as product_sku,
  p.price as product_price,
  p.unit as product_unit,
  c.name as category_name,
  COALESCE(
    CONCAT(pr.first_name, ' ', pr.last_name),
    pr.email,
    'System'
  ) as created_by_name,
  
  -- NEU Phase 1: Rohwaren-Spalten
  im.inventory_raw_id,
  im.qty_grams,
  im.movement_type,
  irs.product_group as raw_product_group,
  irs.unit_type as raw_unit_type,
  
  -- NEU Phase 1: Intelligente Mengen-Anzeige
  CASE 
    WHEN im.movement_type = 'product' OR im.movement_type IS NULL THEN 
      COALESCE(im.qty::TEXT, '0') || ' Stück'
    WHEN im.movement_type = 'raw' AND irs.unit_type = 'weight' THEN 
      COALESCE(im.qty_grams::TEXT, '0') || ' g (' || ROUND(COALESCE(im.qty_grams, 0)/1000.0, 2) || ' kg)'
    WHEN im.movement_type = 'raw' AND irs.unit_type = 'volume' THEN 
      COALESCE(im.qty_grams::TEXT, '0') || ' ml (' || ROUND(COALESCE(im.qty_grams, 0)/1000.0, 2) || ' L)'
    ELSE COALESCE(im.qty::TEXT, '0') || ' Stück'
  END as quantity_display
  
FROM inventory_movements im
JOIN products p ON im.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN inventory_raw_stock irs ON im.inventory_raw_id = irs.id
LEFT JOIN profiles pr ON im.created_by = pr.id;

-- Grants beibehalten wie in ursprünglicher View
GRANT SELECT ON inventory_movements_with_details TO authenticated;
GRANT SELECT ON inventory_movements_with_details TO anon;

COMMENT ON VIEW inventory_movements_with_details IS 
  'Phase 1: Erweitert um Rohwaren-Anzeige. Zeigt ALT (Stück) und NEU (Gramm) Movements. Alle bestehenden Spalten bleiben erhalten!';

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) - Globale Rechte-Struktur
-- ----------------------------------------------------------------------------

-- RLS für inventory_raw_stock aktivieren
ALTER TABLE inventory_raw_stock ENABLE ROW LEVEL SECURITY;

-- Policy: Alle authenticated Users können lesen
CREATE POLICY "inventory_raw_stock_select_policy" 
  ON inventory_raw_stock 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Policy: Nur Admins können schreiben (nutzt bestehende Rechte-Struktur)
CREATE POLICY "inventory_raw_stock_modify_policy" 
  ON inventory_raw_stock 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON POLICY "inventory_raw_stock_modify_policy" ON inventory_raw_stock IS
  'Phase 1: Nutzt globale Rechte-Struktur - nur Admins dürfen Rohware verwalten';

-- ----------------------------------------------------------------------------
-- 6. HILFSFUNKTIONEN
-- ----------------------------------------------------------------------------

-- Funktion: Rohware-Bestand abrufen
CREATE OR REPLACE FUNCTION get_raw_stock_grams(raw_stock_id BIGINT)
RETURNS INTEGER AS $$
  SELECT stock_grams FROM inventory_raw_stock WHERE id = raw_stock_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_raw_stock_grams IS 
  'Phase 1: Gibt aktuellen Rohware-Bestand in Gramm zurück';

-- Funktion: Verfügbare Einheiten eines Produkts berechnen
CREATE OR REPLACE FUNCTION get_product_available_stock(product_id_param BIGINT)
RETURNS TABLE(
  available_units INTEGER,  -- Wie viele Einheiten verkauft werden können
  stock_grams INTEGER,      -- Rohware-Bestand in Gramm
  unit_text TEXT            -- Anzeigetext z.B. "15 × 1 Liter verfügbar"
) AS $$
DECLARE
  p RECORD;
  grams INTEGER;
  unit_grams INTEGER;
BEGIN
  SELECT * INTO p FROM products WHERE id = product_id_param;
  
  IF p.is_raw_stock_managed AND p.inventory_raw_id IS NOT NULL THEN
    -- NEU Phase 1: Gramm-basierte Berechnung
    SELECT stock_grams INTO grams 
    FROM inventory_raw_stock 
    WHERE id = p.inventory_raw_id;
    
    unit_grams := (p.weight_kg * 1000)::INTEGER;
    
    RETURN QUERY SELECT 
      CASE WHEN unit_grams > 0 THEN grams / unit_grams ELSE 0 END,
      grams,
      CASE WHEN unit_grams > 0 
        THEN (grams / unit_grams) || ' × ' || p.unit || ' verfügbar'
        ELSE '0 verfügbar'
      END;
  ELSE
    -- ALT: Produkt-basierte Logik (bestehendes System)
    RETURN QUERY SELECT 
      get_current_stock(product_id_param),
      NULL::INTEGER,
      get_current_stock(product_id_param) || ' Stück verfügbar';
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_product_available_stock IS 
  'Phase 1: Berechnet verfügbare Einheiten - unterstützt ALT (Stück) und NEU (Gramm)';

-- ----------------------------------------------------------------------------
-- PHASE 1 ABGESCHLOSSEN
-- ----------------------------------------------------------------------------
-- 
-- ✅ Erledigt:
--   - inventory_raw_stock Tabelle erstellt
--   - products erweitert (inventory_raw_id, is_raw_stock_managed)
--   - inventory_movements erweitert (inventory_raw_id, qty_grams, movement_type)
--   - inventory_movements_with_details View überarbeitet
--   - RLS Policies (nutzt globale Rechte-Struktur)
--   - Hilfsfunktionen für Bestandsabfrage
--
-- ⏳ TODO Phase 2:
--   - Trigger für automatischen Gramm-Abzug bei Bestellungen
--   - handle_order_inventory_deduction() Funktion überarbeiten
--   - Unterstützung für Geschenkkörbe (Bundles)
--
-- ⏳ TODO Phase 3:
--   - Datenmigration (Olivenöl-Produkte verknüpfen)
--   - Initiale Rohwaren anlegen
--
-- ⏳ TODO Phase 4:
--   - Admin-UI für Rohwaren-Verwaltung
--   - Erweiterung inventory-management.tsx
--
-- ⏳ TODO Phase 5:
--   - Shop-Integration (Verfügbarkeits-Check)
--
-- ----------------------------------------------------------------------------
