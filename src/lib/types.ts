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
  /** メニューの写真。予約サイト上の場所（例 images/menu/wheel-coating.jpg）。オプションのみ */
  photo?: string;
}

export interface MenuGroup {
  id: string;
  name: string;
  note?: string;
  single?: boolean;
  detailPage?: string;
  items: MenuItem[];
  /** 電話のみ受付（表示はするが選択させない） */
  phoneOnly?: boolean;
}

export type MenuCategories = Record<string, string>;

/** 来店スタンプカードの状況（my-stamps API） */
export interface StampCard {
  program_name: string;
  required_count: number;
  stamps: number;
  remaining: number;
  /** これまでに貯めきった回数 */
  completed_count: number;
  reward_title: string;
  reward_description: string | null;
}

/** 回数券（前払い残高）の履歴1件（my-prepaid API） */
export interface PrepaidEntry {
  id: string;
  /** 「5万円回数券」「ご利用」「取り消し」など、そのまま表示できる文言 */
  label: string;
  /** 増えたとき正、減ったとき負 */
  amount: number;
  balance_after: number;
  shop: string | null;
  note: string | null;
  /** 取り消された記録（打ち消し済み。参考として残している） */
  voided: boolean;
  created_at: string;
}

export interface Coupon {
  grant_id: string;
  coupon_id: string;
  title: string;
  description: string | null;
  discount_type: "percent" | "amount";
  discount_value: number;
  expires_at: string | null;
  used_at: string | null;
  status: "available" | "used" | "expired";
  /** 対象メニューのグループid（null＝全メニュー） */
  target_groups: string[] | null;
  /** 「手洗い洗車・ワックスメニュー」のような表示用の文字列 */
  target_label: string;
  /** 使える店舗（null＝全店） */
  target_shops: string[] | null;
}
