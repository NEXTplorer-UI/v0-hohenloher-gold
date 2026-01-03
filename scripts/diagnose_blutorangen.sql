-- Diagnose: Warum sind Blutorangen nicht verfügbar?

-- 1. Produkt-Grunddaten
SELECT 
  id,
  name,
  is_active,
  stock_quantity,
  min_stock,
  inventory_raw_id,
  category_id
FROM products
WHERE name ILIKE '%blutorange%';

-- 2. Gramm-basiertes Lager (falls zugeordnet)
SELECT 
  p.name as product_name,
  irs.stock_name,
  irs.stock_grams,
  irs.min_stock_grams
FROM products p
LEFT JOIN inventory_raw_stock irs ON p.inventory_raw_id = irs.id
WHERE p.name ILIKE '%blutorange%';

-- 3. Was sagt die product_availability View?
SELECT *
FROM product_availability
WHERE product_name ILIKE '%blutorange%';

-- 4. Kategorie-Check
SELECT 
  p.name,
  c.name as category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.name ILIKE '%blutorange%';
