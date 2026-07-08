/* ============================================================
   reserve/index.tsx  ―  S3 車種入力（予約ステップ1/4。SPEC.md §4.2）
   ------------------------------------------------------------
   既存Web予約（carcare-reservation/reserve.js）の体験を移植：
   入力が止まったら自動でAI判定、失敗時は手動カテゴリー選択で進める。
============================================================ */

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { StepIndicator } from "@/components/StepIndicator";
import { ReserveHeader } from "@/components/ReserveHeader";
import { GoldButton } from "@/components/GoldButton";
import { Card } from "@/components/Card";
import { useReservation } from "@/lib/reservation-context";
import { askAI, ApiError } from "@/lib/api";
import { buildCategorizePrompt, parseJudge } from "@/lib/car-judge";
import { track } from "@/lib/analytics";
import { colors, fonts, fontSize, radius, spacing } from "@/theme";

const CATEGORY_SUBS: Record<string, string> = { C1: "小型", C2: "", C3: "", C4: "", C5: "大型" };

export default function CarInputScreen() {
  const router = useRouter();
  const {
    menu,
    menuLoading,
    menuError,
    loadMenu,
    carInput,
    setCarInput,
    official,
    category,
    confidence,
    judgeNote,
    applyJudgedCategory,
    applyManualCategory,
    setJudgeNote,
  } = useReservation();

  const [judging, setJudging] = useState(false);
  const lastJudgedRef = useRef("");

  useEffect(() => {
    track("booking_started", {});
    loadMenu();
  }, []);

  const runJudge = async (text: string) => {
    if (!text || text === lastJudgedRef.current) return;
    lastJudgedRef.current = text;
    if (!menu) return;
    setJudging(true);
    setJudgeNote(null);
    try {
      const prompt = buildCategorizePrompt(menu.size_guide, menu.nickname_guide);
      const res = await askAI(prompt, text);
      const raw = res.content?.[0]?.text ?? "";
      const parsed = parseJudge(raw);
      if (parsed && parsed.category) {
        applyJudgedCategory(parsed.official || text, parsed.category, parsed.confidence === "low" ? "low" : "high");
      } else {
        setJudgeNote(parsed?.note || "自動判定できませんでした。下のカテゴリーを手動でお選びください。");
      }
    } catch (e) {
      setJudgeNote(e instanceof ApiError ? e.message : "通信エラーで自動判定できませんでした。下のカテゴリーを手動でお選びください。");
    } finally {
      setJudging(false);
    }
  };

  /* 判定は入力確定時（キーボードの完了／フォーカスが外れた時）に1回だけ走らせる。
     入力中の自動判定は「判定中…」のチラつきと誤判定のもとになるためやめた */
  const handleJudge = () => {
    const trimmed = carInput.trim();
    if (trimmed.length < 2) return;
    runJudge(trimmed);
  };

  const handleManualCategory = (cat: string) => {
    applyManualCategory(cat);
  };

  const handleNext = () => {
    router.push("/reserve/menu");
  };

  if (menuLoading && !menu) {
    return (
      <View style={styles.flex}>
        <ReserveHeader showBack={false} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      </View>
    );
  }

  if (menuError && !menu) {
    return (
      <View style={styles.flex}>
        <ReserveHeader showBack={false} />
        <View style={styles.center}>
          <Text style={styles.errorText}>{menuError}</Text>
          <GoldButton title="再読み込み" onPress={loadMenu} style={styles.retryButton} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ReserveHeader showBack={false} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <StepIndicator current={1} />

      <Text style={styles.heading}>お車の車種を{"\n"}教えてください</Text>

      <TextInput
        value={carInput}
        onChangeText={setCarInput}
        placeholder="例：プリウス、BMW X5"
        placeholderTextColor={colors.textLight}
        style={styles.input}
        onSubmitEditing={handleJudge}
        onBlur={handleJudge}
        returnKeyType="done"
      />

      {judging && (
        <View style={styles.judgingRow}>
          <ActivityIndicator color={colors.gold} size="small" />
          <Text style={styles.judgingText}>お車のサイズを判定しています…</Text>
        </View>
      )}

      {!judging && category && (
        <Card style={styles.resultCard}>
          {official ? <Text style={styles.resultTag}>AI判定</Text> : null}
          <Text style={styles.resultName}>{official || carInput || "お車"}</Text>
          <Text style={styles.resultCategory}>
            {menu?.categories[category] ?? category}
            {confidence === "low" ? "（推定）" : ""}
          </Text>
          <Text style={styles.resultHint}>違う場合は下のボタンで修正できます。</Text>
        </Card>
      )}

      {!judging && !category && judgeNote && (
        <Text style={styles.noteText}>{judgeNote}</Text>
      )}

      <Text style={styles.categoryLabel}>カテゴリーを直接選ぶ</Text>
      <View style={styles.catRow}>
        {["C1", "C2", "C3", "C4", "C5"].map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.catBtn, category === cat && styles.catBtnActive]}
            onPress={() => handleManualCategory(cat)}
          >
            <Text style={[styles.catBtnText, category === cat && styles.catBtnTextActive]}>{cat}</Text>
            <Text style={[styles.catBtnSub, category === cat && styles.catBtnTextActive]}>
              {CATEGORY_SUBS[cat] || " "}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

          <GoldButton title="次へ" onPress={handleNext} disabled={!category} style={styles.nextButton} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xxl, gap: spacing.md },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  errorText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.body,
    color: colors.danger,
    textAlign: "center",
  },
  retryButton: { minWidth: 160 },
  heading: {
    fontFamily: fonts.serifJp,
    fontSize: fontSize.h2,
    color: colors.text,
    marginTop: spacing.md,
    lineHeight: 34,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontFamily: fonts.sans,
    fontSize: fontSize.bodyLarge,
    color: colors.text,
  },
  judgingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  judgingText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
  },
  resultCard: {
    gap: 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.gold,
  },
  resultTag: {
    fontFamily: fonts.serifEn,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.goldDeep,
    textTransform: "uppercase",
  },
  resultName: {
    fontFamily: fonts.serifJp,
    fontSize: fontSize.h3,
    color: colors.text,
    textAlign: "center",
    lineHeight: 30,
  },
  resultCategory: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.body,
    color: colors.goldDeep,
  },
  resultHint: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    marginTop: 4,
  },
  noteText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    lineHeight: 20,
  },
  categoryLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textLight,
    marginTop: spacing.md,
  },
  catRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  catBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    backgroundColor: colors.white,
  },
  catBtnActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  catBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.body,
    color: colors.text,
  },
  catBtnSub: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
  catBtnTextActive: {
    color: colors.white,
  },
  nextButton: {
    marginTop: spacing.lg,
  },
});
