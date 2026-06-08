import "server-only";
import { getSupabaseAdmin } from "./supabase/admin";
import type { PaymentMethod } from "./types";
import { PAYMENT_METHODS, PAYMENT_LABEL } from "./types";
import {
  jakartaDateKey,
  jakartaMonthKey,
  monthsAgoJakarta,
  startOfMonthJakarta,
  startOfTodayJakarta,
  startOfWeekJakarta,
  startOfYearJakarta,
} from "./datetime";

export type Period = "today" | "week" | "month" | "3month" | "6month" | "year";

export interface DateRange {
  start: Date;
  end: Date;
}

/** Raw OUT movement row used for revenue calculations. */
interface OutRow {
  qty: number;
  total_amount: number;
  unit_price: number;
  created_at: string;
  product_id: string;
  payment_method: PaymentMethod | null;
  products: { name: string; unit: string } | null;
}

/** Convert a period shortcut into a concrete [start, end] range (end = now). */
export function periodToRange(period: Period, now = new Date()): DateRange {
  const end = now;
  switch (period) {
    case "today":
      return { start: startOfTodayJakarta(now), end };
    case "week":
      return { start: startOfWeekJakarta(now), end };
    case "month":
      return { start: startOfMonthJakarta(now), end };
    case "3month":
      return { start: monthsAgoJakarta(3, now), end };
    case "6month":
      return { start: monthsAgoJakarta(6, now), end };
    case "year":
      return { start: startOfYearJakarta(now), end };
  }
}

/**
 * Fetch OUT movements within a range (optionally filtered by product).
 * The single source of truth for every revenue report — always reads the
 * stored total_amount snapshot, never the current product price.
 */
async function fetchOutMovements(
  range: DateRange,
  productId?: string,
  paymentMethod?: PaymentMethod
): Promise<OutRow[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("stock_movements")
    .select(
      "qty, total_amount, unit_price, created_at, product_id, payment_method, products(name, unit)"
    )
    .eq("movement_type", "OUT")
    .gte("created_at", range.start.toISOString())
    .lte("created_at", range.end.toISOString());

  if (productId) query = query.eq("product_id", productId);
  if (paymentMethod) query = query.eq("payment_method", paymentMethod);

  const { data, error } = await query;
  if (error) {
    console.error("[revenue] fetchOutMovements error", { message: error.message, range });
    throw error;
  }
  return (data ?? []) as unknown as OutRow[];
}

/** Total revenue for a period shortcut. */
export async function getRevenueSummary(period: Period): Promise<number> {
  const rows = await fetchOutMovements(periodToRange(period));
  return rows.reduce((sum, r) => sum + Number(r.total_amount), 0);
}

/** All six standard period totals in one go (for the dashboard cards). */
export async function getAllRevenueSummary(): Promise<Record<Period, number>> {
  const periods: Period[] = ["today", "week", "month", "3month", "6month", "year"];
  const values = await Promise.all(periods.map((p) => getRevenueSummary(p)));
  return periods.reduce((acc, p, i) => {
    acc[p] = values[i];
    return acc;
  }, {} as Record<Period, number>);
}

export interface RevenueByDateRow {
  date: string; // YYYY-MM-DD (Jakarta)
  revenue: number;
  qty: number;
}

