# Stok Toko — Inventory MVP (WhatsApp + Dashboard)

A simple, low-cost inventory app for a small family grocery store.
Parents update stock from **WhatsApp** (via the Fonnte gateway); the admin
monitors everything from a **web dashboard**.

## Stack

Next.js (App Router) · TypeScript · Supabase (PostgreSQL) · Tailwind CSS ·
shadcn/ui-style components · Recharts · Fonnte WhatsApp webhook · Vercel.

## 1. Database setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql).
3. Run [`supabase/migration_pricing.sql`](supabase/migration_pricing.sql) to add
   pricing/revenue columns and the immediate-execution RPC. (Required.)
4. Then run [`supabase/seed.sql`](supabase/seed.sql) to load the sample products.
5. From **Project Settings → API**, copy the Project URL, the `anon` key,
   and the `service_role` key.

RLS is enabled on every table with no public policies — all access goes
through the server using the service role key, which never reaches the browser.

## 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

| Variable | Notes |
| --- | --- |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only.** Never expose to the client. |
| `SUPABASE_ANON_KEY` | Public anon key (kept for completeness) |
| `FONNTE_TOKEN` | Device token from [md.fonnte.com](https://md.fonnte.com/) |
| `ALLOW_NEGATIVE_STOCK` | `true` to permit OUT below zero (default `false`) |

## 3. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 → redirects to `/dashboard`.

## 4. Register an allowed WhatsApp number

Dashboard → **Nomor WA** → add the parents' number in international format
(e.g. `6281234567890`). Only registered, active numbers can update stock.

## 5. Deploy to Vercel & connect Fonnte

1. Push to GitHub and import the repo into Vercel.
2. Add the same environment variables in Vercel.
3. Deploy. Your webhook URL is `https://<your-app>.vercel.app/api/webhooks/fonnte`.
4. In the Fonnte device settings, set that URL as the **incoming webhook**.

A `GET` on the webhook URL returns `{ "ok": true }` for a quick health check.

## WhatsApp commands

| Command | Meaning |
| --- | --- |
| `beras +25` | Add 25 to Beras |
| `beras -5` | Reduce 5 from Beras (recorded as a sale → revenue) |
| `stok beras 10` | Set Beras stock to exactly 10 |
| `harga beras 15000` | Set Beras selling price (also `set harga beras 15000`, `beras harga 15000`) |
| `cek beras` | Show Beras stock, price, and stock value |
| `cek harga beras` | Show Beras selling price |
| `stok` | Show full stock summary (low stock first) |

Commands execute **immediately** once valid — there is no confirmation step.
Prices accept Indonesian formats (`15000`, `15.000`, `15,000`).

**Revenue** is recorded only from `OUT` (sale) movements: at the moment of the
sale the product's current `selling_price` is snapshotted into
`stock_movements.unit_price`, and `total_amount = qty × unit_price`. Reports sum
`total_amount`, so changing a product's price never alters historical revenue.

## Dashboard pages

- `/dashboard` — revenue cards (today → year), stock value, revenue charts (daily 30d, monthly 12m, top products by revenue/qty), IN vs OUT, recent sales, low-stock, products without a price
- `/reports` — revenue reports with period shortcuts + custom date range + product filter; revenue by product and by date; CSV export
- `/products` — manage products incl. selling/cost price and stock value
- `/stock` — manual stock correction (admin/emergency only)
- `/history` — full movement history with filters
- `/settings/whatsapp` — manage allowed WhatsApp numbers

> Note: this MVP keeps the dashboard open (no login) per the simplicity
> requirement. Before exposing it publicly, put it behind Vercel password
> protection or add auth.
