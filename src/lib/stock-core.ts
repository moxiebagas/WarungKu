import "server-only";
import { getSupabaseAdmin } from "./supabase/admin";
import { maybeSendLowStockAlert } from "./notify";
import type { MovementType, PaymentMethod } from "./types";

export interface MovementResult {
  productId: string;
  productName: string;
  unit: string;
  movementType: MovementType;
  qty: number;
  stockBefore: number;
  stockAfter: number;
  unitPrice: number;
  totalAmount: number;
  sellingPrice: number;
  minStock: number;
  paymentMethod: PaymentMethod | null;
}

export type ExecResult =
  | { ok: true; data: MovementResult }
  | { ok: false; code: string; error: string };

const ERROR_LABELS: Record<string, string> = {
  PRODUCT_NOT_FOUND: "Barang tidak ditemukan.",
  INVALID_QTY: "Jumlah harus lebih dari 0.",
  INVALID_MOVEMENT_TYPE: "Jenis pergerakan tidak valid.",
};

/**
 * Execute a stock movement immediately (no confirmation), with an OUT price
 * snapshot, atomically inside a Postgres transaction. Used by WhatsApp + admin.
 */
export async function executeStockMovement(input: {
  productId: string;
  movementType: MovementType;
  qty: number;
  source: "WHATSAPP" | "ADMIN";
  phoneNumber?: string | null;
  rawMessage?: string | null;
  note?: string | null;
  paymentMethod?: PaymentMethod | null;
}): Promise<ExecResult> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.rpc("execute_stock_movement", {
    p_product_id: input.productId,
    p_movement_type: input.movementType,
    p_qty: input.qty,
    p_source: input.source,
    p_phone_number: input.phoneNumber ?? null,
    p_raw_message: input.rawMessage ?? null,
    p_note: input.note ?? null,
    p_payment_method: input.paymentMethod ?? null,
  });

  if (error) {
    const code = Object.keys(ERROR_LABELS).find((k) => error.message.includes(k));
    console.error("[stock] execute_stock_movement failed", {
      message: error.message,
      input,
    });
    return {
      ok: false,
      code: code ?? "DB_ERROR",
      error: code ? ERROR_LABELS[code] : error.message,
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    console.error("[stock] execute_stock_movement returned no row", { input });
    return { ok: false, code: "NO_ROW", error: "Gagal memproses pergerakan stok." };
  }

  const result: MovementResult = {
    productId: row.product_id,
    productName: row.product_name,
    unit: row.unit,
    movementType: row.movement_type,
    qty: Number(row.qty),
    stockBefore: Number(row.stock_before),
    stockAfter: Number(row.stock_after),
    unitPrice: Number(row.unit_price),
    totalAmount: Number(row.total_amount),
    sellingPrice: Number(row.selling_price),
    minStock: Number(row.min_stock),
    paymentMethod: (row.payment_method ?? null) as MovementResult["paymentMethod"],
  };

  console.log("[stock] movement executed", result);

  // Real-time low-stock alert to the configured group (never throws).
  await maybeSendLowStockAlert(result);

  return { ok: true, data: result };
}

export interface PriceUpdateResult {
  ok: boolean;
  error?: string;
  product?: { id: string; name: string; unit: string; selling_price: number };
}

/** Update a product's selling price (used by WhatsApp + dashboard). */
export async function updateProductPrice(
  productId: string,
  sellingPrice: number
): Promise<PriceUpdateResult> {
  if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
    return { ok: false, error: "Harga tidak boleh kurang dari 0." };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("products")
    .update({ selling_price: sellingPrice })
    .eq("id", productId)
    .select("id, name, unit, selling_price")
    .maybeSingle();

  if (error) {
    console.error("[stock] updateProductPrice failed", { message: error.message, productId });
    return { ok: false, error: error.message };
  }
  if (!data) return { ok: false, error: "Barang tidak ditemukan." };

  console.log("[stock] price updated", data);
  return { ok: true, product: data as PriceUpdateResult["product"] };
}
