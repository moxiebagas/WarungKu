import type { Product, StockStatus, MovementType } from "./types";

/** Format a numeric stock value, dropping trailing decimals when integer. */
export function formatQty(value: number): string {
  const n = Number(value);
  if (Number.isInteger(n)) return n.toLocaleString("id-ID");
  return n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

/** Stock status per the business rules. */
export function getStockStatus(stock: number, minStock: number): StockStatus {
  if (stock <= 0) return "Habis";
  if (stock <= minStock) return "Menipis";
  return "Aman";
}

export function isLowStock(p: Pick<Product, "current_stock" | "min_stock">): boolean {
  return p.current_stock <= p.min_stock;
}

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  IN: "Masuk",
  OUT: "Keluar",
  ADJUSTMENT: "Koreksi",
};

/** Format a timestamp in Indonesian local style (Asia/Jakarta). */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeZone: "Asia/Jakarta",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
