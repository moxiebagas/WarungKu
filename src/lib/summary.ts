import "server-only";
import { getProducts } from "./queries";
import {
  getRevenueByProduct,
  getRevenueByPaymentMethod,
  getRevenueSummary,
  periodToRange,
} from "./revenue";
import { formatQty, formatRupiah } from "./format";

/**
 * Build the daily sales summary text for "today" (Asia/Jakarta):
 * items sold, qty + amount per item, overall total, and remaining stock
 * for all active products.
 */
export async function buildDailySummaryMessage(now = new Date()): Promise<string> {
  const range = periodToRange("today", now);

  const [byProduct, byPayment, products] = await Promise.all([
    getRevenueByProduct(range),
    getRevenueByPaymentMethod(range),
    getProducts(),
  ]);

  const dateLabel = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeZone: "Asia/Jakarta",
  }).format(now);

  const lines: string[] = [`📊 Ringkasan Penjualan Hari Ini`, dateLabel, ""];

  if (byProduct.length === 0) {
    lines.push("Belum ada penjualan hari ini.");
  } else {
    lines.push("Penjualan:");
    for (const r of byProduct) {
      lines.push(`- ${r.name}: ${formatQty(r.qty)} ${r.unit} (${formatRupiah(r.revenue)})`);
    }

    lines.push("", "Rincian Metode Bayar:");
    for (const p of byPayment) {
      lines.push(`- ${p.label}: ${formatRupiah(p.revenue)}`);
    }

    const total = byProduct.reduce((s, r) => s + r.revenue, 0);
    lines.push("", `Total Penjualan: ${formatRupiah(total)}`);
  }

  lines.push("", "Sisa Stok:");
  const active = products.filter((p) => p.is_active);
  if (active.length === 0) {
    lines.push("- (belum ada barang)");
  } else {
    for (const p of active) {
      const low = p.current_stock <= p.min_stock ? " ⚠️" : "";
      lines.push(`- ${p.name}: ${formatQty(p.current_stock)} ${p.unit}${low}`);
    }
  }

  return lines.join("\n");
}

/**
 * Build a quick revenue report: totals for today / this week / this month /
 * this year, plus this month's payment-method breakdown.
 */
export async function buildRevenueReportMessage(now = new Date()): Promise<string> {
  const [today, week, month, year, byPayment] = await Promise.all([
    getRevenueSummary("today"),
    getRevenueSummary("week"),
    getRevenueSummary("month"),
    getRevenueSummary("year"),
    getRevenueByPaymentMethod(periodToRange("month", now)),
  ]);

  return [
    "📈 Laporan Pendapatan",
    "",
    `Hari ini: ${formatRupiah(today)}`,
    `Minggu ini: ${formatRupiah(week)}`,
    `Bulan ini: ${formatRupiah(month)}`,
    `Tahun ini: ${formatRupiah(year)}`,
    "",
    "Metode Bayar (bulan ini):",
    ...byPayment.map((p) => `- ${p.label}: ${formatRupiah(p.revenue)}`),
  ].join("\n");
}
