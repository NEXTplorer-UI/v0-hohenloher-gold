-- =====================================================================
-- PATCH: Fix für Inventory-Movements Check Constraints (Variante 1)
-- Ziel:
--   - Bewegungen mit order_item_id sind erlaubt (order_id leer)
--   - Bewegungen mit order_id bleiben optional
--   - keine Doppelreferenz mehr erlaubt
-- =====================================================================

-- 1️⃣  Bestehenden fehlerhaften Constraint entfernen
ALTER TABLE public.inventory_movements
  DROP CONSTRAINT IF EXISTS valid_order_reference;

-- 2️⃣  Neu definieren (nur eine Referenz-Art erlaubt)
ALTER TABLE public.inventory_movements
  ADD CONSTRAINT valid_order_reference CHECK (
    (
      -- ❌ kein Bezug zu einer Bestellung (manuelle Bewegung)
      order_id IS NULL AND order_item_id IS NULL
    )
    OR
    (
      -- ✅ Bewegung bezieht sich auf ganze Bestellung
      order_id IS NOT NULL AND order_item_id IS NULL
    )
    OR
    (
      -- ✅ Bewegung bezieht sich auf einzelnes Order-Item
      order_id IS NULL AND order_item_id IS NOT NULL
    )
  );

-- 3️⃣  Sicherstellen, dass die Mengenregel korrekt bleibt (negativ bei Bestellungen)
ALTER TABLE public.inventory_movements
  DROP CONSTRAINT IF EXISTS valid_order_qty;

ALTER TABLE public.inventory_movements
  ADD CONSTRAINT valid_order_qty CHECK (
    (
      -- ✅ Wenn keine Order-Referenz: beliebige Menge
      (order_id IS NULL AND order_item_id IS NULL)
    )
    OR
    (
      -- ✅ Wenn Bezug zu Bestellung: Menge muss negativ sein (Ausgang)
      qty < 0
    )
  );

-- 4️⃣  Logische Zusatzregel: mindestens eine sinnvolle Referenz (wie vorher)
ALTER TABLE public.inventory_movements
  DROP CONSTRAINT IF EXISTS valid_manual_movement;

ALTER TABLE public.inventory_movements
  ADD CONSTRAINT valid_manual_movement CHECK (
    (
      created_by IS NOT NULL
      OR order_id IS NOT NULL
      OR order_item_id IS NOT NULL
    )
  );

-- =====================================================================
-- ✅ Ergebnis:
-- - Nur EINE der Spalten order_id / order_item_id darf belegt sein
-- - Bei Bestellungen (egal ob order oder order_item) muss qty < 0
-- - Mindestens eine Referenz (created_by oder Bestellung) muss existieren
-- =====================================================================
