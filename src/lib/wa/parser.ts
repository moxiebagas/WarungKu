import type { MovementType, PaymentMethod } from "../types";
import { parseIndoNumber } from "../format";

export type ParsedCommand =
  | { kind: "priceUpdate"; product: string; price: number }
  | { kind: "priceCheck"; product: string }
  | { kind: "check"; product: string }
  | { kind: "summary" }
  | {
      kind: "update";
      product: string;
      movementType: MovementType;
      qty: number;
      paymentMethod?: PaymentMethod;
    }
  | { kind: "unknown" };

/** Normalize an incoming message: trim, lowercase, collapse spaces. */
export function normalizeMessage(raw: string): string {
  return (raw ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

// A numeric token in Indonesian format: digits with optional . , grouping/decimals.
const NUM = "([0-9]+(?:[.,][0-9]+)*)";
const METHOD = "(cash|qris|hutang)";

const RE_SET_HARGA = new RegExp(`^set harga (.+?) ${NUM}$`);
const RE_HARGA = new RegExp(`^harga (.+?) ${NUM}$`);
const RE_PRODUCT_HARGA = new RegExp(`^(.+?) harga ${NUM}$`);
const RE_CEK_HARGA = /^cek harga (.+)$/;
const RE_CEK = /^cek (.+)$/;
const RE_JUAL_METHOD = new RegExp(`^jual (.+?) ${NUM} ${METHOD}$`);
const RE_JUAL = new RegExp(`^jual (.+?) ${NUM}$`);
const RE_SET_STOCK = new RegExp(`^stok (.+?) ${NUM}$`);
const RE_INOUT = new RegExp(`^(.+?)\\s*([+-])\\s*${NUM}$`);

const DEFAULT_PAYMENT: PaymentMethod = "cash";

/**
 * Parse a normalized message into a structured command.
 * Priority:
 *   1. price update   (harga / set harga / {product} harga)
 *   2. price check     (cek harga {product})
 *   3. stock check     (cek {product})
 *   4. sale            (jual {product} {qty} [method])
 *   5. stock summary   (stok)
 *   6. stock adjust    (stok {product} {qty})
 *   7. stock movement  ({product} +/-{qty})  (- defaults to a cash sale)
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

  // 4. Sale with explicit/optional payment method
  match = RE_JUAL_METHOD.exec(m);
  if (match) {
    return {
      kind: "update",
      product: match[1].trim(),
      movementType: "OUT",
      qty: parseIndoNumber(match[2]),
      paymentMethod: match[3] as PaymentMethod,
    };
  }
  match = RE_JUAL.exec(m);
  if (match) {
    return {
      kind: "update",
      product: match[1].trim(),
      movementType: "OUT",
      qty: parseIndoNumber(match[2]),
      paymentMethod: DEFAULT_PAYMENT,
    };
  }

  // 5. Stock summary
  if (m === "stok") return { kind: "summary" };

  // 6. Stock adjustment
  match = RE_SET_STOCK.exec(m);
  if (match) {
    return {
      kind: "update",
      product: match[1].trim(),
      movementType: "ADJUSTMENT",
      qty: parseIndoNumber(match[2]),
    };
  }

  // 7. Stock movement (+/-). "-" is a sale → default cash payment.
  match = RE_INOUT.exec(m);
  if (match && match[1].trim()) {
    const isOut = match[2] === "-";
    return {
      kind: "update",
      product: match[1].trim(),
      movementType: isOut ? "OUT" : "IN",
      qty: parseIndoNumber(match[3]),
      paymentMethod: isOut ? DEFAULT_PAYMENT : undefined,
    };
  }

  return { kind: "unknown" };
}
