export type MovementType = "IN" | "OUT" | "ADJUSTMENT";
export type PendingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
export type StockStatus = "Aman" | "Menipis" | "Habis";
export type PaymentMethod = "cash" | "qris" | "hutang";

export const PAYMENT_METHODS: PaymentMethod[] = ["cash", "qris", "hutang"];

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "Tunai",
  qris: "QRIS",
  hutang: "Hutang",
};

export interface Product {
  id: string;
  name: string;
  slug: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  selling_price: number;
  cost_price: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: MovementType;
  qty: number;
  stock_before: number;
  stock_after: number;
  unit_price: number;
  total_amount: number;
  payment_method: PaymentMethod | null;
  source: string;
  phone_number: string | null;
  note: string | null;
  raw_message: string | null;
  created_at: string;
}

export interface PendingStockCommand {
  id: string;
  phone_number: string;
  product_id: string;
  movement_type: MovementType;
  qty: number;
  raw_message: string;
  status: PendingStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface AllowedWhatsappNumber {
  id: string;
  phone_number: string;
  name: string;
  is_active: boolean;
  created_at: string;
}
