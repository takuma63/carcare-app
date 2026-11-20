/* ============================================================
   LangToggle.tsx  ―  日本語／English の切り替え（2026-11-20）
   ------------------------------------------------------------
   設定画面と、ログイン前の画面（新規登録・ログイン）に置く。
   ボタンの文字はどちらの言語でもそのまま（「日本語」「English」）。
   切り替えると i18n.tsx が画面をまるごと組み直す。

   ★ 見た目（2026-11-20 発注者「浮いて見える」→ 作り直し）
     黒い箱のボタンをやめ、小さな文字だけにした。
     選んでいる方を墨色＋細い金の下線、もう片方は薄い灰色。
     画面の主役（ロゴ・入力欄）より目立たないことを優先している。
============================================================ */

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLang, type Lang } from "@/lib/i18n";
import { colors, fonts } from "@/theme";

const OPTIONS: { key: Lang; label: string }[] = [
  { key: "ja", label: "日本語" },
  { key: "en", label: "English" },
];

export function LangToggle({ style, icon = true }: { style?: ViewStyle; icon?: boolean }) {
  const { lang, setLang } = useLang();
  return (
    <View style={[styles.wrap, style]} accessibilityRole="radiogroup" accessibilityLabel="Language">
      {icon && <Feather name="globe" size={13} color={colors.textLight} style={styles.icon} />}
      {OPTIONS.map((o, i) => {
        const on = lang === o.key;
        return (
          <React.Fragment key={o.key}>
            {i > 0 && <View style={styles.divider} />}
            <TouchableOpacity
              onPress={() => !on && setLang(o.key)}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.text, on && styles.textOn]}>{o.label}</Text>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center" },
  icon: { marginRight: 6 },
  divider: { width: StyleSheet.hairlineWidth, height: 11, backgroundColor: colors.border, marginHorizontal: 10 },
  text: {
    fontFamily: fonts.sans,
    fontSize: 12,
    letterSpacing: 0.4,
    color: colors.textLight,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  textOn: {
    fontFamily: fonts.sansMedium,
    color: colors.text,
    borderBottomColor: colors.gold,
  },
});
