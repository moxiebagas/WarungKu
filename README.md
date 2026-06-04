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
3. Then run [`supabase/seed.sql`](supabase/seed.sql) to load the sample products.
4. From **Project Settings → API**, copy the Project URL, the `anon` key,
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
| `beras -5` | Reduce 5 from Beras |
| `stok beras 10` | Set Beras stock to exactly 10 |
| `cek beras` | Show current stock of Beras |
| `stok` | Show full stock summary (low stock first) |
| `1` | Confirm the latest pending command |
| `2` | Cancel the latest pending command |

Every stock-changing command asks for confirmation first and expires after
**5 minutes**.

## Dashboard pages

- `/dashboard` — summary cards, low-stock list, recent movements, charts
- `/products` — manage products (create / edit / activate-deactivate)
- `/stock` — manual stock correction (admin/emergency only)
- `/history` — full movement history with filters
- `/settings/whatsapp` — manage allowed WhatsApp numbers

> Note: this MVP keeps the dashboard open (no login) per the simplicity
> requirement. Before exposing it publicly, put it behind Vercel password
> protection or add auth.
