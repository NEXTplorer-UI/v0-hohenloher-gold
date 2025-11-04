-- Migration: Add VAT Rate (Mehrwertsteuer) to products and order_items
-- Created: 2025-01-04
-- Purpose: Enable correct tax calculation for helloCash invoices

-- 1. Add vat_rate to products table
alter table public.products 
  add column if not exists vat_rate numeric(4,2) default 7.00 
  check (vat_rate >= 0 and vat_rate <= 100);

comment on column public.products.vat_rate is 'Mehrwertsteuersatz in Prozent (7% für Lebensmittel, 19% für Alkohol)';

-- 2. Add vat_rate to order_items table (for historical accuracy)
alter table public.order_items 
  add column if not exists vat_rate numeric(4,2)
  check (vat_rate >= 0 and vat_rate <= 100);

comment on column public.order_items.vat_rate is 'Mehrwertsteuersatz zum Zeitpunkt der Bestellung (historisch)';

-- 3. Set correct VAT rates for existing products based on category
-- Lebensmittel: 7%
update public.products 
set vat_rate = 7.00
where category_id in (
  select id from public.categories 
  where name in ('Südfrüchte', 'Öle & Essig', 'Honig', 'Nüsse & Trockenfrüchte', 'Gewürze')
);

-- Alkohol: 19%
update public.products 
set vat_rate = 19.00
where category_id in (
  select id from public.categories 
  where name in ('Wein', 'Spirituosen', 'Bier')
);

-- 4. Update existing order_items with vat_rate from products
update public.order_items oi
set vat_rate = p.vat_rate
from public.products p
where oi.product_id = p.id
  and oi.vat_rate is null;

-- 5. Create index for performance
create index if not exists idx_products_vat_rate on public.products(vat_rate);

-- 6. Add trigger to automatically copy vat_rate from products to order_items
create or replace function copy_vat_rate_to_order_items()
returns trigger as $$
begin
  -- Copy vat_rate from product if not explicitly set
  if new.vat_rate is null and new.product_id is not null then
    select vat_rate into new.vat_rate
    from products
    where id = new.product_id;
  end if;
  
  return new;
end;
$$ language plpgsql;

create trigger trigger_copy_vat_rate_to_order_items
  before insert on public.order_items
  for each row
  execute function copy_vat_rate_to_order_items();

comment on function copy_vat_rate_to_order_items is 'Automatically copies vat_rate from products to order_items on insert';
