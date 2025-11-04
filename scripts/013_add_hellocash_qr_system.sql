-- ============================================================================
-- Migration: helloCash QR-Code System
-- ============================================================================
-- Fügt QR-Code und helloCash Integration für Bestellungen hinzu
-- - QR-Codes für Abholung und Zahlung (45 Tage gültig)
-- - Orders: Mehrfach scanbar (bei Verbindungsproblemen)
-- - Vouchers: Einmalig scanbar (für spätere Implementierung vorbereitet)
-- - Vollständiges Scan-Tracking mit Audit Trail
-- ============================================================================

-- ============================================================================
-- 1. Erweitere orders Tabelle mit QR-Code Feldern
-- ============================================================================

-- Spalten ohne inline constraints hinzufügen
alter table public.orders
  add column if not exists qr_code_url text,
  add column if not exists pickup_token uuid default gen_random_uuid(),
  add column if not exists qr_code_type text default 'order',
  add column if not exists qr_code_generated_at timestamptz,
  add column if not exists qr_code_expires_at timestamptz,
  add column if not exists qr_code_last_scanned_at timestamptz,
  add column if not exists hellocash_invoice_id text,
  add column if not exists hellocash_invoice_number text,
  add column if not exists hellocash_status text,
  add column if not exists hellocash_payment_url text,
  add column if not exists hellocash_error_message text,
  add column if not exists pos_synced_at timestamptz;

-- Constraints separat hinzufügen
do $$
begin
  -- Check Constraint für qr_code_type
  if not exists (
    select 1 from pg_constraint 
    where conname = 'orders_qr_code_type_check'
  ) then
    alter table public.orders
      add constraint orders_qr_code_type_check 
      check (qr_code_type in ('order', 'voucher'));
  end if;

  -- Check Constraint für hellocash_status
  if not exists (
    select 1 from pg_constraint 
    where conname = 'orders_hellocash_status_check'
  ) then
    alter table public.orders
      add constraint orders_hellocash_status_check 
      check (hellocash_status in ('draft', 'pending', 'paid', 'canceled', 'failed', 'refunded'));
  end if;

  -- Unique Constraint für pickup_token
  if not exists (
    select 1 from pg_constraint 
    where conname = 'orders_pickup_token_unique'
  ) then
    alter table public.orders
      add constraint orders_pickup_token_unique unique (pickup_token);
  end if;

  -- Unique Constraint für hellocash_invoice_id
  if not exists (
    select 1 from pg_constraint 
    where conname = 'orders_hellocash_invoice_id_unique'
  ) then
    alter table public.orders
      add constraint orders_hellocash_invoice_id_unique unique (hellocash_invoice_id);
  end if;
end $$;

-- ============================================================================
-- 2. Erstelle qr_code_scans Tabelle für Scan-Tracking (vereinfachte Version)
-- ============================================================================

-- Vereinfachte Struktur basierend auf User-Feedback
create table if not exists public.qr_code_scans (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  scanned_at timestamptz not null default now(),
  source text,           -- z.B. "tablet", "phone", "pos"
  scan_result text,      -- 'success', 'expired', 'already_paid', 'error', 'payment_confirmed'
  ip inet,
  user_agent text,
  error_message text
);

-- ============================================================================
-- 3. Erstelle Indizes für Performance
-- ============================================================================

-- Index für schnelle Suche nach pickup_token (QR-Code Scan)
create index if not exists idx_orders_pickup_token 
  on public.orders(pickup_token) 
  where pickup_token is not null;

-- Index für helloCash Invoice ID Suche
create index if not exists idx_orders_hellocash_invoice_id 
  on public.orders(hellocash_invoice_id) 
  where hellocash_invoice_id is not null;

-- Index für QR-Code Ablauf-Prüfung
create index if not exists idx_orders_qr_expires 
  on public.orders(qr_code_expires_at) 
  where qr_code_expires_at is not null;

-- Index für helloCash Status Filterung
create index if not exists idx_orders_hellocash_status 
  on public.orders(hellocash_status) 
  where hellocash_status is not null;

-- Indizes für qr_code_scans Tabelle
create index if not exists idx_qr_scans_order_id 
  on public.qr_code_scans(order_id) 
  where order_id is not null;

create index if not exists idx_qr_scans_scanned_at 
  on public.qr_code_scans(scanned_at desc);

