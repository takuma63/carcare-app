/* ============================================================
   (tabs)/index.tsx  ―  S2 ホーム（SPEC.md §4.2）
   ------------------------------------------------------------
   挨拶 → 予約カード（作業中のときはヒーローより上に最優先表示。
   完了通知の待ち受けがこのアプリの核のため）→ ヒーロー → 店舗一覧。
   「予約する」は /reserve（S3〜S7）、「受付QRをスキャン」は /scan（S12）へ。
============================================================ */

import React, { useEffect, useState } from "react";
import {
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/Card";
import { GoldButton } from "@/components/GoldButton";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchMyBookings } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { track } from "@/lib/analytics";
import { colors, fonts, fontSize, radius, spacing } from "@/theme";
import type { Booking } from "@/lib/types";

const STORES = [
  { name: "横浜ランドマークタワー店", tel: "0452250118", telLabel: "045-225-0118" },
  { name: "そごう横浜店", tel: "0454655599", telLabel: "045-465-5599" },
  { name: "東戸塚オーロラシティ店", tel: "0458202855", telLabel: "045-820-2855" },
  { name: "六本木ヒルズ店", tel: "0357720055", telLabel: "03-5772-0055" },
  { name: "銀座店", tel: "0335713581", telLabel: "03-3571-3581" },
];

const ACTIVE_STATUSES = new Set(["new", "confirmed", "in_progress"]);

export default function HomeScreen() {
  const router = useRouter();
  const { customer } = useAuth();
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadActiveBooking = async () => {
    try {
      const { bookings } = await fetchMyBookings();
      const active = bookings.find((b) => ACTIVE_STATUSES.has(b.status)) ?? null;
      setActiveBooking(active);
    } catch {
      // ホーム画面では通信エラーを静かに無視する（他の情報は表示できるため）
    }
  };

  useEffect(() => {
    track("screen_view", { screen: "home" });
    loadActiveBooking();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadActiveBooking();
    setRefreshing(false);
  };

  const handleReserve = () => {
    router.push("/reserve");
  };

  const handleScan = () => {
    router.push("/scan");
  };

  const isWorking = activeBooking?.status === "in_progress";

  const bookingCard = activeBooking && (
    <TouchableOpacity onPress={() => router.push(`/bookings/${activeBooking.id}`)}>
      <Card style={[styles.bookingCard, isWorking && styles.bookingCardWorking]}>
        <View style={styles.bookingHeader}>
          <Text style={styles.bookingLabel}>{isWorking ? "作業中のご予約" : "ご予約中"}</Text>
          <StatusBadge status={activeBooking.status} />
        </View>
        <Text style={styles.bookingMenu}>{primaryMenuName(activeBooking)}</Text>
        <Text style={styles.bookingSub}>{activeBooking.shop ?? "店舗未定"}</Text>
        {isWorking && <Text style={styles.bookingNotice}>作業中です。完了したら通知でお知らせします。</Text>}
      </Card>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.gold} />}
    >
      <Image source={require("@/assets/logo.png")} style={styles.logo} resizeMode="contain" />

      {customer?.name ? <Text style={styles.greeting}>{customer.name} 様</Text> : null}

      {/* 作業中は「いま何が起きているか」が最重要情報なので、ヒーローより上に出す */}
      {isWorking && bookingCard}

      <View style={styles.hero}>
        <Image source={require("@/assets/hero.jpg")} style={styles.heroImage} resizeMode="cover" />
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>究極の「彩」を{"\n"}創造する</Text>
          <GoldButton title="予約する" onPress={handleReserve} style={styles.heroButton} />
        </View>
      </View>

      <TouchableOpacity style={styles.scanButton} onPress={handleScan}>
        <Feather name="camera" size={18} color={colors.text} />
        <Text style={styles.scanButtonText}>受付QRをスキャン</Text>
      </TouchableOpacity>

      {!isWorking && bookingCard}

      <Text style={styles.sectionTitle}>店舗一覧</Text>
      <Text style={styles.sectionSub}>営業時間 10:00〜19:00（平日・土日祝）</Text>
      <View style={styles.storeList}>
        {STORES.map((store) => (
          <TouchableOpacity
            key={store.name}
            style={styles.storeRow}
            onPress={() => Linking.openURL(`tel:${store.tel}`)}
            accessibilityLabel={`${store.name}に電話する`}
          >
            <Text style={styles.storeName}>{store.name}</Text>
            <View style={styles.storeTelWrap}>
              <Feather name="phone" size={13} color={colors.goldDeep} />
              <Text style={styles.storeTel}>{store.telLabel}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

function primaryMenuName(booking: Booking): string {
  const first = booking.items[0];
  if (!first) return "メニュー未定";
  const rest = booking.items.length - 1;
  return rest > 0 ? `${first.name} 他${rest}件` : first.name;
}

const HERO_HEIGHT = 220;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  logo: {
    width: 120,
    height: 48,
    alignSelf: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  greeting: {
    fontFamily: fonts.serifJp,
    fontSize: fontSize.body,
    color: colors.text,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  hero: {
    height: HERO_HEIGHT,
    marginHorizontal: spacing.lg,
    borderRadius: radius,
    overflow: "hidden",
  },
  heroImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  heroContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  heroTitle: {
    fontFamily: fonts.serifJp,
    fontSize: fontSize.h1,
    color: colors.white,
    textAlign: "center",
    lineHeight: 38,
    marginBottom: spacing.md,
  },
  heroButton: {
    minWidth: 160,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
  },
  scanButtonText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.caption,
    color: colors.text,
  },
  bookingCard: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
  },
  bookingCardWorking: {
    marginTop: 0,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  bookingLabel: {
    fontFamily: fonts.serifEn,
    fontSize: 12,
    letterSpacing: 1,
    color: colors.goldDeep,
    textTransform: "uppercase",
  },
  bookingMenu: {
    fontFamily: fonts.serifJp,
    fontSize: fontSize.h3,
    color: colors.text,
    marginBottom: 4,
  },
  bookingSub: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
  },
  bookingNotice: {
    marginTop: spacing.sm,
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.goldDeep,
    lineHeight: 20,
  },
  sectionTitle: {
    fontFamily: fonts.serifJp,
    fontSize: fontSize.h3,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: 2,
    marginHorizontal: spacing.lg,
  },
  sectionSub: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  storeList: {
    marginHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  storeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 48,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  storeName: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.text,
  },
  storeTelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  storeTel: {
    fontFamily: fonts.serifEn,
    fontSize: fontSize.caption,
    color: colors.goldDeep,
  },
});
