import type { MovementType, PaymentMethod } from "../types";
import { PAYMENT_LABEL } from "../types";
import { formatQty, formatRupiah } from "../format";

/** All user-facing WhatsApp text — short, clear, Indonesian. */

export const MSG_PRODUCT_NOT_FOUND =
  "Barang tidak ditemukan. Gunakan nama barang yang sesuai di sistem.";

export const MSG_INVALID_QTY = "Jumlah harus lebih dari 0.";

export const MSG_INVALID_PRICE = "Harga tidak valid. Contoh: harga beras 15000";

export const MSG_HELP = [
  "Format perintah:",
  "",
  "Transaksi (barang qty metode):",
  "beras 10 cash   (stok masuk)",
  "minyak 5 qris   (stok masuk)",
  "beras -3 cash   (terjual)",
  "minyak -2 qris  (terjual)",
  "Metode: cash / qris / hutang",
  "",
  "Set stok: stok beras 10",
  "",
  "Cek: cek beras | stok",
  "",
  "Harga: harga beras 15000 | cek harga beras",
].join("\n");

export function msgAmbiguous(names: string[]): string {
  return [
    "Barang yang Anda maksud kurang jelas.",
    "Gunakan nama yang tepat, misalnya:",
    ...names.slice(0, 5).map((n) => `- ${n}`),
  ].join("\n");
}

/** Success message after an immediate stock movement. */
export function msgStockSuccess(params: {
  movementType: MovementType;
  productName: string;
  qty: number;
  unit: string;
  stockAfter: number;
  totalAmount: number;
  unitPrice: number;
  paymentMethod?: PaymentMethod | null;
}): string {
  const { movementType, productName, qty, unit, stockAfter, totalAmount, unitPrice, paymentMethod } =
    params;
  const lines = ["✅ Berhasil."];

  if (movementType === "IN") {
    lines.push(`Stok ${productName} bertambah ${formatQty(qty)} ${unit}.`);
    lines.push(`Stok saat ini: ${formatQty(stockAfter)} ${unit}.`);
    if (paymentMethod) lines.push(`Metode bayar: ${PAYMENT_LABEL[paymentMethod]}.`);
  } else if (movementType === "OUT") {
    lines.push(`Stok ${productName} berkurang ${formatQty(qty)} ${unit}.`);
    lines.push(`Stok saat ini: ${formatQty(stockAfter)} ${unit}.`);
    if (unitPrice > 0) {
      lines.push(`Pendapatan tercatat: ${formatRupiah(totalAmount)}.`);
    } else {
      lines.push("Harga barang masih Rp0 sehingga pendapatan tidak tercatat.");
    }
    if (paymentMethod) {
      lines.push(`Metode bayar: ${PAYMENT_LABEL[paymentMethod]}.`);
    }
  } else {
    lines.push(`Stok ${productName} di-set menjadi ${formatQty(stockAfter)} ${unit}.`);
  }

  return lines.join("\n");
}

export function msgPriceUpdated(productName: string, price: number, unit: string): string {
  return [
    "✅ Berhasil.",
    `Harga ${productName} diubah menjadi ${formatRupiah(price)} per ${unit}.`,
  ].join("\n");
}

export function msgPriceCheck(productName: string, price: number, unit: string): string {
  return `Harga ${productName} saat ini: ${formatRupiah(price)} per ${unit}.`;
}

/** Multi-line product check: name, stock, price, stock value. */
export function msgCheckStock(
  productName: string,
  stock: number,
  unit: string,
  sellingPrice: number
): string {
  return [
    productName,
    `Stok: ${formatQty(stock)} ${unit}`,
    `Harga: ${formatRupiah(sellingPrice)} per ${unit}`,
    `Nilai stok: ${formatRupiah(stock * sellingPrice)}`,
  ].join("\n");
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
