-- =============================================================
-- Pricing & revenue enhancement migration.
-- Run this once in the Supabase SQL Editor (after schema.sql).
-- Safe to re-run.
-- =============================================================

-- ---------- New columns ----------
alter table products
  add column if not exists selling_price numeric not null default 0;
alter table products
  add column if not exists cost_price numeric default 0;

alter table stock_movements
  add column if not exists unit_price numeric not null default 0;
alter table stock_movements
  add column if not exists total_amount numeric not null default 0;

-- Helpful index for revenue queries (OUT movements over time).
create index if not exists idx_movements_out_created
  on stock_movements (created_at)
  where movement_type = 'OUT';

-- =============================================================
-- Unified, immediate stock-movement executor with price snapshot.
-- Used by BOTH the WhatsApp webhook (immediate, no confirmation) and
-- the admin manual-correction page.
--
-- Price snapshot rules:
--   OUT         -> unit_price = product.selling_price (at this moment)
--                  total_amount = qty * unit_price
--   IN / ADJUST -> unit_price = 0, total_amount = 0
--
-- All read+write happens inside one locked transaction.
-- =============================================================
create or replace function execute_stock_movement(
  p_product_id uuid,
  p_movement_type text,
  p_qty numeric,
  p_source text default 'WHATSAPP',
  p_phone_number text default null,
  p_raw_message text default null,
  p_note text default null
)
returns table (
  product_id uuid,
  product_name text,
  unit text,
  movement_type text,
  qty numeric,
  stock_before numeric,
  stock_after numeric,
  unit_price numeric,
  total_amount numeric,
  selling_price numeric
)
language plpgsql
as $$
declare
  v_product products%rowtype;
  v_before numeric;
  v_after numeric;
  v_unit_price numeric := 0;
  v_total numeric := 0;
begin
  if p_movement_type not in ('IN', 'OUT', 'ADJUSTMENT') then
    raise exception 'INVALID_MOVEMENT_TYPE';
  end if;
  if p_qty <= 0 then
    raise exception 'INVALID_QTY';
  end if;

  select * into v_product from products where id = p_product_id for update;
  if not found then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;

  v_before := v_product.current_stock;

  if p_movement_type = 'IN' then
    v_after := v_before + p_qty;
  elsif p_movement_type = 'OUT' then
    v_after := v_before - p_qty;
    v_unit_price := coalesce(v_product.selling_price, 0);
    v_total := p_qty * v_unit_price;
  else -- ADJUSTMENT
    v_after := p_qty;
  end if;

  insert into stock_movements (
    product_id, movement_type, qty, stock_before, stock_after,
    source, phone_number, raw_message, note, unit_price, total_amount
  ) values (
    p_product_id, p_movement_type, p_qty, v_before, v_after,
    p_source, p_phone_number, p_raw_message, p_note, v_unit_price, v_total
  );

  update products set current_stock = v_after where id = p_product_id;

  return query
  select p_product_id, v_product.name, v_product.unit, p_movement_type,
         p_qty, v_before, v_after, v_unit_price, v_total,
         coalesce(v_product.selling_price, 0);
end;
$$;

-- Optional: give the seed products example prices for quick testing.
-- update products set selling_price = 15000 where slug = 'beras';
-- update products set selling_price = 20000 where slug = 'gula';
