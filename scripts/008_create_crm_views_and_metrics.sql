/* =============================================================================
   CRM KPIs sauber ableiten + schnell servieren
   - Materialized View: public.crm_customer_metrics
   - Aktualisierung via pg_cron alle 5 Minuten (optional anpassbar)
   - crm_customers-View erweitert um KPIs: order_count, total_spent_calc,
     avg_order_value, last_order_date, first_order_date, last_activity
============================================================================= */

-- 0) Voraussetzung (einmalig): pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1) (Re)Create Materialized View mit KPIs pro Kunde
DROP MATERIALIZED VIEW IF EXISTS public.crm_customer_metrics CASCADE;

CREATE MATERIALIZED VIEW public.crm_customer_metrics AS
WITH o AS (
  SELECT
    o.customer_id,
    o.id,
    o.total,
    o.order_time,
    o.status
  FROM public.orders o
  WHERE o.customer_id IS NOT NULL
)
, o_use AS (
  /* Welche Bestellungen zählen? 
     Hier: alles außer 'cancelled'. Du kannst das je nach Business-Logik
     enger machen (z.B. nur 'confirmed','ready','completed'). */
  SELECT *
  FROM o
  WHERE status IS DISTINCT FROM 'cancelled'
)
SELECT
  c.id                                                   AS customer_id,
  COUNT(o_use.id)                                        AS order_count,
  COALESCE(SUM(o_use.total), 0)::NUMERIC(12,2)          AS total_spent_calc,
  MIN(o_use.order_time)                                  AS first_order_date,
  MAX(o_use.order_time)                                  AS last_order_date,
  CASE
    WHEN COUNT(o_use.id) > 0
      THEN ROUND(COALESCE(SUM(o_use.total),0) / NULLIF(COUNT(o_use.id),0), 2)
    ELSE NULL
  END                                                    AS avg_order_value
FROM public.customers c
LEFT JOIN o_use ON o_use.customer_id = c.id
GROUP BY c.id;

-- 1a) Uniqueness-Index (für CONCURRENT REFRESH)
CREATE UNIQUE INDEX IF NOT EXISTS crm_customer_metrics_uidx
  ON public.crm_customer_metrics (customer_id);

-- 1b) Rechte
GRANT SELECT ON public.crm_customer_metrics TO anon, authenticated;

-- 2) (Re)Create konsolidierte View crm_customers
--    -> Liefert deine gewünschten Felder + KPIs + last_activity
CREATE OR REPLACE VIEW public.crm_customers AS
SELECT
  c.id,
  c.first_name,
  c.last_name,
  c.email,
  c.phone,
  c.city,
  c.street,
  c.house_number,
  c.postal_code,
  c.account_status,
  c.customer_status,
  c.registration_date,
  -- vorhandene Summen/Felder aus customers (falls du sie weiter nutzt):
  c.total_orders,
  c.total_spent,
  c.last_order_date,
  c.favorite_categories,
  -- abgeleitete UI-Felder:
  GREATEST(c.updated_at, m.last_order_date)              AS last_activity,
  COALESCE(c.favorite_categories, '{}')                  AS tags,
  -- KPIs aus Materialized View:
  m.order_count,
  m.total_spent_calc,
  m.avg_order_value,
  m.first_order_date     AS first_order,
  m.last_order_date      AS last_order
FROM public.customers c
LEFT JOIN public.crm_customer_metrics m ON m.customer_id = c.id;

GRANT SELECT ON public.crm_customers TO anon, authenticated;

-- 3) Initiale Befüllung + Auto-Refresh einrichten
-- Vorher evtl. alten Job entfernen
SELECT cron.unschedule('refresh_crm_customer_metrics');

-- Alle 5 Minuten aktualisieren (CONCURRENT -> ohne harte Locks)
SELECT cron.schedule(
  'refresh_crm_customer_metrics',
  '*/5 * * * *',
  $$ REFRESH MATERIALIZED VIEW CONCURRENTLY public.crm_customer_metrics; $$
);

-- 4) Optional: Search-Funktion für performante Suche
CREATE OR REPLACE FUNCTION public.crm_customers_search(q TEXT, limit_count INT, offset_count INT)
RETURNS SETOF public.crm_customers
LANGUAGE SQL
STABLE
AS $$
  SELECT *
  FROM public.crm_customers
  WHERE q IS NULL
     OR first_name ILIKE '%'||q||'%'
     OR last_name  ILIKE '%'||q||'%'
     OR email      ILIKE '%'||q||'%'
     OR city       ILIKE '%'||q||'%'
  ORDER BY last_activity DESC NULLS LAST
  LIMIT COALESCE(limit_count, 200)
  OFFSET COALESCE(offset_count, 0)
$$;

GRANT EXECUTE ON FUNCTION public.crm_customers_search(TEXT,INT,INT) TO anon, authenticated;
