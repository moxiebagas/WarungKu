-- =============================================================
-- Payment method + low-stock alert support.
-- Run once in the Supabase SQL Editor (after migration_pricing.sql).
-- Safe to re-run.
-- =============================================================

-- ---------- Payment method on movements ----------
alter table stock_movements
  add column if not exists payment_method text
  check (payment_method in ('cash', 'qris', 'hutang'));

create index if not exists idx_movements_payment
  on stock_movements (payment_method)
  where movement_type = 'OUT';

-- ---------- Re-create the executor with payment_method + min_stock return ----------
drop function if exists execute_stock_movement(uuid, text, numeric, text, text, text, text);

create or replace function execute_stock_movement(
  p_product_id uuid,
  p_movement_type text,
  p_qty numeric,
  p_source text default 'WHATSAPP',
  p_phone_number text default null,
  p_raw_message text default null,
  p_note text default null,
  p_payment_method text default null
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
  selling_price numeric,
  min_stock numeric,
  payment_method text
)
language plpgsql
as $$
declare
  v_product products%rowtype;
  v_before numeric;
  v_after numeric;
  v_unit_price numeric := 0;
  v_total numeric := 0;
  v_payment text := null;
begin
  if p_movement_type not in ('IN', 'OUT', 'ADJUSTMENT') then
    raise exception 'INVALID_MOVEMENT_TYPE';
  end if;
  if p_qty <= 0 then
    raise exception 'INVALID_QTY';
  end if;
  if p_payment_method is not null and p_payment_method not in ('cash', 'qris', 'hutang') then
    raise exception 'INVALID_PAYMENT_METHOD';
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
    v_payment := coalesce(p_payment_method, 'cash');
  else -- ADJUSTMENT
    v_after := p_qty;
  end if;

  insert into stock_movements (
    product_id, movement_type, qty, stock_before, stock_after,
    source, phone_number, raw_message, note, unit_price, total_amount, payment_method
  ) values (
    p_product_id, p_movement_type, p_qty, v_before, v_after,
    p_source, p_phone_number, p_raw_message, p_note, v_unit_price, v_total, v_payment
  );

  update products set current_stock = v_after where id = p_product_id;

  return query
  select p_product_id, v_product.name, v_product.unit, p_movement_type,
         p_qty, v_before, v_after, v_unit_price, v_total,
         coalesce(v_product.selling_price, 0), v_product.min_stock, v_payment;
end;
$$;
