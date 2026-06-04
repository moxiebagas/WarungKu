import "server-only";
import { getSupabaseAdmin } from "../supabase/admin";
import { matchProduct } from "./match";
import { normalizeMessage, parseCommand } from "./parser";
import type { MovementType, Product } from "../types";
import { getStockStatus } from "../format";
import { executeStockMovement, updateProductPrice } from "../stock-core";
import * as M from "./messages";

function allowNegativeStock(): boolean {
  return process.env.ALLOW_NEGATIVE_STOCK === "true";
}

// Help is opt-in only: examples are sent ONLY when an authorized sender
// explicitly asks for them, never as a fallback for unknown text.
const HELP_TRIGGERS = new Set(["format", "bantuan", "help", "contoh", "menu"]);

/**
 * Process one incoming WhatsApp message and return the reply text, or `null`
 * when the system must stay completely silent (no WhatsApp reply at all).
 *
 * Silent cases:
 *   - sender not registered/active (never reveal registration status)
 *   - authorization lookup error (don't leak that the system exists)
 *   - empty message
 *   - unsupported/unknown command from an authorized sender
 */
export async function handleIncomingMessage(
  phoneNumber: string,
  rawMessage: string
): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  // ---- 1 & 2. Authorization FIRST, before any other processing ----
  const { data: allowed, error: authError } = await supabase
    .from("allowed_whatsapp_numbers")
    .select("id")
    .eq("phone_number", phoneNumber)
    .eq("is_active", true)
    .maybeSingle();

  if (authError) {
    // Stay silent — we cannot confirm authorization, so reveal nothing.
    console.error(
      JSON.stringify({
        event: "auth_lookup_error",
        phone: phoneNumber,
        message: authError.message,
        action: "ignored",
      })
    );
    return null;
  }

  // ---- 3. Unauthorized sender: log only, send nothing ----
  if (!allowed) {
    console.log(
      JSON.stringify({
        event: "unauthorized_sender",
        phone: phoneNumber,
        message: rawMessage,
        action: "ignored",
      })
    );
    return null;
  }

  // ---- 4. Normalize message (authorized senders only) ----
  const normalized = normalizeMessage(rawMessage);
  if (!normalized) return null;

  // ---- 5. Opt-in help command ----
  if (HELP_TRIGGERS.has(normalized)) {
    console.log("[wa] help requested", { phone: phoneNumber });
    return M.MSG_HELP;
  }

  // ---- 6. Valid command -> execute and reply ----
  const command = parseCommand(normalized);
  console.log("[wa] parsed command", { phone: phoneNumber, kind: command.kind, normalized });

  switch (command.kind) {
    case "priceUpdate":
      return handlePriceUpdate(command.product, command.price, phoneNumber);
    case "priceCheck":
      return handlePriceCheck(command.product);
    case "check":
      return handleCheck(command.product);
    case "summary":
      return handleSummary();
    case "update":
      return handleUpdate(
        phoneNumber,
        command.product,
        command.movementType,
        command.qty,
        normalized
      );
    // ---- 7. Unsupported command: log only, send nothing ----
    case "unknown":
    default:
      console.log(
        JSON.stringify({
          event: "unsupported_command",
          phone: phoneNumber,
          message: rawMessage,
          action: "ignored",
        })
      );
      return null;
  }
}

async function handlePriceUpdate(
  productText: string,
  price: number,
  phoneNumber: string
): Promise<string> {
  if (!Number.isFinite(price) || price < 0) return M.MSG_INVALID_PRICE;

  const result = await matchProduct(productText);
  console.log("[wa] price update product lookup", { productText, kind: result.kind });
  if (result.kind === "none") return M.MSG_PRODUCT_NOT_FOUND;
  if (result.kind === "ambiguous") return M.msgAmbiguous(result.products.map((p) => p.name));

  const updated = await updateProductPrice(result.product.id, price);
  if (!updated.ok || !updated.product) {
    return updated.error ?? "Maaf, gagal mengubah harga.";
  }
  console.log("[wa] price update result", { phoneNumber, product: updated.product });
  return M.msgPriceUpdated(updated.product.name, updated.product.selling_price, updated.product.unit);
}

async function handlePriceCheck(productText: string): Promise<string> {
  const result = await matchProduct(productText);
  if (result.kind === "none") return M.MSG_PRODUCT_NOT_FOUND;
  if (result.kind === "ambiguous") return M.msgAmbiguous(result.products.map((p) => p.name));
  const p = result.product;
  return M.msgPriceCheck(p.name, Number(p.selling_price), p.unit);
}

async function handleCheck(productText: string): Promise<string> {
  const result = await matchProduct(productText);
  if (result.kind === "none") return M.MSG_PRODUCT_NOT_FOUND;
  if (result.kind === "ambiguous") return M.msgAmbiguous(result.products.map((p) => p.name));
  const p = result.product;
  return M.msgCheckStock(p.name, Number(p.current_stock), p.unit, Number(p.selling_price));
}

async function handleSummary(): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("products").select("*").eq("is_active", true);

  const products = (data ?? []) as Product[];
  if (products.length === 0) return "Belum ada barang aktif di sistem.";

  const rank = (p: Product) => {
    const s = getStockStatus(p.current_stock, p.min_stock);
    if (s === "Habis") return 0;
    if (s === "Menipis") return 1;
    return 2;
  };
  products.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));

  const lines = products.map((p) => {
    const status = getStockStatus(p.current_stock, p.min_stock);
    const flag = status === "Aman" ? "" : ` (${status})`;
    return `- ${p.name}: ${Number(p.current_stock)} ${p.unit}${flag}`;
  });

  return ["Ringkasan Stok:", ...lines].join("\n");
}

async function handleUpdate(
  phoneNumber: string,
  productText: string,
  movementType: MovementType,
  qty: number,
  rawMessage: string
): Promise<string> {
  if (!Number.isFinite(qty) || qty <= 0) return M.MSG_INVALID_QTY;

  const result = await matchProduct(productText);
  console.log("[wa] stock update product lookup", { productText, kind: result.kind });
  if (result.kind === "none") return M.MSG_PRODUCT_NOT_FOUND;
  if (result.kind === "ambiguous") return M.msgAmbiguous(result.products.map((p) => p.name));

  const product = result.product;

  // Guard against negative stock for OUT, unless explicitly allowed.
  if (
    movementType === "OUT" &&
    !allowNegativeStock() &&
    Number(product.current_stock) - qty < 0
  ) {
    console.warn("[wa] negative stock blocked", {
      product: product.name,
      current: product.current_stock,
      qty,
    });
    return M.msgNegativeBlocked(product.name, Number(product.current_stock), product.unit);
  }

  // Execute immediately — no pending confirmation.
  const exec = await executeStockMovement({
    productId: product.id,
    movementType,
    qty,
    source: "WHATSAPP",
    phoneNumber,
    rawMessage,
  });

  if (!exec.ok) {
    console.error("[wa] stock movement failed", { phoneNumber, code: exec.code });
    return exec.error || "Maaf, terjadi kesalahan. Silakan coba lagi.";
  }

  const d = exec.data;
  console.log("[wa] stock movement ok", {
    phoneNumber,
    product: d.productName,
    movementType: d.movementType,
    revenue: d.totalAmount,
  });

  return M.msgStockSuccess({
    movementType: d.movementType,
    productName: d.productName,
    qty: d.qty,
    unit: d.unit,
    stockAfter: d.stockAfter,
    totalAmount: d.totalAmount,
    unitPrice: d.unitPrice,
  });
}
