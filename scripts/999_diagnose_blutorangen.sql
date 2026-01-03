-- Diagnose: Warum sind Blutorangen nicht verfügbar?

-- 1. Prüfe ob Blutorangen existieren und ihre Konfiguration
SELECT 
  p.id,
  p.name,
  p.is_active,
  p.stock_quantity,
  p.min_stock,
  p.inventory_raw_id,
  p.category_id,
  c.name as category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE LOWER(p.name) LIKE '%blutorange%'
ORDER BY p.name;

-- 2. Wenn inventory_raw_id gesetzt ist, prüfe das gramm-basierte Lager
SELECT 
  ir.id,
  ir.raw_product_name,
  ir.stock_grams,
  ir.min_stock_grams,
  ir.unit,
  ir.is_active
FROM inventory_raw_stock ir
WHERE ir.raw_product_name LIKE '%Blutorange%'
   OR ir.id IN (
     SELECT inventory_raw_id 
     FROM products 
     WHERE LOWER(name) LIKE '%blutorange%' 
       AND inventory_raw_id IS NOT NULL
   );

-- 3. Prüfe was die product_availability View zurückgibt
SELECT 
  pa.product_id,
  pa.product_name,
  pa.status,
  pa.available_quantity,
  pa.stock_grams,
  pa.raw_product_name,
  pa.inventory_raw_id
FROM product_availability pa
WHERE LOWER(pa.product_name) LIKE '%blutorange%';

-- 4. Liste alle Südfrüchte Produkte um zu vergleichen
SELECT 
  p.id,
  p.name,
  p.is_active,
  p.inventory_raw_id IS NOT NULL as is_gram_based,
  p.stock_quantity as stueck_bestand,
  ir.stock_grams,
  ir.raw_product_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN inventory_raw_stock ir ON p.inventory_raw_id = ir.id
WHERE c.name LIKE '%Südfrüchte%'
ORDER BY p.name;
