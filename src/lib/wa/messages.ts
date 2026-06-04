import type { MovementType } from "../types";
import { formatQty } from "../format";

/** All user-facing WhatsApp text — short, clear, Indonesian. */

export const MSG_UNAUTHORIZED =
  "Nomor ini belum terdaftar untuk update stok.";

export const MSG_NO_PENDING =
  "Tidak ada update stok yang menunggu konfirmasi.";

export const MSG_EXPIRED =
  "Update stok sudah kedaluwarsa. Silakan kirim ulang.";

export const MSG_PRODUCT_NOT_FOUND =
  "Barang tidak ditemukan. Gunakan nama barang yang sesuai di sistem.";

export const MSG_HELP = [
  "Format belum dikenali.",
  "",
  "Contoh:",
  "beras +25",
  "beras -5",
  "stok beras 10",
  "cek beras",
  "stok",
].join("\n");

export function msgAmbiguous(names: string[]): string {
  return [
    "Barang yang Anda maksud kurang jelas.",
    "Gunakan nama yang tepat, misalnya:",
    ...names.slice(0, 5).map((n) => `- ${n}`),
  ].join("\n");
}

/** Confirmation prompt for a pending command. */
export function msgConfirm(
  movementType: MovementType,
  productName: string,
  qty: number,
  unit: string
): string {
  let line: string;
  if (movementType === "IN") {
    line = `Tambah stok ${productName} ${formatQty(qty)} ${unit}?`;
  } else if (movementType === "OUT") {
    line = `Kurangi stok ${productName} ${formatQty(qty)} ${unit}?`;
  } else {
    line = `Set stok ${productName} menjadi ${formatQty(qty)} ${unit}?`;
  }
  return [
    "Konfirmasi:",
    line,
    "",
    "Balas:",
    "1 = Ya",
    "2 = Batal",
  ].join("\n");
}

/** Success message after a confirmed update. */
export function msgSuccess(
  movementType: MovementType,
  productName: string,
  qty: number,
  unit: string,
  stockAfter: number
): string {
  let change: string;
  if (movementType === "IN") {
    change = `Stok ${productName} bertambah ${formatQty(qty)} ${unit}.`;
  } else if (movementType === "OUT") {
    change = `Stok ${productName} berkurang ${formatQty(qty)} ${unit}.`;
  } else {
    change = `Stok ${productName} di-set menjadi ${formatQty(qty)} ${unit}.`;
  }
  return [
    "✅ Berhasil.",
    change,
    `Stok saat ini: ${formatQty(stockAfter)} ${unit}.`,
  ].join("\n");
}

export const MSG_CANCELLED = "Dibatalkan. Update stok tidak disimpan.";

export function msgCheckStock(
  productName: string,
  stock: number,
  unit: string
): string {
  return `Stok ${productName}: ${formatQty(stock)} ${unit}.`;
}

export function msgNegativeBlocked(
  productName: string,
  current: number,
  unit: string
): string {
  return [
    `Tidak bisa. Stok ${productName} saat ini ${formatQty(current)} ${unit}.`,
    "Jumlah pengurangan melebihi stok yang ada.",
  ].join("\n");
}

export const MSG_INVALID_QTY = "Jumlah harus lebih dari 0.";
