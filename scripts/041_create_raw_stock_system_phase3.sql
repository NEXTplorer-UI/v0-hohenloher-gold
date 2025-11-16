-- =====================================================
-- PHASE 3: Datenmigration & Initialisierung
-- Gramm-basiertes Inventarsystem
-- =====================================================
--
-- Was wurde bereits erledigt:
-- ✅ Phase 1: Datenbank-Schema (inventory_raw_stock, erweiterte products/movements/view)
-- ✅ Phase 2: Trigger für automatischen Gramm-Abzug bei Bestellungen
--
-- Was diese Phase macht:
-- 1. Initiale Rohwaren-Gruppen anlegen basierend auf echten Produkten
-- 2. Produkte mit Rohwaren verknüpfen (is_raw_stock_managed = TRUE)
-- 3. Initiale Bestände auf 0 setzen (Admin bucht später manuell ein)
--
-- Nächste Phase: Phase 4 - Admin-UI für Rohwaren-Verwaltung
-- =====================================================

-- =====================================================
-- 3.1 Initiale Rohwaren-Gruppen anlegen
-- =====================================================

-- Südfrüchte hinzugefügt (7 Produkte)
-- Jede Kiste = 7,5 kg, unit_type = 'weight'
INSERT INTO inventory_raw_stock (product_group, stock_grams, min_stock_grams, unit_type)
VALUES 
  ('Orangen', 0, 15000, 'weight'),  -- Mindestens 2 Kisten (15kg)
  ('Saftorangen', 0, 15000, 'weight'),
  ('Mandarinen', 0, 15000, 'weight'),
  ('Zitronen', 0, 15000, 'weight'),
  ('Grapefruit', 0, 7500, 'weight'),  -- Mindestens 1 Kiste
  ('Blutorangen', 0, 7500, 'weight'),
  ('Cedri', 0, 2000, 'weight')  -- 2kg Mindestbestand
ON CONFLICT (product_group) DO NOTHING;

-- Olivenöl (1L, 3L, 5L alle vom gleichen Bestand)
-- unit_type = 'volume' weil Öl in Liter gemessen wird
-- Umrechnung: 1L = 1000ml = 1000g (1:1 für Verpackungszwecke)
INSERT INTO inventory_raw_stock (product_group, stock_grams, min_stock_grams, unit_type)
VALUES ('Olivenöl Extra Vergine', 0, 5000, 'volume')
ON CONFLICT (product_group) DO NOTHING;

-- Trockenfrüchte und Nüsse
-- Jedes Produkt bekommt seine eigene Rohware-Gruppe
-- unit_type = 'weight' weil in Gewicht gemessen
INSERT INTO inventory_raw_stock (product_group, stock_grams, min_stock_grams, unit_type)
VALUES 
  ('Macadamia', 0, 2000, 'weight'),
  ('Mango', 0, 2000, 'weight'),
  ('Ananas', 0, 2000, 'weight'),
  ('Sauerkirschen', 0, 2000, 'weight'),
  ('Medjul-Datteln', 0, 2000, 'weight'),
  ('Cashew', 0, 2000, 'weight'),
  ('Cranberries', 0, 2000, 'weight'),
  ('Maulbeere hell', 0, 2000, 'weight'),
  ('Aprikose', 0, 2000, 'weight'),
  ('Feigen', 0, 2000, 'weight'),
  ('Weinbeeren', 0, 2000, 'weight'),
  ('Datteln ohne Stein', 0, 2000, 'weight'),
  ('Tomaten getrocknet', 0, 2000, 'weight'),
  ('Mandeln geröstet', 0, 2000, 'weight')
ON CONFLICT (product_group) DO NOTHING;

-- Süße Spezialitäten
-- Separate Gruppen für verschiedene Geschmacksrichtungen
INSERT INTO inventory_raw_stock (product_group, stock_grams, min_stock_grams, unit_type)
VALUES 
  ('Trüffel-Mandelkerne', 0, 1000, 'weight'),
  ('Tiramisu-Mandeln', 0, 1000, 'weight'),
  ('Kokos-Orangen-Stäbchen', 0, 1000, 'weight')
