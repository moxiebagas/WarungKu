-- =============================================================
-- Seed initial products. Safe to re-run (upsert on slug).
-- =============================================================
insert into products (name, slug, unit, min_stock) values
  ('Beras',          'beras',          'kg',     20),
  ('Minyak',         'minyak',         'karton', 5),
  ('Gula',           'gula',           'kg',     10),
  ('Telur',          'telur',          'kg',     5),
  ('Gas LPG 3kg',    'gas-lpg-3kg',    'tabung', 5),
  ('Indomie Goreng', 'indomie-goreng', 'dus',    3),
  ('Indomie Rebus',  'indomie-rebus',  'dus',    3),
  ('Aqua Galon',     'aqua-galon',     'galon',  5),
  ('Kopi Sachet',    'kopi-sachet',    'renceng',5),
  ('Tepung Terigu',  'tepung-terigu',  'kg',     5)
on conflict (slug) do update
  set name = excluded.name,
      unit = excluded.unit,
      min_stock = excluded.min_stock;

-- Optional: register an allowed WhatsApp number for testing.
-- Replace with the parents' real number in international format (e.g. 6281234567890).
-- insert into allowed_whatsapp_numbers (phone_number, name) values
--   ('6281234567890', 'Ibu') on conflict (phone_number) do nothing;
