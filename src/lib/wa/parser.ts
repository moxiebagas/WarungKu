import type { MovementType } from "../types";

export type ParsedCommand =
  | { kind: "confirm" }
  | { kind: "cancel" }
  | { kind: "summary" }
  | { kind: "check"; product: string }
  | { kind: "update"; product: string; movementType: MovementType; qty: number }
  | { kind: "unknown" };

/** Normalize an incoming message: trim, lowercase, collapse spaces. */
export function normalizeMessage(raw: string): string {
  return (raw ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function parseQty(value: string): number {
  return parseFloat(value.replace(",", "."));
}

const RE_SET = /^stok\s+(.+?)\s+([0-9]+(?:[.,][0-9]+)?)$/;
const RE_CHECK = /^cek\s+(.+)$/;
const RE_INOUT = /^(.+?)\s*([+-])\s*([0-9]+(?:[.,][0-9]+)?)$/;

/**
 * Parse a normalized message into a structured command.
 * Order is intentional: control codes first, then keyword commands,
 * then the generic +/- product update.
 */
export function parseCommand(normalized: string): ParsedCommand {
  const m = normalized;

  if (m === "1") return { kind: "confirm" };
  if (m === "2") return { kind: "cancel" };
  if (m === "stok") return { kind: "summary" };

  const check = RE_CHECK.exec(m);
  if (check) return { kind: "check", product: check[1].trim() };

  const set = RE_SET.exec(m);
  if (set) {
    return {
      kind: "update",
      product: set[1].trim(),
      movementType: "ADJUSTMENT",
      qty: parseQty(set[2]),
    };
  }

  const inout = RE_INOUT.exec(m);
  if (inout) {
    const product = inout[1].trim();
    if (product.length > 0) {
      return {
        kind: "update",
        product,
        movementType: inout[2] === "+" ? "IN" : "OUT",
        qty: parseQty(inout[3]),
      };
    }
  }

  return { kind: "unknown" };
}
