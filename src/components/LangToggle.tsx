/* ============================================================
   LangToggle.tsx  ―  日本語／English の切り替え（2026-11-20）
   ------------------------------------------------------------
   設定画面と、ログイン前の画面（新規登録・ログイン）に置く。
   ボタンの文字はどちらの言語でもそのまま（「日本語」「English」）。
   切り替えると i18n.tsx が画面をまるごと組み直す。
============================================================ */

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from "react-native";
import { useLang, type Lang } from "@/lib/i18n";
import { colors, fonts, radius } from "@/theme";

const OPTIONS: { key: Lang; label: string }[] = [
  { key: "ja", label: "日本語" },
  { key: "en", label: "English" },
];

export function LangToggle({ style, compact = false }: { style?: ViewStyle; compact?: boolean }) {
  const { lang, setLang } = useLang();
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact, style]} accessibilityRole="radiogroup">
      {OPTIONS.map((o) => {
        const on = lang === o.key;
        return (
          <TouchableOpacity
            key={o.key}
            style={[styles.btn, compact && styles.btnCompact, on && styles.btnOn]}
            onPress={() => !on && setLang(o.key)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
          >
            <Text style={[styles.text, compact && styles.textCompact, on && styles.textOn]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    overflow: "hidden",
  },
  wrapCompact: { alignSelf: "flex-end" },
  btn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: colors.bg,
  },
  // flex: 0 だと Web で幅が0になり文字が縦に折れるため、伸び縮みだけ止める
  btnCompact: { flexGrow: 0, flexShrink: 0, flexBasis: "auto", paddingVertical: 6, paddingHorizontal: 14 },
  btnOn: { backgroundColor: colors.text },
  text: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.text },
  textCompact: { fontSize: 12 },
  textOn: { color: colors.white },
});