ON CONFLICT (product_group) DO NOTHING;

-- =====================================================
-- 3.2 Produkte mit Rohwaren verknüpfen
-- =====================================================

-- Südfrüchte verknüpfen (IDs 1-5, 22-23)
-- Jede Kiste = 7,5 kg (außer Cedri = 1 kg)
UPDATE products SET
  inventory_raw_id = (SELECT id FROM inventory_raw_stock WHERE product_group = 'Orangen'),
  is_raw_stock_managed = TRUE
WHERE id = 1;

UPDATE products SET
  inventory_raw_id = (SELECT id FROM inventory_raw_stock WHERE product_group = 'Saftorangen'),
  is_raw_stock_managed = TRUE
WHERE id = 2;

UPDATE products SET
  inventory_raw_id = (SELECT id FROM inventory_raw_stock WHERE product_group = 'Mandarinen'),
  is_raw_stock_managed = TRUE
WHERE id = 3;

UPDATE products SET
  inventory_raw_id = (SELECT id FROM inventory_raw_stock WHERE product_group = 'Zitronen'),
  is_raw_stock_managed = TRUE
WHERE id = 4;

UPDATE products SET
  inventory_raw_id = (SELECT id FROM inventory_raw_stock WHERE product_group = 'Grapefruit'),
  is_raw_stock_managed = TRUE
WHERE id = 5;

UPDATE products SET
  inventory_raw_id = (SELECT id FROM inventory_raw_stock WHERE product_group = 'Blutorangen'),
  is_raw_stock_managed = TRUE
WHERE id = 22;

UPDATE products SET
  inventory_raw_id = (SELECT id FROM inventory_raw_stock WHERE product_group = 'Cedri'),
  is_raw_stock_managed = TRUE
WHERE id = 23;

-- Olivenöl-Produkte (IDs 16, 17, 18: 1L, 3L, 5L)
-- Alle drei ziehen vom gleichen Rohware-Bestand ab
UPDATE products SET
  inventory_raw_id = (SELECT id FROM inventory_raw_stock WHERE product_group = 'Olivenöl Extra Vergine'),
  is_raw_stock_managed = TRUE
WHERE id IN (16, 17, 18);

-- Macadamia (IDs 24-25: 1kg und 500g)
UPDATE products SET
  inventory_raw_id = (SELECT id FROM inventory_raw_stock WHERE product_group = 'Macadamia'),
  is_raw_stock_managed = TRUE
WHERE id IN (24, 25);

-- Mango (IDs 26-27: 1kg und 500g)
UPDATE products SET
  inventory_raw_id = (SELECT id FROM inventory_raw_stock WHERE product_group = 'Mango'),
  is_raw_stock_managed = TRUE
WHERE id IN (26, 27);

-- Ananas (IDs 28-29: 1kg und 500g)
UPDATE products SET
  inventory_raw_id = (SELECT id FROM inventory_raw_stock WHERE product_group = 'Ananas'),
  is_raw_stock_managed = TRUE
WHERE id IN (28, 29);

-- Sauerkirschen (IDs 30-31: 1kg und 500g)
UPDATE products SET
  inventory_raw_id = (SELECT id FROM inventory_raw_stock WHERE product_group = 'Sauerkirschen'),
  is_raw_stock_managed = TRUE
WHERE id IN (30, 31);

-- Medjul-Datteln (IDs 32-33: 1kg und 500g)
UPDATE products SET
  inventory_raw_id = (SELECT id FROM inventory_raw_stock WHERE product_group = 'Medjul-Datteln'),
  is_raw_stock_managed = TRUE
WHERE id IN (32, 33);

