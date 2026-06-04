"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { MovementType } from "@/lib/types";
import type { ActionResult } from "./products";

const ERROR_LABELS: Record<string, string> = {
  PRODUCT_NOT_FOUND: "Barang tidak ditemukan.",
  INVALID_QTY: "Jumlah harus lebih dari 0.",
  INVALID_MOVEMENT_TYPE: "Jenis pergerakan tidak valid.",
};

export async function applyManualMovement(input: {
  productId: string;
  movementType: MovementType;
  qty: number;
  note?: string;
}): Promise<ActionResult> {
  if (!input.productId) return { ok: false, error: "Pilih barang terlebih dahulu." };
  if (!Number.isFinite(input.qty) || input.qty <= 0)
    return { ok: false, error: "Jumlah harus lebih dari 0." };

  const supabase = getSupabaseAdmin();

  // Optional negative-stock guard for OUT (mirrors WhatsApp behavior).
  if (input.movementType === "OUT" && process.env.ALLOW_NEGATIVE_STOCK !== "true") {
    const { data: product } = await supabase
      .from("products")
      .select("current_stock")
      .eq("id", input.productId)
      .maybeSingle();
    if (product && Number(product.current_stock) - input.qty < 0) {
      return { ok: false, error: "Stok tidak cukup untuk pengurangan ini." };
    }
  }

  const { error } = await supabase.rpc("apply_manual_movement", {
    p_product_id: input.productId,
    p_movement_type: input.movementType,
    p_qty: input.qty,
    p_note: input.note?.trim() || null,
  });

  if (error) {
    const key = Object.keys(ERROR_LABELS).find((k) => error.message.includes(k));
    return { ok: false, error: key ? ERROR_LABELS[key] : error.message };
  }

  revalidatePath("/stock");
  revalidatePath("/dashboard");
  revalidatePath("/products");
  revalidatePath("/history");
  return { ok: true };
}
