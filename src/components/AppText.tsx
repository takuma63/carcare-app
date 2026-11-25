/* ============================================================
   AppText.tsx  ―  画面で使う Text / TextInput（react-native の代わり）
   ------------------------------------------------------------
   ★ 2026-11-25 Android 実機で文字の上下が間延びする・タブの文字が
     下で切れる、と報告があって作った。
     日本語の書体（Noto Sans JP / Noto Serif JP）は、書体の中の
     「いちばん背の高い字」に合わせた余白情報を持っていて、Android は
     標準でその分のすき間を文字の上下に足す（includeFontPadding）。
     この書体だと 16px の文字が 46px ぶんの高さを取ってしまう
     （iPhone は足さないので 23px）。
     → Android だけ includeFontPadding を切り、iPhone と同じ高さにそろえる。
   画面のファイルでは、Text / TextInput は react-native からではなく
   ここから読み込むこと。
============================================================ */

import React, { forwardRef } from "react";
import {
  Platform,
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
} from "react-native";

const androidFix = Platform.OS === "android" ? { includeFontPadding: false } : null;

export const Text = forwardRef<RNText, TextProps>(function Text({ style, ...rest }, ref) {
  return <RNText ref={ref} {...rest} style={androidFix ? [androidFix, style] : style} />;
});
export type Text = RNText;

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...rest }, ref) {
  return <RNTextInput ref={ref} {...rest} style={androidFix ? [androidFix, style] : style} />;
});
export type TextInput = RNTextInput;

/* react-navigation のタブ・見出しのように、Text を自分で描く部品に渡す用 */
export const androidTextFix = androidFix ?? {};
