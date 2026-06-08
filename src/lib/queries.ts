import "server-only";
import { getSupabaseAdmin } from "./supabase/admin";
import type { Product, StockMovement } from "./types";
import {
  getAllRevenueSummary,
  getDailyRevenueSeries,
  getMonthlyRevenueSeries,
  getTopProductsByRevenue,
  getTopProductsByQuantity,
  getRevenueByPaymentMethod,
  periodToRange,
  type Period,
  type RevenueByProductRow,
  type RevenueByPaymentRow,
} from "./revenue";
import { jakartaDateKey, dayLabel, shortDateLabel, monthLabel } from "./datetime";

export interface MovementWithProduct extends StockMovement {
  products: { name: string; unit: string } | null;
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
  revenue: Record<Period, number>;
  totalStockValue: number;
  totalProducts: number;
  lowStockCount: number;
  missingPriceCount: number;
  dailyRevenue: { label: string; revenue: number }[];
  monthlyRevenue: { label: string; revenue: number }[];
  topByRevenue: RevenueByProductRow[];
  topByQuantity: RevenueByProductRow[];
  paymentBreakdown: RevenueByPaymentRow[];
  weekly: { day: string; IN: number; OUT: number }[];
  recentSales: MovementWithProduct[];
  lowStockProducts: Product[];
  missingPriceProducts: Product[];
  lastUpdate: string | null;
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthRange = periodToRange("month", now);

  const [
    revenue,
    dailyRaw,
    monthlyRaw,
    topByRevenue,
    topByQuantity,
    paymentBreakdown,
    { data: products },
    { data: weekMovements },
    { data: recent },
  ] = await Promise.all([
    getAllRevenueSummary(),
    getDailyRevenueSeries(30, now),
    getMonthlyRevenueSeries(12, now),
    getTopProductsByRevenue(monthRange, 10),
    getTopProductsByQuantity(monthRange, 10),
    getRevenueByPaymentMethod(monthRange),
    supabase.from("products").select("*").eq("is_active", true),
    supabase.from("stock_movements").select("*").gte("created_at", sevenDaysAgo.toISOString()),
    supabase
      .from("stock_movements")
      .select("*, products(name, unit)")
      .eq("movement_type", "OUT")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const activeProducts = (products ?? []) as Product[];
  const week = (weekMovements ?? []) as StockMovement[];
  const recentSales = (recent ?? []) as MovementWithProduct[];

  const lowStockProducts = activeProducts
    .filter((p) => p.current_stock <= p.min_stock)
    .sort((a, b) => a.current_stock - b.current_stock);

  const missingPriceProducts = activeProducts
    .filter((p) => Number(p.selling_price) <= 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalStockValue = activeProducts.reduce(
    (sum, p) => sum + Number(p.current_stock) * Number(p.selling_price),
    0
  );

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

  return {
    revenue,
    totalStockValue,
    totalProducts: activeProducts.length,
    lowStockCount: lowStockProducts.length,
    missingPriceCount: missingPriceProducts.length,
    dailyRevenue: dailyRaw.map((r) => ({ label: shortDateLabel(r.date), revenue: r.revenue })),
    monthlyRevenue: monthlyRaw.map((r) => ({ label: monthLabel(r.month), revenue: r.revenue })),
    topByRevenue,
    topByQuantity,
    paymentBreakdown,
    weekly,
    recentSales,
    lowStockProducts,
    missingPriceProducts,
    lastUpdate: recentSales[0]?.created_at ?? null,
  };
}
