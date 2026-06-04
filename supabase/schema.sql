-- =============================================================
-- Inventory WhatsApp MVP — Database schema
-- Run this in the Supabase SQL Editor (one time).
-- =============================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ---------- Helper: updated_at trigger ----------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------- products ----------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  unit text not null,
  current_stock numeric not null default 0,
  min_stock numeric not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
  before update on products
  for each row execute function set_updated_at();

create index if not exists idx_products_is_active on products (is_active);

-- ---------- stock_movements ----------
create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  movement_type text not null check (movement_type in ('IN', 'OUT', 'ADJUSTMENT')),
  qty numeric not null,
  stock_before numeric not null,
  stock_after numeric not null,
  source text not null default 'WHATSAPP',
  phone_number text,
  note text,
  raw_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_movements_product on stock_movements (product_id);
create index if not exists idx_movements_created on stock_movements (created_at desc);
create index if not exists idx_movements_type on stock_movements (movement_type);

-- ---------- pending_stock_commands ----------
create table if not exists pending_stock_commands (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,
  product_id uuid not null references products(id),
  movement_type text not null check (movement_type in ('IN', 'OUT', 'ADJUSTMENT')),
  qty numeric not null,
  raw_message text not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_pending_updated_at on pending_stock_commands;
create trigger trg_pending_updated_at
  before update on pending_stock_commands
  for each row execute function set_updated_at();

create index if not exists idx_pending_phone_status
  on pending_stock_commands (phone_number, status, created_at desc);

-- ---------- allowed_whatsapp_numbers ----------
create table if not exists allowed_whatsapp_numbers (
  id uuid primary key default gen_random_uuid(),
  phone_number text unique not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =============================================================
-- Row Level Security
-- All access goes through the server using the service role key,
-- which bypasses RLS. We enable RLS with NO public policies so
-- the anon/public key cannot read or write anything.
-- =============================================================
alter table products enable row level security;
alter table stock_movements enable row level security;
alter table pending_stock_commands enable row level security;
alter table allowed_whatsapp_numbers enable row level security;

-- =============================================================
-- Atomic stock-apply RPC
-- Confirms a pending command: re-reads stock, writes the movement,
-- updates the product, and marks the pending command CONFIRMED,
-- all inside a single transaction. Returns the resulting row.
-- =============================================================
create or replace function apply_pending_command(p_pending_id uuid)
returns table (
  product_id uuid,
  product_name text,
  unit text,
  movement_type text,
  qty numeric,
  stock_before numeric,
  stock_after numeric
)
language plpgsql
as $$
declare
  v_pending pending_stock_commands%rowtype;
  v_product products%rowtype;
  v_before numeric;
  v_after numeric;
begin
  -- Lock the pending command row
  select * into v_pending
  from pending_stock_commands
  where id = p_pending_id and status = 'PENDING'
  for update;

  if not found then
    raise exception 'PENDING_NOT_FOUND';
  end if;

  if v_pending.expires_at < now() then
    update pending_stock_commands set status = 'EXPIRED' where id = p_pending_id;
    raise exception 'PENDING_EXPIRED';
  end if;

  -- Lock the product row and read current stock
  select * into v_product
  from products
  where id = v_pending.product_id
  for update;

  if not found then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;

  v_before := v_product.current_stock;

  if v_pending.movement_type = 'IN' then
    v_after := v_before + v_pending.qty;
  elsif v_pending.movement_type = 'OUT' then
    v_after := v_before - v_pending.qty;
  else -- ADJUSTMENT
    v_after := v_pending.qty;
  end if;

  -- Write movement
  insert into stock_movements (
    product_id, movement_type, qty, stock_before, stock_after,
    source, phone_number, raw_message
  ) values (
    v_pending.product_id, v_pending.movement_type, v_pending.qty,
    v_before, v_after, 'WHATSAPP', v_pending.phone_number, v_pending.raw_message
  );

  -- Update product stock
  update products set current_stock = v_after where id = v_pending.product_id;

  -- Mark pending confirmed
  update pending_stock_commands set status = 'CONFIRMED' where id = p_pending_id;

  return query
  select v_pending.product_id, v_product.name, v_product.unit,
         v_pending.movement_type, v_pending.qty, v_before, v_after;
end;
$$;

-- =============================================================
-- Atomic manual-movement RPC (admin dashboard / emergency correction)
-- =============================================================
create or replace function apply_manual_movement(
  p_product_id uuid,
  p_movement_type text,
  p_qty numeric,
  p_note text default null
)
returns table (
  stock_before numeric,
  stock_after numeric
)
language plpgsql
as $$
declare
  v_product products%rowtype;
  v_before numeric;
  v_after numeric;
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
  else
    v_after := p_qty;
  end if;

  insert into stock_movements (
    product_id, movement_type, qty, stock_before, stock_after, source, note
  ) values (
    p_product_id, p_movement_type, p_qty, v_before, v_after, 'ADMIN', p_note
  );

  update products set current_stock = v_after where id = p_product_id;

  return query select v_before, v_after;
end;
$$;
