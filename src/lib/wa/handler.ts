import "server-only";
import { getSupabaseAdmin } from "../supabase/admin";
import { matchProduct } from "./match";
import { normalizeMessage, parseCommand } from "./parser";
import type { PendingStockCommand, Product } from "../types";
import { getStockStatus } from "../format";
import * as M from "./messages";

const PENDING_TTL_MINUTES = 5;

function allowNegativeStock(): boolean {
  return process.env.ALLOW_NEGATIVE_STOCK === "true";
}

/**
 * Process one incoming WhatsApp message and return the reply text.
 * Returns `null` when the message should be silently ignored
 * (we only do that for genuinely empty payloads).
 */
export async function handleIncomingMessage(
  phoneNumber: string,
  rawMessage: string
): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const normalized = normalizeMessage(rawMessage);
  if (!normalized) return null;

  // ---- Authorization ----
  const { data: allowed } = await supabase
    .from("allowed_whatsapp_numbers")
    .select("id")
    .eq("phone_number", phoneNumber)
    .eq("is_active", true)
    .maybeSingle();

  if (!allowed) return M.MSG_UNAUTHORIZED;

  const command = parseCommand(normalized);

  switch (command.kind) {
    case "confirm":
      return handleConfirm(phoneNumber);
    case "cancel":
      return handleCancel(phoneNumber);
    case "summary":
      return handleSummary();
    case "check":
      return handleCheck(command.product);
    case "update":
      return handleUpdate(
        phoneNumber,
        command.product,
        command.movementType,
        command.qty,
        normalized
      );
    case "unknown":
    default:
      return M.MSG_HELP;
  }
}

async function latestPending(
  phoneNumber: string
): Promise<PendingStockCommand | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("pending_stock_commands")
    .select("*")
    .eq("phone_number", phoneNumber)
    .eq("status", "PENDING")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as PendingStockCommand) ?? null;
}

async function handleConfirm(phoneNumber: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  const pending = await latestPending(phoneNumber);
  if (!pending) return M.MSG_NO_PENDING;

  if (new Date(pending.expires_at).getTime() < Date.now()) {
    await supabase
      .from("pending_stock_commands")
      .update({ status: "EXPIRED" })
      .eq("id", pending.id);
    return M.MSG_EXPIRED;
  }

  const { data, error } = await supabase.rpc("apply_pending_command", {
    p_pending_id: pending.id,
  });

  if (error) {
    const msg = error.message || "";
    if (msg.includes("PENDING_EXPIRED")) return M.MSG_EXPIRED;
    if (msg.includes("PENDING_NOT_FOUND")) return M.MSG_NO_PENDING;
    console.error("[wa] apply_pending_command failed", error);
    return "Maaf, terjadi kesalahan. Silakan coba lagi.";
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return "Maaf, terjadi kesalahan. Silakan coba lagi.";

  return M.msgSuccess(
    row.movement_type,
    row.product_name,
    Number(row.qty),
    row.unit,
    Number(row.stock_after)
  );
}

async function handleCancel(phoneNumber: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  const pending = await latestPending(phoneNumber);
  if (!pending) return M.MSG_NO_PENDING;

  await supabase
    .from("pending_stock_commands")
    .update({ status: "CANCELLED" })
    .eq("id", pending.id);

  return M.MSG_CANCELLED;
}

async function handleCheck(productText: string): Promise<string> {
  const result = await matchProduct(productText);
  if (result.kind === "none") return M.MSG_PRODUCT_NOT_FOUND;
  if (result.kind === "ambiguous") {
    return M.msgAmbiguous(result.products.map((p) => p.name));
  }
  const p = result.product;
  return M.msgCheckStock(p.name, Number(p.current_stock), p.unit);
}

async function handleSummary(): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true);

  const products = (data ?? []) as Product[];
  if (products.length === 0) return "Belum ada barang aktif di sistem.";

  // Low stock (Habis, then Menipis) on top, then the rest by name.
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
  movementType: "IN" | "OUT" | "ADJUSTMENT",
  qty: number,
  rawMessage: string
): Promise<string> {
  const supabase = getSupabaseAdmin();

  if (!Number.isFinite(qty) || qty <= 0) return M.MSG_INVALID_QTY;

  const result = await matchProduct(productText);
  if (result.kind === "none") return M.MSG_PRODUCT_NOT_FOUND;
  if (result.kind === "ambiguous") {
    return M.msgAmbiguous(result.products.map((p) => p.name));
  }

  const product = result.product;

  // Guard against negative stock for OUT, unless explicitly allowed.
  if (
    movementType === "OUT" &&
    !allowNegativeStock() &&
    Number(product.current_stock) - qty < 0
  ) {
    return M.msgNegativeBlocked(
      product.name,
      Number(product.current_stock),
      product.unit
    );
  }

  // Supersede any older pending commands from this sender so that "1"
  // always refers to the newest request.
  await supabase
    .from("pending_stock_commands")
    .update({ status: "EXPIRED" })
    .eq("phone_number", phoneNumber)
    .eq("status", "PENDING");

  const expiresAt = new Date(
    Date.now() + PENDING_TTL_MINUTES * 60 * 1000
  ).toISOString();

  const { error } = await supabase.from("pending_stock_commands").insert({
    phone_number: phoneNumber,
    product_id: product.id,
    movement_type: movementType,
    qty,
    raw_message: rawMessage,
    status: "PENDING",
    expires_at: expiresAt,
  });

  if (error) {
    console.error("[wa] failed to create pending command", error);
    return "Maaf, terjadi kesalahan. Silakan coba lagi.";
  }

  return M.msgConfirm(movementType, product.name, qty, product.unit);
}
