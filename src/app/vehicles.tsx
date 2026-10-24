/* ============================================================
   vehicles.tsx  ―  車両の登録
   ------------------------------------------------------------
   ホーム画面の「車両登録／登録済みの車両」欄から開く。

   ★ 画面の言葉は「車両」で統一する（2026-10-22 発注者の指示）。
     「お車の登録」「今おもちのお車」は日本語として据わりが悪かった。

   ★ お客様にお伺いするのはメーカー・車種・ボディカラーの3つだけ
     （2026-10-24 発注者と相談のうえ決定）。
     ナンバーは分類番号やひらがなを正しく打てる方が多くなく、
     間違って入ると店舗側が直す手間が増える。ご来店時に実車を見て
     店舗が入れるほうが確実なので、管理画面の顧客詳細から入れる。
     ボディカラーは残す。同じ車種を複数お持ちの方が、アプリ上で
     見分けられなくなるため。
     ★ 店舗が入れたナンバーは、この画面にも表示する（消さない）。

   ★ 履歴から選ぶ形にしている理由
     店舗の記録には、そのお客様が過去に持ち込まれた車が全部入っている。
     乗り換えた方が多く、法人では200台を超える例もあるため、
     そのまま「お持ちの車両」としては出せない。
     ご自身に選んでいただき、選ばれたものだけをホームに出す。

   ★ 外しても記録は消えない
     「今は乗っていない」の意味で外すだけ。店舗の施工履歴と
     突き合わせられなくなるため、記録そのものは残す。
============================================================ */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/Card";
import { GoldButton } from "@/components/GoldButton";
import {
  ApiError,
  addVehicle,
  fetchMyVehicles,
  selectVehicle,
  unselectVehicle,
  type Vehicle,
} from "@/lib/api";
import { colors, fonts, fontSize, radius, spacing } from "@/theme";

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

