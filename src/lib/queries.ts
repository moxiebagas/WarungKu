import "server-only";
import { getSupabaseAdmin } from "./supabase/admin";
import type { Product, StockMovement } from "./types";

export interface MovementWithProduct extends StockMovement {
  products: { name: string; unit: string } | null;
}

const JAKARTA = "Asia/Jakarta";

/** YYYY-MM-DD in Asia/Jakarta. */
function jakartaDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: JAKARTA }).format(d);
}

/** Short day label (e.g. "Sen 03") in Asia/Jakarta. */
function dayLabel(key: string): string {
  const d = new Date(`${key}T00:00:00+07:00`);
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "2-digit",
    timeZone: JAKARTA,
  }).format(d);
}

export async function getProducts(): Promise<Product[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Product[];
}

export interface DashboardData {
  totalProducts: number;
  lowStockCount: number;
  movementsToday: number;
  lastUpdate: string | null;
  lowStockProducts: Product[];
  recentMovements: MovementWithProduct[];
  weekly: { day: string; IN: number; OUT: number }[];
  topProducts: { name: string; count: number }[];
  lowStockChart: { name: string; stok: number; minimum: number }[];
  inOutTotals: { name: string; value: number }[];
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = getSupabaseAdmin();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const todayKey = jakartaDateKey(now);

  const [{ data: products }, { data: weekMovements }, { data: monthMovements }, { data: recent }] =
    await Promise.all([
      supabase.from("products").select("*").eq("is_active", true),
      supabase
        .from("stock_movements")
        .select("*")
        .gte("created_at", sevenDaysAgo.toISOString()),
      supabase
        .from("stock_movements")
        .select("product_id, products(name)")
        .gte("created_at", thirtyDaysAgo.toISOString()),
      supabase
        .from("stock_movements")
        .select("*, products(name, unit)")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const activeProducts = (products ?? []) as Product[];
  const week = (weekMovements ?? []) as StockMovement[];
  const recentMovements = (recent ?? []) as MovementWithProduct[];

  const lowStockProducts = activeProducts
    .filter((p) => p.current_stock <= p.min_stock)
    .sort((a, b) => a.current_stock - b.current_stock);

  // ----- Weekly IN/OUT series (last 7 days) -----
  const dayKeys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    dayKeys.push(jakartaDateKey(new Date(now.getTime() - i * 24 * 60 * 60 * 1000)));
  }
  const weeklyMap = new Map<string, { IN: number; OUT: number }>();
  dayKeys.forEach((k) => weeklyMap.set(k, { IN: 0, OUT: 0 }));
  for (const m of week) {
    const key = jakartaDateKey(new Date(m.created_at));
    const slot = weeklyMap.get(key);
    if (!slot) continue;
    if (m.movement_type === "IN") slot.IN += Number(m.qty);
    else if (m.movement_type === "OUT") slot.OUT += Number(m.qty);
  }
  const weekly = dayKeys.map((k) => ({
    day: dayLabel(k),
    IN: weeklyMap.get(k)!.IN,
    OUT: weeklyMap.get(k)!.OUT,
  }));

  const inOutTotals = [
    { name: "Masuk", value: week.filter((m) => m.movement_type === "IN").reduce((s, m) => s + Number(m.qty), 0) },
    { name: "Keluar", value: week.filter((m) => m.movement_type === "OUT").reduce((s, m) => s + Number(m.qty), 0) },
  ];

  // ----- Top 10 most-updated products (last 30 days) -----
  const counts = new Map<string, number>();
  for (const m of (monthMovements ?? []) as unknown as {
    products: { name: string } | null;
  }[]) {
    const name = m.products?.name ?? "?";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const topProducts = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // ----- Low-stock chart -----
  const lowStockChart = lowStockProducts.slice(0, 10).map((p) => ({
    name: p.name,
    stok: Number(p.current_stock),
    minimum: Number(p.min_stock),
  }));

  const movementsToday = week.filter(
    (m) => jakartaDateKey(new Date(m.created_at)) === todayKey
  ).length;

  const lastUpdate = recentMovements[0]?.created_at ?? null;

  return {
    totalProducts: activeProducts.length,
    lowStockCount: lowStockProducts.length,
    movementsToday,
    lastUpdate,
    lowStockProducts,
    recentMovements,
    weekly,
    topProducts,
    lowStockChart,
    inOutTotals,
  };
}
