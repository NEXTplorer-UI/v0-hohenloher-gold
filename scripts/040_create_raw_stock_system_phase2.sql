-- ============================================================================
-- PHASE 2: Gramm-basiertes Inventarsystem - Trigger für Bestellungen
-- ============================================================================
-- Datum: 2025-01-XX
-- Zweck: Automatischer Gramm-Abzug bei Bestellungen
-- Voraussetzung: Phase 1 muss ausgeführt sein
--
-- PHASE 1 RECAP:
--   ✅ inventory_raw_stock Tabelle erstellt
--   ✅ products erweitert (inventory_raw_id, is_raw_stock_managed, weight_kg)
--   ✅ inventory_movements erweitert (inventory_raw_id, qty_grams, movement_type)
--   ✅ inventory_movements_with_details View überarbeitet
--   ✅ RLS Policies und Hilfsfunktionen
--
-- PHASE 2 ZIEL:
--   - Trigger für automatischen Abzug bei Bestellungen
--   - Unterstützt ALT (Stückzahl) UND NEU (Gramm-basiert)
--   - Geschenkkörbe-Ready (Bundle-Support)
--
-- NÄCHSTE PHASE: Phase 3 - Datenmigration (Olivenöl verknüpfen)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. HAUPTFUNKTION: Automatischer Inventar-Abzug bei Bestellung
-- ----------------------------------------------------------------------------
-- Wird bei INSERT/UPDATE von orders ausgeführt
-- Unterstützt beide Systeme: ALT (Stückzahl) + NEU (Gramm)

CREATE OR REPLACE FUNCTION handle_order_inventory_deduction()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
  grams_needed INTEGER;
  component JSONB;
  component_raw_id BIGINT;
  component_grams INTEGER;
BEGIN
  -- Nur bei Status-Wechsel zu confirmed/paid
  -- (Nicht bei pending, um Reserve-Bestand später zu implementieren)
  IF NEW.status IN ('confirmed', 'paid') AND 
     (OLD IS NULL OR OLD.status IN ('pending', 'draft')) THEN
    
    -- Für jedes order_item dieser Bestellung
    FOR item IN 
      SELECT 
        oi.id as order_item_id,
        oi.product_id,
        oi.quantity,
        p.inventory_raw_id,
        p.weight_kg,
        p.is_raw_stock_managed,
        p.attributes,
        p.name as product_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = NEW.id
    LOOP
      
      -- Prüfe ob Produkt ein Bundle ist (Geschenkkorb)
      IF item.attributes IS NOT NULL AND 
         item.attributes->>'is_bundle' = 'true' THEN
        
        -- BUNDLE: Ziehe jede Komponente einzeln ab
        FOR component IN 
          SELECT * FROM jsonb_array_elements(item.attributes->'bundle_components')
        LOOP
          component_raw_id := (component->>'inventory_raw_id')::BIGINT;
          component_grams := (component->>'weight_grams')::INTEGER;
          
          -- Rohware-Bestand abziehen
          UPDATE inventory_raw_stock
          SET stock_grams = stock_grams - (component_grams * item.quantity)
          WHERE id = component_raw_id;
          
          -- Movement tracken
          INSERT INTO inventory_movements (
            inventory_raw_id,
            product_id,
            order_id,
            order_item_id,
            qty_grams,
            movement_type,
            reason,
            reference_id,
            occurred_at
          ) VALUES (
            component_raw_id,
            item.product_id,
            NEW.id,
            item.order_item_id,
            -(component_grams * item.quantity),  -- Negativ für Abzug
            'raw',
            'Bundle-Komponente: ' || item.product_name,
            NEW.order_number,
            NOW()
          );
        END LOOP;
        
      -- Prüfe ob Produkt gramm-basiert verwaltet wird
      ELSIF item.is_raw_stock_managed AND 
            item.inventory_raw_id IS NOT NULL THEN
        
        -- NEU Phase 2: Gramm-basierter Abzug
        grams_needed := (item.weight_kg * 1000)::INTEGER * item.quantity;
        
        -- Rohware-Bestand abziehen
        UPDATE inventory_raw_stock
        SET stock_grams = stock_grams - grams_needed
        WHERE id = item.inventory_raw_id;
        
        -- Movement tracken (Gramm)
        INSERT INTO inventory_movements (
          inventory_raw_id,
          product_id,
          order_id,
          order_item_id,
          qty_grams,
          movement_type,
          reason,
          reference_id,
          occurred_at
        ) VALUES (
          item.inventory_raw_id,
          item.product_id,
          NEW.id,
          item.order_item_id,
          -grams_needed,  -- Negativ für Abzug
          'raw',
          'Kundenbestellung',
          NEW.order_number,
          NOW()
        );
        
      ELSE
        -- ALT: Produkt-basierter Abzug (bestehendes System)
        -- Für Produkte ohne inventory_raw_id
        INSERT INTO inventory_movements (
          product_id,
          order_id,
          order_item_id,
          qty,
          movement_type,
          reason,
          reference_id,
          occurred_at
        ) VALUES (
          item.product_id,
          NEW.id,
          item.order_item_id,
          -item.quantity,  -- Negativ für Abzug
          'product',
          'Kundenbestellung',
          NEW.order_number,
          NOW()
        );
      END IF;
      
    END LOOP;
    
    -- Log für Debugging
    RAISE NOTICE '[Phase 2] Inventory deducted for order % (status: %)', NEW.order_number, NEW.status;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_order_inventory_deduction IS 
  'Phase 2: Automatischer Inventar-Abzug bei Bestellungen. Unterstützt ALT (Stück) + NEU (Gramm) + Bundles.';

