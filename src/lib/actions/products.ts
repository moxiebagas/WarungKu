"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slug";
import { updateProductPrice } from "@/lib/stock-core";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function revalidateAll() {
  revalidatePath("/products");
  revalidatePath("/dashboard");
  revalidatePath("/stock");
  revalidatePath("/reports");
}

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  let slug = base || "barang";
  let i = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await supabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data || data.id === ignoreId) return slug;
    i += 1;
    slug = `${base}-${i}`;
  }
}

export async function createProduct(input: {
  name: string;
  unit: string;
  minStock: number;
  initialStock: number;
  sellingPrice: number;
  costPrice: number;
}): Promise<ActionResult> {
  const name = input.name.trim();
  const unit = input.unit.trim();
  if (!name) return { ok: false, error: "Nama barang wajib diisi." };
  if (!unit) return { ok: false, error: "Satuan wajib diisi." };
  if (input.minStock < 0 || input.initialStock < 0)
    return { ok: false, error: "Nilai stok tidak boleh negatif." };
  if (input.sellingPrice < 0 || input.costPrice < 0)
    return { ok: false, error: "Harga tidak boleh negatif." };

  const supabase = getSupabaseAdmin();
  const slug = await uniqueSlug(slugify(name));

  const { error } = await supabase.from("products").insert({
    name,
    slug,
    unit,
    min_stock: input.minStock,
    current_stock: input.initialStock,
    selling_price: input.sellingPrice,
    cost_price: input.costPrice,
  });

  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

export async function updateProduct(input: {
  id: string;
  name: string;
  unit: string;
  minStock: number;
  sellingPrice: number;
  costPrice: number;
  isActive: boolean;
}): Promise<ActionResult> {
  const name = input.name.trim();
  const unit = input.unit.trim();
  if (!name) return { ok: false, error: "Nama barang wajib diisi." };
  if (!unit) return { ok: false, error: "Satuan wajib diisi." };
  if (input.minStock < 0) return { ok: false, error: "Stok minimum tidak boleh negatif." };
  if (input.sellingPrice < 0 || input.costPrice < 0)
    return { ok: false, error: "Harga tidak boleh negatif." };

  const supabase = getSupabaseAdmin();
  const slug = await uniqueSlug(slugify(name), input.id);

  const { error } = await supabase
    .from("products")
    .update({
      name,
      slug,
      unit,
      min_stock: input.minStock,
      selling_price: input.sellingPrice,
      cost_price: input.costPrice,
      is_active: input.isActive,
    })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

/** Quick price-only update (used by the products page price cell). */
export async function updatePrice(
  productId: string,
  sellingPrice: number
): Promise<ActionResult> {
  const res = await updateProductPrice(productId, sellingPrice);
  if (!res.ok) return { ok: false, error: res.error };
  revalidateAll();
  return { ok: true };
}

export async function setProductActive(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("products")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}
