import type { Product, StockStatus, MovementType } from "./types";

/** Format a numeric stock value, dropping trailing decimals when integer. */
export function formatQty(value: number): string {
  const n = Number(value);
  if (Number.isInteger(n)) return n.toLocaleString("id-ID");
  return n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

/** Format a number as Indonesian Rupiah, e.g. 15000 -> "Rp15.000". */
export function formatRupiah(value: number): string {
  const n = Math.round(Number(value) || 0);
  return `Rp${n.toLocaleString("id-ID")}`;
}

/**
 * Parse an Indonesian-formatted number into a JS number.
 * Handles: "15000", "15.000", "15,000" (all -> 15000), "1.250.000",
 * decimals like "2,5" / "2.5" -> 2.5, and mixed "1.250.000,50".
 */
export function parseIndoNumber(raw: string): number {
  const s = (raw ?? "").trim();
  if (!s) return NaN;

  const hasDot = s.includes(".");
  const hasComma = s.includes(",");

  // Both separators present: the last one is the decimal separator.
  if (hasDot && hasComma) {
    const lastSep = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
    const intPart = s.slice(0, lastSep).replace(/[.,]/g, "");
    const decPart = s.slice(lastSep + 1).replace(/[.,]/g, "");
    return parseFloat(`${intPart}.${decPart}`);
  }

  const sep = hasDot ? "." : hasComma ? "," : "";
  if (sep) {
    const parts = s.split(sep);
    const last = parts[parts.length - 1];
    // Multiple separators OR a 3-digit final group => thousands grouping.
    if (parts.length > 2 || last.length === 3) {
      return parseFloat(parts.join(""));
    }
    // Otherwise treat the single separator as a decimal point.
    return parseFloat(parts.join("."));
  }

  return parseFloat(s);
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