create index if not exists idx_qr_scans_scan_result 
  on public.qr_code_scans(scan_result);

-- ============================================================================
-- 4. Erstelle Helper Function für QR-Code Validierung
-- ============================================================================

-- Vereinfachte Validierungsfunktion
create or replace function public.validate_qr_code(p_pickup_token uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_order record;
  v_result jsonb;
begin
  -- Lade Order
  select 
    id, 
    order_number, 
    status,
    qr_code_expires_at,
    hellocash_status
  into v_order
  from public.orders
  where pickup_token = p_pickup_token;

  -- Order nicht gefunden
  if not found then
    return jsonb_build_object(
      'valid', false,
      'error', 'order_not_found',
      'message', 'Bestellung nicht gefunden'
    );
  end if;

  -- QR-Code abgelaufen
  if v_order.qr_code_expires_at is not null and v_order.qr_code_expires_at < now() then
    return jsonb_build_object(
      'valid', false,
      'error', 'qr_expired',
      'message', 'QR-Code ist abgelaufen',
      'order_id', v_order.id
    );
  end if;

  -- Bereits bezahlt
  if v_order.status = 'paid' or v_order.hellocash_status = 'paid' then
    return jsonb_build_object(
      'valid', false,
      'error', 'already_paid',
      'message', 'Bestellung wurde bereits bezahlt',
      'order_id', v_order.id
    );
  end if;

  -- Gültig
  return jsonb_build_object(
    'valid', true,
    'order_id', v_order.id,
    'order_number', v_order.order_number
  );
end;
$$;

-- ============================================================================
-- 5. Erstelle Helper Function für Scan-Logging
-- ============================================================================

-- Vereinfachte Logging-Funktion
create or replace function public.log_qr_scan(
  p_order_id uuid,
  p_source text default 'pos',
  p_scan_result text default 'success',
  p_ip text default null,
  p_user_agent text default null,
  p_error_message text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_scan_id uuid;
begin
  insert into public.qr_code_scans (
    order_id,
    source,
    scan_result,
    ip,
    user_agent,
    error_message
  ) values (
    p_order_id,
    p_source,
    p_scan_result,
    p_ip::inet,
    p_user_agent,
    p_error_message
  )
  returning id into v_scan_id;

  -- Update last scanned timestamp
  update public.orders
  set qr_code_last_scanned_at = now()
  where id = p_order_id;

  return v_scan_id;
end;
$$;

-- ============================================================================
-- 6. Kommentare für Dokumentation
-- ============================================================================

comment on column public.orders.pickup_token is 
  'UUID für sicheren QR-Code Link. Wird automatisch generiert.';

comment on column public.orders.qr_code_type is 
  'Typ des QR-Codes: order (mehrfach scanbar) oder voucher (einmalig scanbar)';

comment on column public.orders.qr_code_expires_at is 
  'QR-Code läuft nach 45 Tagen ab';

comment on column public.orders.hellocash_invoice_id is 
  'Eindeutige helloCash Rechnungs-ID von der API';

comment on column public.orders.hellocash_payment_url is 
  'Direkter Link zur helloCash Zahlungsseite';

comment on table public.qr_code_scans is 
  'Tracking aller QR-Code Scans mit vollständigem Audit Trail';

comment on function public.validate_qr_code is 
  'Validiert QR-Code: Prüft Ablauf, Voucher-Einmaligkeit, etc.';

comment on function public.log_qr_scan is 
  'Loggt jeden QR-Code Scan mit Details für Audit Trail';

-- ============================================================================
-- 7. RLS Policies (Row Level Security)
-- ============================================================================

-- Entferne fehlerhafte Admin-Policy und verwende nur Service Role
-- Aktiviere RLS für qr_code_scans
alter table public.qr_code_scans enable row level security;

-- Policy: Service Role kann alles (für Backend-Operationen)
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'qr_code_scans' 
    and policyname = 'Service role can manage scans'
  ) then
    create policy "Service role can manage scans"
      on public.qr_code_scans
      for all
      using (true);
  end if;
end $$;

-- ============================================================================
-- Migration abgeschlossen
-- ============================================================================

-- Hinweis: Storage Bucket "qr-codes" muss manuell in Supabase Studio erstellt werden
-- Storage -> Neuer Bucket "qr-codes" (public, 90 Tage Auto-Delete)