-- Cashew (IDs 34-35: 1kg und 500g)
UPDATE products SET
  inventory_raw_id = (SELECT id FROM inventory_raw_stock WHERE product_group = 'Cashew'),
  is_raw_stock_managed = TRUE
WHERE id IN (34, 35);

-- Cranberries (IDs 36-37: 1kg und 500g)
UPDATE products SET
  inventory_raw_id = (SELECT id FROM inventory_raw_stock WHERE product_group = 'Cranberries'),
  is_raw_stock_managed = TRUE
WHERE id IN (36, 37);

-- Maulbeere hell (IDs 38-39: 1kg und 500g)
UPDATE products SET
  inventory_raw_id = (SELECT id FROM inventory_raw_stock WHERE product_group = 'Maulbeere hell'),
  is_raw_stock_managed = TRUE
WHERE id IN (38, 39);

-- Aprikose (IDs 40-41: 1kg und 500g)
UPDATE products SET
  inventory_raw_id = (SELECT id FROM inventory_raw_stock WHERE product_group = 'Aprikose'),
  is_raw_stock_managed = TRUE
WHERE id IN (40, 41);

-- Feigen (IDs 42-43: 1kg und 500g)
UPDATE products SET
  inventory_raw_id = (SELECT id FROM inventory_raw_stock WHERE product_group = 'Feigen'),
  is_raw_stock_managed = TRUE
WHERE id IN (42, 43);

-- Weinbeeren (IDs 44-45: 1kg und 500g)
UPDATE products SET
  inventory_raw_id = (SELECT id FROM inventory_raw_stock WHERE product_group = 'Weinbeeren'),
  is_raw_stock_managed = TRUE
WHERE id IN (44, 45);

-- Datteln ohne Stein (IDs 46-47: 1kg und 500g)
UPDATE products SET
  inventory_raw_id = (SELECT id FROM inventory_raw_stock WHERE product_group = 'Datteln ohne Stein'),
  is_raw_stock_managed = TRUE
WHERE id IN (46, 47);

-- Tomaten (IDs 48-49: 1kg und 500g)
UPDATE products SET
  inventory_raw_id = (SELECT id FROM inventory_raw_stock WHERE product_group = 'Tomaten getrocknet'),
  is_raw_stock_managed = TRUE
WHERE id IN (48, 49);

-- Mandeln (IDs 50-51: 1kg und 500g)
UPDATE products SET
  inventory_raw_id = (SELECT id FROM inventory_raw_stock WHERE product_group = 'Mandeln geröstet'),
  is_raw_stock_managed = TRUE
WHERE id IN (50, 51);

-- Trüffel-Mandelkerne (IDs 52-54: 1kg, 500g, 200g)
UPDATE products SET
  inventory_raw_id = (SELECT id FROM inventory_raw_stock WHERE product_group = 'Trüffel-Mandelkerne'),
  is_raw_stock_managed = TRUE
WHERE id IN (52, 53, 54);

-- Tiramisu-Mandeln (IDs 55-57: 1kg, 500g, 200g)
UPDATE products SET
  inventory_raw_id = (SELECT id FROM inventory_raw_stock WHERE product_group = 'Tiramisu-Mandeln'),
  is_raw_stock_managed = TRUE
WHERE id IN (55, 56, 57);

-- Kokos-Orangen-Stäbchen (IDs 58-60: 1kg, 500g, 200g)
UPDATE products SET
  inventory_raw_id = (SELECT id FROM inventory_raw_stock WHERE product_group = 'Kokos-Orangen-Stäbchen'),
  is_raw_stock_managed = TRUE
WHERE id IN (58, 59, 60);

-- =====================================================
-- 3.3 Verification & Report
-- =====================================================

-- Zeige alle Rohwaren mit ihren verknüpften Produkten
DO $$
DECLARE
  raw_stock_record RECORD;
  product_count INTEGER;
