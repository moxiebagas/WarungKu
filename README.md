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
4. Run [`supabase/migration_payments.sql`](supabase/migration_payments.sql) to add
   the `payment_method` column and the low-stock-alert RPC return. (Required.)
5. Run [`supabase/migration_v3_in_payment.sql`](supabase/migration_v3_in_payment.sql)
   so IN (purchase) transactions also store their payment method. (Required.)
6. Then run [`supabase/seed.sql`](supabase/seed.sql) to load the sample products.
7. From **Project Settings → API**, copy the Project URL, the `anon` key,
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
| `WHATSAPP_GROUP_ID` | Fonnte group id (e.g. `1203...@g.us`) for daily summaries + low-stock alerts |
| `CRON_SECRET` | Secret protecting the daily-summary cron endpoint (Vercel sends it automatically) |
| `ALLOW_NEGATIVE_STOCK` | `true` to permit OUT below zero (default `false`) |

### Daily summary & low-stock alerts

- **Daily summary** is sent to `WHATSAPP_GROUP_ID` every day via Vercel Cron —
  see [`vercel.json`](vercel.json), scheduled at `0 15 * * *` UTC = **22:00 WIB**.
  Change the cron expression if your timezone differs. Test manually with
  `GET /api/cron/daily-summary?secret=<CRON_SECRET>`.
- **Low-stock alert** fires in real time to the same group the moment a sale
  pushes a product's stock to or below its `min_stock` (only on the crossing
  transaction, so it won't spam on every subsequent sale).

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
| `beras 10 cash` | Stock **in** (purchase) 10 Beras, payment cash |
| `beras -3 cash` | Stock **out** (sold) 3 Beras, payment cash |
| `minyak 5 qris` / `gula 20 hutang` | Same, with QRIS / Hutang |
| `stok beras 10` | Set Beras stock to exactly 10 (correction) |
| `harga beras 15000` | Set Beras selling price (also `set harga beras 15000`, `beras harga 15000`) |
| `cek beras` | Show Beras stock, price, and stock value |
| `cek harga beras` | Show Beras selling price |
| `stok` | Show full stock summary (low stock first) |

Canonical format: **`[barang] [qty] [cash|qris|hutang]`** — a positive qty
(or `+`) is a stock-in/purchase, a negative qty (`-`) is a sale. Backward-compatible
forms still work: `jual <product> <qty> <method>`, and bare `<product> +/-<qty>`
(an OUT without a method defaults to `cash`). The payment method is stored on every
IN/OUT transaction and drives the payment breakdowns in reports, charts, and the
daily summary.

Invalid commands from a registered group member are answered with the command
examples above. Messages from unregistered senders, personal chats, and other
groups are ignored silently.

## Group operation

Warungku runs inside **one dedicated WhatsApp group**.

1. Create a WhatsApp group and add the Fonnte device number + the registered users.
2. Send any message in the group, then read your Vercel logs — the webhook logs
   `extracted {"isGroup":true,"groupId":"...","sender":"..."}`. Copy that `groupId`.
3. Set it as `WHATSAPP_GROUP_ID` (and redeploy). From then on:
   - only messages from that group are processed (personal chats / other groups are ignored),
   - replies, daily summaries, and low-stock alerts all go to that group.

> If `WHATSAPP_GROUP_ID` is **unset**, the app falls back to legacy personal-chat
> mode (replies to the sender) so local testing still works.

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