export default function VehiclesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [selected, setSelected] = useState<Vehicle[]>([]);
  const [history, setHistory] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* 追加するときの入力。メーカー・車種・ボディカラーの3つだけ。 */
  const [adding, setAdding] = useState(false);
  const [maker, setMaker] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");

  const clearForm = () => {
    setMaker(""); setModel(""); setColor("");
  };

  const apply = (res: { selected: Vehicle[]; history: Vehicle[] }) => {
    setSelected(res.selected);
    setHistory(res.history);
  };

  const load = useCallback(async () => {
    setError(null);
    try {
      apply(await fetchMyVehicles());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "車両の情報を取得できませんでした。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<{ selected: Vehicle[]; history: Vehicle[] }>) => {
    setError(null);
    setBusy(true);
    try {
      apply(await fn());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "更新できませんでした。");
    } finally {
      setBusy(false);
    }
  };

  const onRemove = (v: Vehicle) => {
    Alert.alert(
      "この車両を外しますか",
      `${v.title}\n\nご来店の記録は残ります。もう一度「履歴から選ぶ」で戻せます。`,
      [
        { text: "やめる", style: "cancel" },
        { text: "外す", style: "destructive", onPress: () => run(() => unselectVehicle(v.id)) },
      ]
    );
  };

  const onAdd = async () => {
    if (!maker.trim() && !model.trim()) {
      setError("メーカーまたは車種をご入力ください。");
      return;
    }
    await run(() =>
      addVehicle({
        maker: maker.trim(),
        model: model.trim(),
        color: color.trim(),
      })
    );
    clearForm();
    setAdding(false);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={HIT_SLOP} accessibilityLabel="前の画面に戻る">
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>車両の登録</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.gold} />
          </View>
        ) : (
          <>
            {/* ---------- 所有している車両 ---------- */}
            <Text style={styles.sectionTitle}>所有している車両</Text>
            {selected.length === 0 ? (
              <Text style={styles.empty}>
                まだご登録がありません。{"\n"}下から選ぶか、新しく追加してください。
              </Text>
            ) : (
              selected.map((v) => (
                <Card key={v.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={styles.cardMain}>
                      <Text style={styles.cardTitle}>{v.title}</Text>
                      {v.plate ? <Text style={styles.cardSub}>{v.plate}</Text> : null}
                      {v.color ? <Text style={styles.cardSub}>{v.color}</Text> : null}
                    </View>
                    <TouchableOpacity onPress={() => onRemove(v)} hitSlop={HIT_SLOP} disabled={busy}>
                      <Text style={styles.remove}>外す</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              ))
            )}

            {/* ---------- 新しく追加 ---------- */}
            {adding ? (
              <Card style={styles.card}>
                <Text style={styles.fieldLabel}>メーカー</Text>
                <TextInput
                  style={styles.input}
                  value={maker}
                  onChangeText={setMaker}
                  placeholder="例：トヨタ"
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.fieldLabel}>車種</Text>
                <TextInput
                  style={styles.input}
                  value={model}
                  onChangeText={setModel}
                  placeholder="例：ハリアー"
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.fieldLabel}>ボディカラー</Text>
                <TextInput
                  style={styles.input}
                  value={color}
                  onChangeText={setColor}
                  placeholder="例：パールホワイト"
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.formNote}>
                  ナンバーはご来店時に店舗で確認いたしますので、ご入力は不要です。
                </Text>

                <GoldButton title="追加する" onPress={onAdd} loading={busy} style={styles.addButton} />
                <TouchableOpacity onPress={() => { clearForm(); setAdding(false); }} style={styles.linkRow}>
                  <Text style={styles.link}>やめる</Text>
                </TouchableOpacity>
              </Card>
            ) : (
              <TouchableOpacity style={styles.addRow} onPress={() => setAdding(true)} disabled={busy}>
                <Feather name="plus" size={18} color={colors.goldDeep} />
                <Text style={styles.addText}>車両を追加する</Text>
              </TouchableOpacity>
            )}

            {/* ---------- 履歴から選ぶ ---------- */}
            {history.length > 0 ? (
              <>
                <Text style={[styles.sectionTitle, styles.sectionGap]}>ご来店の記録から選ぶ</Text>
                <Text style={styles.sectionHint}>
                  これまでにご来店いただいた車両です。いま所有されているものをお選びください。
                </Text>
                {history.map((v) => (
                  <TouchableOpacity key={v.id} onPress={() => run(() => selectVehicle(v.id))} disabled={busy}>
                    <Card style={styles.card}>
                      <View style={styles.cardRow}>
                        <View style={styles.cardMain}>
                          <Text style={styles.cardTitle}>{v.title}</Text>
                          {v.plate ? <Text style={styles.cardSub}>{v.plate}</Text> : null}
                          {v.last_visited_on ? (
                            <Text style={styles.cardMeta}>最終ご来店 {v.last_visited_on}</Text>
                          ) : null}
                        </View>
                        <Feather name="plus-circle" size={22} color={colors.gold} />
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
    backgroundColor: colors.bg,
  },
  headerTitle: { fontFamily: fonts.serifJp, fontSize: fontSize.h3, color: colors.text },
  headerSpacer: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  center: { paddingVertical: spacing.xxl, alignItems: "center" },
  sectionTitle: {
    fontFamily: fonts.serifJp,
    fontSize: fontSize.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionGap: { marginTop: spacing.xl },
  sectionHint: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    lineHeight: 19,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  empty: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    lineHeight: 20,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  card: { marginBottom: spacing.sm },
  cardRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  cardMain: { flex: 1, gap: 2 },
  cardTitle: { fontFamily: fonts.serifJp, fontSize: fontSize.bodyLarge, color: colors.text },
  cardSub: { fontFamily: fonts.sans, fontSize: fontSize.caption, color: colors.textLight },
  cardMeta: { fontFamily: fonts.sans, fontSize: 12, color: colors.textLight, marginTop: 2 },
  remove: { fontFamily: fonts.sans, fontSize: fontSize.caption, color: colors.danger },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  addText: { fontFamily: fonts.sansMedium, fontSize: fontSize.body, color: colors.goldDeep },
  fieldLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.caption,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: fonts.sans,
    fontSize: fontSize.body,
    color: colors.text,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
  },
  /* ナンバーの4枠。地名・分類番号・ひらがな・一連番号の並びに合わせる */
  formNote: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textLight,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  addButton: { marginTop: spacing.xs },
  linkRow: { marginTop: spacing.md, alignItems: "center" },
  link: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    textDecorationLine: "underline",
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.danger,
    marginBottom: spacing.md,
    textAlign: "center",
  },
});