BEGIN
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'PHASE 3 MIGRATION ABGESCHLOSSEN';
  RAISE NOTICE '=================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Rohwaren-Gruppen und verknüpfte Produkte:';
  RAISE NOTICE '';
  
  FOR raw_stock_record IN 
    SELECT 
      irs.id,
      irs.product_group,
      irs.unit_type,
      irs.stock_grams,
      irs.min_stock_grams,
      COUNT(p.id) as product_count
    FROM inventory_raw_stock irs
    LEFT JOIN products p ON p.inventory_raw_id = irs.id
    GROUP BY irs.id, irs.product_group, irs.unit_type, irs.stock_grams, irs.min_stock_grams
    ORDER BY irs.product_group
  LOOP
    RAISE NOTICE '% (ID: %)', raw_stock_record.product_group, raw_stock_record.id;
    RAISE NOTICE '  - Typ: %', raw_stock_record.unit_type;
    RAISE NOTICE '  - Bestand: % % (% %)', 
      raw_stock_record.stock_grams,
      CASE WHEN raw_stock_record.unit_type = 'weight' THEN 'g' ELSE 'ml' END,
      ROUND(raw_stock_record.stock_grams / 1000.0, 2),
      CASE WHEN raw_stock_record.unit_type = 'weight' THEN 'kg' ELSE 'L' END;
    RAISE NOTICE '  - Mindest: % % (% %)', 
      raw_stock_record.min_stock_grams,
      CASE WHEN raw_stock_record.unit_type = 'weight' THEN 'g' ELSE 'ml' END,
      ROUND(raw_stock_record.min_stock_grams / 1000.0, 2),
      CASE WHEN raw_stock_record.unit_type = 'weight' THEN 'kg' ELSE 'L' END;
    RAISE NOTICE '  - Verknüpfte Produkte: %', raw_stock_record.product_count;
    RAISE NOTICE '';
  END LOOP;
  
  -- Zusammenfassung
  SELECT COUNT(*) INTO product_count FROM inventory_raw_stock;
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Gesamt: % Rohwaren-Gruppen angelegt', product_count;
  
  SELECT COUNT(*) INTO product_count FROM products WHERE is_raw_stock_managed = TRUE;
  RAISE NOTICE 'Gesamt: % Produkte mit Rohwaren verknüpft', product_count;
  RAISE NOTICE '=================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'HINWEIS: Alle Bestände sind auf 0 initialisiert.';
  RAISE NOTICE 'Admin muss über die UI Bestand einbuchen (Phase 4).';
  RAISE NOTICE '';
  RAISE NOTICE 'Nächste Phase: Phase 4 - Admin-UI erstellen';
  RAISE NOTICE '=================================================';
END $$;

-- Erstelle eine View zur schnellen Übersicht
CREATE OR REPLACE VIEW raw_stock_overview AS
SELECT 
  irs.id,
  irs.product_group,
  irs.unit_type,
  irs.stock_grams,
  ROUND(irs.stock_grams / 1000.0, 2) as stock_kg_or_l,
  irs.min_stock_grams,
  ROUND(irs.min_stock_grams / 1000.0, 2) as min_stock_kg_or_l,
  COUNT(p.id) as linked_product_count,
  STRING_AGG(p.name || ' (' || p.unit || ')', ', ' ORDER BY p.id) as linked_products,
  CASE 
    WHEN irs.stock_grams < irs.min_stock_grams THEN 'LOW_STOCK'
    WHEN irs.stock_grams = 0 THEN 'OUT_OF_STOCK'
    ELSE 'OK'
  END as stock_status
FROM inventory_raw_stock irs
LEFT JOIN products p ON p.inventory_raw_id = irs.id AND p.is_active = TRUE
GROUP BY irs.id, irs.product_group, irs.unit_type, irs.stock_grams, irs.min_stock_grams
ORDER BY irs.product_group;

-- RLS für View
GRANT SELECT ON raw_stock_overview TO authenticated;

COMMENT ON VIEW raw_stock_overview IS 'Übersicht aller Rohwaren mit verknüpften Produkten und Status';