/** Revenue grouped by Jakarta calendar day, ascending. */
export async function getRevenueByDate(
  range: DateRange,
  productId?: string,
  paymentMethod?: PaymentMethod
): Promise<RevenueByDateRow[]> {
  const rows = await fetchOutMovements(range, productId, paymentMethod);
  const map = new Map<string, { revenue: number; qty: number }>();
  for (const r of rows) {
    const key = jakartaDateKey(new Date(r.created_at));
    const slot = map.get(key) ?? { revenue: 0, qty: 0 };
    slot.revenue += Number(r.total_amount);
    slot.qty += Number(r.qty);
    map.set(key, slot);
  }
  return [...map.entries()]
    .map(([date, v]) => ({ date, revenue: v.revenue, qty: v.qty }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface RevenueByProductRow {
  productId: string;
  name: string;
  unit: string;
  revenue: number;
  qty: number;
}

/** Revenue grouped by product, sorted by revenue desc. */
export async function getRevenueByProduct(
  range: DateRange,
  productId?: string,
  paymentMethod?: PaymentMethod
): Promise<RevenueByProductRow[]> {
  const rows = await fetchOutMovements(range, productId, paymentMethod);
  const map = new Map<string, RevenueByProductRow>();
  for (const r of rows) {
    const slot = map.get(r.product_id) ?? {
      productId: r.product_id,
      name: r.products?.name ?? "?",
      unit: r.products?.unit ?? "",
      revenue: 0,
      qty: 0,
    };
    slot.revenue += Number(r.total_amount);
    slot.qty += Number(r.qty);
    map.set(r.product_id, slot);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

export async function getTopProductsByRevenue(
  range: DateRange,
  limit = 10
): Promise<RevenueByProductRow[]> {
  const rows = await getRevenueByProduct(range);
  return rows.slice(0, limit);
}

export async function getTopProductsByQuantity(
  range: DateRange,
  limit = 10
): Promise<RevenueByProductRow[]> {
  const rows = await getRevenueByProduct(range);
  return [...rows].sort((a, b) => b.qty - a.qty).slice(0, limit);
}

/** Daily revenue series for the last N days (filled, ascending). */
export async function getDailyRevenueSeries(
  days = 30,
  now = new Date()
): Promise<{ date: string; revenue: number }[]> {
  const start = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const byDate = await getRevenueByDate({ start: startOfDay(start), end: now });
  const map = new Map(byDate.map((r) => [r.date, r.revenue]));

  const series: { date: string; revenue: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = jakartaDateKey(new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
    series.push({ date: key, revenue: map.get(key) ?? 0 });
  }
  return series;
}

/** Monthly revenue series for the last N months (filled, ascending). */
export async function getMonthlyRevenueSeries(
  months = 12,
  now = new Date()
): Promise<{ month: string; revenue: number }[]> {
  const range = { start: monthsAgoJakarta(months - 1, now), end: now };
  const rows = await fetchOutMovements({ start: startOfMonthFromRange(range.start), end: now });

  const map = new Map<string, number>();
  for (const r of rows) {
    const key = jakartaMonthKey(new Date(r.created_at));
    map.set(key, (map.get(key) ?? 0) + Number(r.total_amount));
  }

  const series: { month: string; revenue: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const key = jakartaMonthKey(monthsAgoJakarta(i, now));
    series.push({ month: key, revenue: map.get(key) ?? 0 });
  }
  return series;
}

export interface RevenueByPaymentRow {
  method: PaymentMethod;
  label: string;
  revenue: number;
  qty: number;
}

/** Revenue grouped by payment method (always returns all three, in order). */
export async function getRevenueByPaymentMethod(
  range: DateRange,
  productId?: string
): Promise<RevenueByPaymentRow[]> {
  const rows = await fetchOutMovements(range, productId);
  const totals = new Map<PaymentMethod, { revenue: number; qty: number }>();
  for (const pm of PAYMENT_METHODS) totals.set(pm, { revenue: 0, qty: 0 });

  for (const r of rows) {
    const pm = (r.payment_method ?? "cash") as PaymentMethod;
    const slot = totals.get(pm);
    if (!slot) continue;
    slot.revenue += Number(r.total_amount);
    slot.qty += Number(r.qty);
  }

  return PAYMENT_METHODS.map((pm) => ({
    method: pm,
    label: PAYMENT_LABEL[pm],
    revenue: totals.get(pm)!.revenue,
    qty: totals.get(pm)!.qty,
  }));
}

function startOfDay(d: Date): Date {
  return startOfTodayJakarta(d);
}
function startOfMonthFromRange(d: Date): Date {
  return startOfMonthJakarta(d);
}
