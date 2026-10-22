/* ============================================================
   vehicles.tsx  ―  おもちのお車の登録
   ------------------------------------------------------------
   ホーム画面の「お車」欄から開く。

   ★ 履歴から選ぶ形にしている理由
     店舗の記録には、そのお客様が過去に持ち込まれた車が全部入っている。
     乗り換えた方が多く、法人では200台を超える例もあるため、
     そのまま「おもちの車」としては出せない。
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

  // 新しく追加するとき
  const [adding, setAdding] = useState(false);
  const [maker, setMaker] = useState("");
  const [model, setModel] = useState("");

  const apply = (res: { selected: Vehicle[]; history: Vehicle[] }) => {
    setSelected(res.selected);
    setHistory(res.history);
  };

  const load = useCallback(async () => {
    setError(null);
    try {
      apply(await fetchMyVehicles());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "お車の情報を取得できませんでした。");
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
      "このお車を外しますか",
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
    await run(() => addVehicle({ maker: maker.trim(), model: model.trim() }));
    setMaker("");
    setModel("");
    setAdding(false);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={HIT_SLOP} accessibilityLabel="前の画面に戻る">
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>お車の登録</Text>
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
            {/* ---------- 今おもちのお車 ---------- */}
            <Text style={styles.sectionTitle}>今おもちのお車</Text>
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
                <GoldButton title="追加する" onPress={onAdd} loading={busy} style={styles.addButton} />
                <TouchableOpacity onPress={() => setAdding(false)} style={styles.linkRow}>
                  <Text style={styles.link}>やめる</Text>
                </TouchableOpacity>
              </Card>
            ) : (
              <TouchableOpacity style={styles.addRow} onPress={() => setAdding(true)} disabled={busy}>
                <Feather name="plus" size={18} color={colors.goldDeep} />
                <Text style={styles.addText}>新しいお車を追加する</Text>
              </TouchableOpacity>
            )}

            {/* ---------- 履歴から選ぶ ---------- */}
            {history.length > 0 ? (
              <>
                <Text style={[styles.sectionTitle, styles.sectionGap]}>ご来店の記録から選ぶ</Text>
                <Text style={styles.sectionHint}>
                  これまでにご来店いただいたお車です。今おもちのものをお選びください。
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
