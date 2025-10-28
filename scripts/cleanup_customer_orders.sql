-- Script zum Löschen aller Kundenbestellungen
-- Behält manuelle Lagerbewegungen (Wareneingang, Manuelle Korrektur, etc.)
-- 
-- WICHTIG: Führen Sie dieses Script in einer Transaktion aus!
-- Bei Fehlern wird alles zurückgerollt.

BEGIN;

-- Schritt 1: Identifiziere alle Bestellungen die gelöscht werden sollen
-- (Bestellungen die Lagerbewegungen mit Grund "Kundenbestellung" haben)
CREATE TEMP TABLE orders_to_delete AS
SELECT DISTINCT o.id, o.order_number, o.created_at
FROM orders o
WHERE EXISTS (
  SELECT 1 FROM inventory_movements im 
  WHERE im.order_id = o.id 
  AND im.reason = 'Kundenbestellung'
);

-- Zeige an, wie viele Bestellungen betroffen sind
DO $$
DECLARE
  order_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO order_count FROM orders_to_delete;
  RAISE NOTICE 'Anzahl zu löschender Bestellungen: %', order_count;
END $$;

-- Schritt 2: Lösche Provisionen für diese Bestellungen
DELETE FROM distributor_commissions
WHERE order_id IN (SELECT id FROM orders_to_delete);

RAISE NOTICE 'Provisionen gelöscht';

-- Schritt 3: Lösche Lagerbewegungen mit Grund "Kundenbestellung"
-- (Behält alle anderen Lagerbewegungen wie "Wareneingang", "Manuelle Korrektur", etc.)
DELETE FROM inventory_movements
WHERE order_id IN (SELECT id FROM orders_to_delete)
AND reason = 'Kundenbestellung';

RAISE NOTICE 'Lagerbewegungen (Kundenbestellung) gelöscht';

-- Schritt 4: Lösche Bestellpositionen
DELETE FROM order_items
WHERE order_id IN (SELECT id FROM orders_to_delete);

RAISE NOTICE 'Bestellpositionen gelöscht';

-- Schritt 5: Entferne Referenzen in Checkouts
UPDATE checkouts
SET completed_order_id = NULL
WHERE completed_order_id IN (SELECT id FROM orders_to_delete);

RAISE NOTICE 'Checkout-Referenzen entfernt';

-- Schritt 6: Lösche die Bestellungen selbst
DELETE FROM orders
WHERE id IN (SELECT id FROM orders_to_delete);

RAISE NOTICE 'Bestellungen gelöscht';

-- Schritt 7: Aufräumen
DROP TABLE orders_to_delete;

-- Zeige Zusammenfassung
DO $$
DECLARE
  remaining_orders INTEGER;
  remaining_movements INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_orders FROM orders;
  SELECT COUNT(*) INTO remaining_movements FROM inventory_movements WHERE reason != 'Kundenbestellung';
  
  RAISE NOTICE '=== ZUSAMMENFASSUNG ===';
  RAISE NOTICE 'Verbleibende Bestellungen: %', remaining_orders;
  RAISE NOTICE 'Verbleibende manuelle Lagerbewegungen: %', remaining_movements;
END $$;

-- WICHTIG: Überprüfen Sie die Ausgabe!
-- Wenn alles korrekt aussieht, führen Sie aus: COMMIT;
-- Wenn etwas falsch ist, führen Sie aus: ROLLBACK;

-- Zum Testen: Kommentieren Sie COMMIT aus und verwenden Sie ROLLBACK
-- ROLLBACK;
COMMIT;
