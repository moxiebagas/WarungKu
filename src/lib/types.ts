export type MovementType = "IN" | "OUT" | "ADJUSTMENT";
export type PendingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
export type StockStatus = "Aman" | "Menipis" | "Habis";

export interface Product {
  id: string;
  name: string;
  slug: string;
  unit: string;
  current_stock: number;
  min_stock: number;
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
