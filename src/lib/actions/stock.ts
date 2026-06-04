"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { executeStockMovement } from "@/lib/stock-core";
import type { MovementType } from "@/lib/types";
import type { ActionResult } from "./products";

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

  // Same executor as WhatsApp: records the OUT price snapshot + revenue.
  const exec = await executeStockMovement({
    productId: input.productId,
    movementType: input.movementType,
    qty: input.qty,
    source: "ADMIN",
    note: input.note?.trim() || null,
  });

  if (!exec.ok) return { ok: false, error: exec.error };

  revalidatePath("/stock");
  revalidatePath("/dashboard");
  revalidatePath("/products");
  revalidatePath("/history");
  revalidatePath("/reports");
  return { ok: true };
}
