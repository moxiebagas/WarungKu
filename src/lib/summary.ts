import "server-only";
import { getProducts } from "./queries";
import { getRevenueByProduct, periodToRange } from "./revenue";
import { formatQty, formatRupiah } from "./format";

/**
 * Build the daily sales summary text for "today" (Asia/Jakarta):
 * items sold, qty + amount per item, overall total, and remaining stock
 * for all active products.
 */
export async function buildDailySummaryMessage(now = new Date()): Promise<string> {
  const range = periodToRange("today", now);

  const [byProduct, products] = await Promise.all([
    getRevenueByProduct(range),
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
    lines.push("Terjual:");
    for (const r of byProduct) {
      lines.push(`- ${r.name}: ${formatQty(r.qty)} ${r.unit} — ${formatRupiah(r.revenue)}`);
    }
    const total = byProduct.reduce((s, r) => s + r.revenue, 0);
    lines.push("", `Total penjualan: ${formatRupiah(total)}`);
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
