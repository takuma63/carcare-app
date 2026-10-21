/* ============================================================
   stripe.ts  ―  決済（現在は無効）
   ------------------------------------------------------------
   @stripe/stripe-react-native は 2026-10-21 に依存から外した。
   理由と、再開するときの手順は STRIPE-HOLD.md を参照。

   ★ なぜ空の実装を残しているのか
     決済の画面（reserve/confirm.tsx）のコードはそのまま残してあり、
     本番の公開鍵を app.json に戻せば動く状態にしてある。
     その import 先として、この何もしない実装を置いている。

     STRIPE_PUBLISHABLE_KEY が未設定の間は、
     ・_layout.tsx は StripeProvider を付けずにアプリを起動する
     ・confirm.tsx は「今すぐ決済」の行自体を表示しない
     ため、ここの関数が実際に呼ばれることはない。

   ★ 型は本物に合わせてある
     呼び出し側を書き換えずに差し替えられるよう、引数と戻り値の形を
     @stripe/stripe-react-native と同じにしている。
============================================================ */

import type React from "react";

/** 決済シートの初期化・表示が返すエラー（本物と同じ形） */
interface StripeError {
  code: string;
  message: string;
  localizedMessage?: string;
}

interface StripeResult {
  error?: StripeError;
}

const notAvailable: StripeResult = {
  error: {
    code: "Failed",
    message: "ただいま事前決済をご利用いただけません。店頭でのお支払いをお願いいたします。",
    localizedMessage: "ただいま事前決済をご利用いただけません。店頭でのお支払いをお願いいたします。",
  },
};

interface ProviderProps {
  children?: React.ReactNode;
  publishableKey?: string;
  merchantIdentifier?: string;
  urlScheme?: string;
}

export function StripeProvider(props: ProviderProps) {
  return props.children as React.ReactElement;
}

export function useStripe() {
  return {
    async initPaymentSheet(_params?: Record<string, unknown>): Promise<StripeResult> {
      return notAvailable;
    },
    async presentPaymentSheet(_params?: Record<string, unknown>): Promise<StripeResult> {
      return notAvailable;
    },
  };
}
