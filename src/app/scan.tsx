/* ============================================================
   scan.tsx  ―  S12 QRスキャン（モーダル。SPEC.md §4.2）
   ------------------------------------------------------------
   受付QR（{STATUS_BASE_URL}/t/{public_token}）を読み取り、
   link-booking で自分（app_user）をその予約の通知対象に連携する。
   自分のcustomerとは別の予約でも紐付け可（家族の引き取り等。制限しない）。
============================================================ */

import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { GoldButton } from "@/components/GoldButton";
import { Card } from "@/components/Card";
import { linkBooking, ApiError } from "@/lib/api";
import { track } from "@/lib/analytics";
import { colors, fonts, fontSize, spacing } from "@/theme";
import type { Booking } from "@/lib/types";

/* 新旧どちらのドメインでも「/t/」以降をtokenとして抽出する（SPEC.md §7.2） */
function extractToken(data: string): string | null {
  const m = data.match(/\/t\/([^/?#]+)/);
  return m ? m[1] : null;
}

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);

  const handleScanned = async ({ data }: { data: string }) => {
    if (scanned || linking) return;
    const token = extractToken(data);
    if (!token) return; // 想定外のQR（無反応。連写スキャン中に別のQRを誤読しても無視する）
    setScanned(true);
    setLinking(true);
    setError(null);
    try {
      const result = await linkBooking(token);
      setBooking(result.booking);
      track("qr_scanned", {});
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "連携に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setLinking(false);
    }
  };

  const handleRetry = () => {
    setScanned(false);
    setError(null);
    setBooking(null);
  };

  if (!permission) {
    return <View style={styles.flex} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionWrap}>
        <Text style={styles.permissionText}>受付QRコードの読み取りにはカメラの利用許可が必要です。</Text>
        <GoldButton title="カメラを許可する" onPress={requestPermission} style={styles.permissionButton} />
        <GoldButton title="閉じる" variant="secondary" onPress={() => router.back()} style={styles.permissionButton} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned ? undefined : handleScanned}
      />
      <View style={styles.overlay}>
        <View style={styles.frame} />
        {!scanned && <Text style={styles.hint}>受付QRコードを枠内に写してください</Text>}
      </View>

      {(linking || booking || error) && (
        <View style={styles.resultWrap}>
          <Card style={styles.resultCard}>
            {linking && <Text style={styles.resultText}>連携しています…</Text>}
            {error && (
              <>
                <Text style={[styles.resultText, styles.errorText]}>{error}</Text>
                <GoldButton title="もう一度読み取る" onPress={handleRetry} style={styles.resultButton} />
              </>
            )}
            {booking && !error && (
              <>
                <Text style={styles.resultTitle}>この予約と連携しました</Text>
                <Text style={styles.resultText}>完了したら通知でお知らせします。</Text>
                <Text style={styles.resultSub}>
                  {(booking.car_official ?? "お車の情報未定") + (booking.shop ? "　" + booking.shop : "")}
                </Text>
                <GoldButton title="閉じる" onPress={() => router.back()} style={styles.resultButton} />
              </>
            )}
          </Card>
        </View>
      )}

      <View style={styles.closeRow}>
        <GoldButton title="閉じる" variant="secondary" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const FRAME_SIZE = 240;

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.dark },
  permissionWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.bg,
  },
  permissionText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.body,
    color: colors.text,
    textAlign: "center",
  },
  permissionButton: {
    minWidth: 220,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    borderWidth: 2,
    borderColor: colors.gold,
    borderRadius: 12,
  },
  hint: {
    marginTop: spacing.lg,
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.white,
  },
  resultWrap: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: 120,
  },
  resultCard: {
    gap: spacing.xs,
    alignItems: "center",
  },
  resultTitle: {
    fontFamily: fonts.serifJp,
    fontSize: fontSize.h3,
    color: colors.text,
  },
  resultText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.text,
    textAlign: "center",
  },
  resultSub: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
  },
  errorText: {
    color: colors.danger,
  },
  resultButton: {
    marginTop: spacing.sm,
    minWidth: 160,
  },
  closeRow: {
    position: "absolute",
    top: 60,
    right: spacing.lg,
  },
});
