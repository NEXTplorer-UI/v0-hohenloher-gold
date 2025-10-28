-- Vorschau-Script: Zeigt an, was gelöscht werden würde
-- OHNE tatsächlich etwas zu löschen
-- 
-- Führen Sie dieses Script ZUERST aus, um zu sehen was betroffen ist!

-- Bestellungen die gelöscht werden würden
SELECT 
  o.id,
  o.order_number,
  o.total_amount,
  o.created_at,
  o.status,
  COUNT(DISTINCT oi.id) as anzahl_positionen,
  COUNT(DISTINCT im.id) as anzahl_lagerbewegungen
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN inventory_movements im ON im.order_id = o.id AND im.reason = 'Kundenbestellung'
WHERE EXISTS (
  SELECT 1 FROM inventory_movements im2
  WHERE im2.order_id = o.id 
  AND im2.reason = 'Kundenbestellung'
)
GROUP BY o.id, o.order_number, o.total_amount, o.created_at, o.status
ORDER BY o.created_at DESC;

-- Zusammenfassung
SELECT 
  'Bestellungen' as typ,
  COUNT(DISTINCT o.id) as anzahl
FROM orders o
WHERE EXISTS (
  SELECT 1 FROM inventory_movements im
  WHERE im.order_id = o.id 
  AND im.reason = 'Kundenbestellung'
)

UNION ALL

SELECT 
  'Bestellpositionen' as typ,
  COUNT(oi.id) as anzahl
FROM order_items oi
WHERE oi.order_id IN (
  SELECT DISTINCT o.id FROM orders o
  WHERE EXISTS (
    SELECT 1 FROM inventory_movements im
    WHERE im.order_id = o.id 
    AND im.reason = 'Kundenbestellung'
  )
)

UNION ALL

SELECT 
  'Lagerbewegungen (Kundenbestellung)' as typ,
  COUNT(im.id) as anzahl
FROM inventory_movements im
WHERE im.reason = 'Kundenbestellung'

UNION ALL

SELECT 
  'Provisionen' as typ,
  COUNT(dc.id) as anzahl
FROM distributor_commissions dc
WHERE dc.order_id IN (
  SELECT DISTINCT o.id FROM orders o
  WHERE EXISTS (
    SELECT 1 FROM inventory_movements im
    WHERE im.order_id = o.id 
    AND im.reason = 'Kundenbestellung'
  )
);

-- Lagerbewegungen die BEHALTEN werden
SELECT 
  im.reason,
  COUNT(*) as anzahl
FROM inventory_movements im
WHERE im.reason != 'Kundenbestellung'
GROUP BY im.reason
ORDER BY anzahl DESC;
