"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ActionResult } from "./products";

function normalizePhone(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

export async function addAllowedNumber(input: {
  phoneNumber: string;
  name: string;
}): Promise<ActionResult> {
  const phone = normalizePhone(input.phoneNumber);
  const name = input.name.trim();
  if (!phone) return { ok: false, error: "Nomor WhatsApp wajib diisi (format angka)." };
  if (phone.length < 8) return { ok: false, error: "Nomor WhatsApp tidak valid." };
  if (!name) return { ok: false, error: "Nama wajib diisi." };

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("allowed_whatsapp_numbers")
    .insert({ phone_number: phone, name });

  if (error) {
    if (error.code === "23505")
      return { ok: false, error: "Nomor ini sudah terdaftar." };
    return { ok: false, error: error.message };
  }
  revalidatePath("/settings/whatsapp");
  return { ok: true };
}

export async function updateAllowedNumber(input: {
  id: string;
  name: string;
  isActive: boolean;
}): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Nama wajib diisi." };

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("allowed_whatsapp_numbers")
    .update({ name, is_active: input.isActive })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/whatsapp");
  return { ok: true };
}

export async function setNumberActive(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("allowed_whatsapp_numbers")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/whatsapp");
  return { ok: true };
}
