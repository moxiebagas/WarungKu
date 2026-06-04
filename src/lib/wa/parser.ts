import type { MovementType } from "../types";
import { parseIndoNumber } from "../format";

export type ParsedCommand =
  | { kind: "priceUpdate"; product: string; price: number }
  | { kind: "priceCheck"; product: string }
  | { kind: "check"; product: string }
  | { kind: "summary" }
  | { kind: "update"; product: string; movementType: MovementType; qty: number }
  | { kind: "unknown" };

/** Normalize an incoming message: trim, lowercase, collapse spaces. */
export function normalizeMessage(raw: string): string {
  return (raw ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

// A numeric token in Indonesian format: digits with optional . , grouping/decimals.
const NUM = "([0-9]+(?:[.,][0-9]+)*)";

const RE_SET_HARGA = new RegExp(`^set harga (.+?) ${NUM}$`);
const RE_HARGA = new RegExp(`^harga (.+?) ${NUM}$`);
const RE_PRODUCT_HARGA = new RegExp(`^(.+?) harga ${NUM}$`);
const RE_CEK_HARGA = /^cek harga (.+)$/;
const RE_CEK = /^cek (.+)$/;
const RE_SET_STOCK = new RegExp(`^stok (.+?) ${NUM}$`);
const RE_INOUT = new RegExp(`^(.+?)\\s*([+-])\\s*${NUM}$`);

/**
 * Parse a normalized message into a structured command.
 * Priority (per spec):
 *   1. price update   (harga / set harga / {product} harga)
 *   2. price check     (cek harga {product})
 *   3. stock check     (cek {product})
 *   4. stock summary   (stok)
 *   5. stock adjust    (stok {product} {qty})
 *   6. stock movement  ({product} +/-{qty})
 */
export function parseCommand(normalized: string): ParsedCommand {
  const m = normalized;

  // 1. Price update
  let match = RE_SET_HARGA.exec(m) ?? RE_HARGA.exec(m);
  if (match) {
    return { kind: "priceUpdate", product: match[1].trim(), price: parseIndoNumber(match[2]) };
  }
  match = RE_PRODUCT_HARGA.exec(m);
  if (match && match[1].trim() && match[1].trim() !== "cek" && match[1].trim() !== "set") {
    return { kind: "priceUpdate", product: match[1].trim(), price: parseIndoNumber(match[2]) };
  }

  // 2. Price check
  match = RE_CEK_HARGA.exec(m);
  if (match) return { kind: "priceCheck", product: match[1].trim() };

  // 3. Stock check
  match = RE_CEK.exec(m);
  if (match) return { kind: "check", product: match[1].trim() };

  // 4. Stock summary
  if (m === "stok") return { kind: "summary" };

  // 5. Stock adjustment
  match = RE_SET_STOCK.exec(m);
  if (match) {
    return {
      kind: "update",
      product: match[1].trim(),
      movementType: "ADJUSTMENT",
      qty: parseIndoNumber(match[2]),
    };
  }

  // 6. Stock movement (+/-)
  match = RE_INOUT.exec(m);
  if (match && match[1].trim()) {
    return {
      kind: "update",
      product: match[1].trim(),
      movementType: match[2] === "+" ? "IN" : "OUT",
      qty: parseIndoNumber(match[3]),
    };
  }

  return { kind: "unknown" };
}