-- ----------------------------------------------------------------------------
-- 2. TRIGGER: Verbinde Funktion mit orders Tabelle
-- ----------------------------------------------------------------------------

-- Drop alter Trigger falls vorhanden
DROP TRIGGER IF EXISTS trigger_order_inventory_deduction ON orders;

-- Erstelle neuen Trigger
CREATE TRIGGER trigger_order_inventory_deduction
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_inventory_deduction();

COMMENT ON TRIGGER trigger_order_inventory_deduction ON orders IS
  'Phase 2: Führt automatischen Inventar-Abzug bei Statuswechsel zu confirmed/paid aus';

-- ----------------------------------------------------------------------------
-- 3. FUNKTION: Bestellung rückgängig machen (Storno)
-- ----------------------------------------------------------------------------
-- Für zukünftige Admin-Funktion zum Stornieren

CREATE OR REPLACE FUNCTION reverse_order_inventory_deduction(order_id_param UUID)
RETURNS VOID AS $$
DECLARE
  movement RECORD;
BEGIN
  -- Finde alle Movements dieser Bestellung
  FOR movement IN 
    SELECT * FROM inventory_movements 
    WHERE order_id = order_id_param
  LOOP
    IF movement.movement_type = 'raw' THEN
      -- Gramm-basiert: Zurückbuchen
      UPDATE inventory_raw_stock
      SET stock_grams = stock_grams + ABS(movement.qty_grams)
      WHERE id = movement.inventory_raw_id;
      
      -- Storno-Movement erstellen
      INSERT INTO inventory_movements (
        inventory_raw_id,
        product_id,
        order_id,
        qty_grams,
        movement_type,
        reason,
        reference_id,
        occurred_at
      ) VALUES (
        movement.inventory_raw_id,
        movement.product_id,
        order_id_param,
        ABS(movement.qty_grams),  -- Positiv für Rückbuchung
        'raw',
        'Bestellung storniert',
        (SELECT order_number FROM orders WHERE id = order_id_param),
        NOW()
      );
    ELSE
      -- Stückzahl-basiert: Zurückbuchen
      INSERT INTO inventory_movements (
        product_id,
        order_id,
        qty,
        movement_type,
        reason,
        reference_id,
        occurred_at
      ) VALUES (
        movement.product_id,
        order_id_param,
        ABS(movement.qty),  -- Positiv für Rückbuchung
        'product',
        'Bestellung storniert',
        (SELECT order_number FROM orders WHERE id = order_id_param),
        NOW()
      );
    END IF;
  END LOOP;
  
  RAISE NOTICE '[Phase 2] Inventory reversed for order %', order_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reverse_order_inventory_deduction IS
  'Phase 2: Macht Inventar-Abzug einer Bestellung rückgängig (für Stornierungen)';

-- ----------------------------------------------------------------------------
-- 4. ERWEITERE get_current_stock() für Gramm-Produkte
-- ----------------------------------------------------------------------------
-- Überschreibt alte Funktion, um gramm-basierte Produkte zu unterstützen

CREATE OR REPLACE FUNCTION get_current_stock(p_product_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
  p RECORD;
  grams INTEGER;
  unit_grams INTEGER;
BEGIN
  SELECT * INTO p FROM products WHERE id = p_product_id;
  
  IF p.is_raw_stock_managed AND p.inventory_raw_id IS NOT NULL THEN
    -- NEU Phase 2: Gramm-basiert
    SELECT stock_grams INTO grams 
    FROM inventory_raw_stock 
    WHERE id = p.inventory_raw_id;
    
    unit_grams := (p.weight_kg * 1000)::INTEGER;
    
    -- Verfügbare Einheiten = Gramm / Gramm pro Einheit
    RETURN CASE WHEN unit_grams > 0 THEN grams / unit_grams ELSE 0 END;
  ELSE
    -- ALT: Produkt-basiert (bestehend)
    SELECT COALESCE(SUM(qty), 0)
    INTO grams
    FROM inventory_movements
    WHERE product_id = p_product_id
    AND movement_type = 'product';
    
    RETURN GREATEST(grams, 0);  -- Nie negativ
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_current_stock IS
  'Phase 2: Erweitert - Gibt Bestand für ALT (Stück) UND NEU (Gramm) Produkte zurück';

-- ----------------------------------------------------------------------------
-- PHASE 2 ABGESCHLOSSEN
-- ----------------------------------------------------------------------------
-- 
-- ✅ Erledigt:
--   - handle_order_inventory_deduction() Funktion erstellt
--   - Trigger auf orders Tabelle verbunden
--   - Unterstützt ALT (Stückzahl) + NEU (Gramm)
--   - Bundle-Support (Geschenkkörbe)
--   - Storno-Funktion vorbereitet
--   - get_current_stock() erweitert
--
-- ⏳ TODO Phase 3:
--   - Datenmigration: Olivenöl-Produkte verknüpfen (1L, 3L, 5L)
--   - Initiale Rohwaren anlegen
--   - Testdaten eintragen
--
-- ⏳ TODO Phase 4:
--   - Admin-UI für Rohwaren-Verwaltung
--   - components/admin/raw-stock-management.tsx
--   - Erweiterung inventory-management.tsx
--   - API-Routen erstellen
--
-- ⏳ TODO Phase 5:
--   - Shop-Integration
--   - Verfügbarkeits-Check anpassen
--   - Produktanzeige erweitern
--
-- ----------------------------------------------------------------------------
