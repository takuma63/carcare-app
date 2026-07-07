/* ============================================================
   types.ts  ―  APIレスポンスの型定義（SPEC.md §6 と対応）
============================================================ */

export type BookingStatus = "new" | "confirmed" | "in_progress" | "done" | "canceled";
export type PaymentStatus = "unpaid" | "paid" | "refunded";

export interface BookingItem {
  id: string;
  name: string;
  option: string | null;
  price: number | null;
}

export interface Booking {
  id: string;
  public_token: string;
  status: BookingStatus;
  shop: string | null;
  preferred_at: string | null;
  car_official: string | null;
  category: string | null;
  items: BookingItem[];
  total_price: number;
  discount_amount: number;
  payment_status: PaymentStatus;
  duration_text: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

export interface MenuOption {
  label: string;
  price: number;
  perUnit?: boolean;
  unitLabel?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  note?: string;
  priceType: "category" | "options" | "quote";
  durationMin: number | null;
  durationText?: string;
  prices?: Record<string, number>;
  options?: MenuOption[];
  priceFrom?: boolean;
}

export interface MenuGroup {
  id: string;
  name: string;
  note?: string;
  single?: boolean;
  detailPage?: string;
  items: MenuItem[];
}

export type MenuCategories = Record<string, string>;

export interface Coupon {
  grant_id: string;
  title: string;
  description: string | null;
  discount_type: "percent" | "amount";
  discount_value: number;
  expires_at: string | null;
  used_at: string | null;
  status: "available" | "used" | "expired";
}
