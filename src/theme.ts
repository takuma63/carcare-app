/* ============================================================
   theme.ts  ―  デザイントークン（SPEC.md §2）
   ------------------------------------------------------------
   HP（carcare-center/style.css の :root）と完全に一致させる。
   全画面でこれ以外の色・フォントを直書きしないこと。
============================================================ */

export const colors = {
  bg: "#ffffff", // ベース背景
  bgSub: "#f5f5f5", // セクション交互背景・カード背景
  text: "#1a1a1a", // メインテキスト（チャコール）
  textLight: "#666666", // 補足テキスト
  gold: "#b8973a", // アクセント（CTAボタン・選択状態・バッジ）
  goldLight: "#d4b05a", // ゴールドのホバー/グラデ用
  goldDeep: "#8f7024", // 小さい文字（14px以下）用の濃い金。白背景でコントラスト比4.5:1以上を確保
  dark: "#1a1a1a", // フッター・ダーク面
  danger: "#c0392b", // エラー・キャンセル
  success: "#2e7d32", // 完了・成功
  white: "#ffffff",
  border: "#e4e4e4",
} as const;

export const radius = 4; // 角丸は控えめ（高級感）

export const shadow = {
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
} as const;

/* フォントファミリー名（src/app/_layout.tsx で useFonts に渡すキーと揃える） */
export const fonts = {
  serifEn: "CormorantGaramond_600SemiBold",
  serifJp: "NotoSerifJP_600SemiBold",
  sans: "NotoSansJP_400Regular",
  sansMedium: "NotoSansJP_500Medium",
  sansBold: "NotoSansJP_700Bold",
} as const;

/* 余白（8の倍数を基準に統一する） */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/* 本文は最低13px、基準16px（SPEC §2「トーン&マナー」：高齢層向けに文字は大きめ） */
export const fontSize = {
  caption: 13,
  body: 16,
  bodyLarge: 17,
  h3: 20,
  h2: 24,
  h1: 30,
} as const;

/* 予約ステータスのバッジ色（SPEC §4.2 S8：既存admin.jsのSTATUS_LABELSと対応） */
export const statusColors: Record<string, string> = {
  new: colors.textLight,
  confirmed: colors.gold,
  in_progress: colors.gold,
  done: colors.success,
  canceled: colors.danger,
};

export const statusLabels: Record<string, string> = {
  new: "新規",
  confirmed: "確定",
  in_progress: "作業中",
  done: "完了",
  canceled: "キャンセル",
};
