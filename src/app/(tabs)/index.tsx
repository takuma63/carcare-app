/* ============================================================
   (tabs)/index.tsx  ―  S2 ホーム（SPEC.md §4.2）
   ------------------------------------------------------------
   デザイン提案01〜04・06適用済みの構成：
   フルブリードヒーロー（白抜きロゴ＋グラデーション＋左下コピー）
   → WELCOME挨拶 → クイックアクション2ボタン → 予約チケットカード
   → 店舗一覧（淡灰の帯＋白カード行）。
   「予約する」は /reserve（S3〜S7）、「受付QR」は /scan（S12）へ。
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
import { useIsFocused } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { GoldButton } from "@/components/GoldButton";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchMyBookings } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { track } from "@/lib/analytics";
import { colors, fonts, fontSize, radius, shadow, spacing } from "@/theme";
import type { Booking } from "@/lib/types";

const STORES = [
  { name: "横浜ランドマークタワー店", tel: "0452250118", telLabel: "045-225-0118" },
  { name: "そごう横浜店", tel: "0454655599", telLabel: "045-465-5599" },
  { name: "東戸塚オーロラシティ店", tel: "0458202855", telLabel: "045-820-2855" },
  { name: "六本木ヒルズ店", tel: "0357720055", telLabel: "03-5772-0055" },
  { name: "銀座店", tel: "0335713581", telLabel: "03-3571-3581" },
];

const ACTIVE_STATUSES = new Set(["new", "confirmed", "in_progress"]);
const HERO_HEIGHT = 360;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
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

  const isWorking = activeBooking?.status === "in_progress";

  return (
    <View style={styles.flex}>
      {/* ヒーローが暗いので、ホーム表示中だけステータスバーを白文字に */}
      {isFocused && <StatusBar style="light" />}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.white} />}
      >
        {/* 01 フルブリードヒーロー */}
        <View style={styles.hero}>
          <Image source={require("@/assets/hero.jpg")} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient
            colors={["rgba(0,0,0,0.34)", "rgba(0,0,0,0.04)", "rgba(12,12,12,0.82)"]}
            locations={[0, 0.42, 1]}
            style={styles.heroImage}
          />
          <Image
            source={require("@/assets/logo.png")}
            style={[styles.heroLogo, { top: insets.top + 10 }]}
            resizeMode="contain"
          />
          <View style={styles.heroCopy}>
            <Text style={styles.heroTagline}>Membership Car Wash Lounge</Text>
            <Text style={styles.heroTitle}>光を纏う、{"\n"}究極の仕上がり</Text>
          </View>
        </View>

        {/* 03 挨拶（アイブロウ構造） */}
        {customer?.name ? (
          <View style={styles.greet}>
            <Text style={styles.greetEyebrow}>Welcome</Text>
            <Text style={styles.greetName}>{customer.name} 様</Text>
          </View>
        ) : null}

        {/* 02 クイックアクション */}
        <View style={styles.actions}>
          <GoldButton title="予約する" icon="calendar" onPress={() => router.push("/reserve")} style={styles.actionMain} />
          <GoldButton
            title="受付QR"
            icon="camera"
            variant="secondary"
            onPress={() => router.push("/scan")}
            style={styles.actionSub}
          />
        </View>

        {/* 06 予約チケットカード（S7完了画面と同じ意匠） */}
        {activeBooking && (
          <TouchableOpacity onPress={() => router.push(`/bookings/${activeBooking.id}`)} activeOpacity={0.85}>
            <View style={[styles.ticket, isWorking && styles.ticketWorking]}>
              <View style={styles.ticketTop}>
                <Text style={styles.ticketNo}>
                  RECEPTION ･ {activeBooking.public_token.slice(0, 8).toUpperCase()}
                </Text>
                <StatusBadge status={activeBooking.status} />
              </View>
              <View style={styles.ticketDash} />
              <Text style={styles.ticketMenu}>{primaryMenuName(activeBooking)}</Text>
              <Text style={styles.ticketSub}>{activeBooking.shop ?? "店舗未定"}</Text>
              {isWorking && (
                <Text style={styles.ticketNotice}>作業中です。完了したら通知でお知らせします。</Text>
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* 04 店舗一覧（淡灰の帯＋白カード行） */}
        <View style={styles.stores}>
          <Text style={styles.storesEyebrow}>Our Stores</Text>
          <Text style={styles.storesTitle}>店舗一覧</Text>
          <Text style={styles.storesHours}>営業時間 10:00〜19:00（平日・土日祝）</Text>
          {STORES.map((store) => (
            <TouchableOpacity
              key={store.name}
              style={styles.storeCard}
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
    </View>
  );
}

function primaryMenuName(booking: Booking): string {
  const first = booking.items[0];
  if (!first) return "メニュー未定";
  const rest = booking.items.length - 1;
  return rest > 0 ? `${first.name} 他${rest}件` : first.name;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  hero: {
    height: HERO_HEIGHT,
    backgroundColor: colors.dark,
    overflow: "hidden",
  },
  /* StyleSheet.absoluteFillの直接指定だと画像がヒーロー枠を突き抜けて
     下のセクションまで描画される事象が実機で出たため、明示指定にしている */
  heroImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  heroLogo: {
    position: "absolute",
    alignSelf: "center",
    width: 132,
    height: 32,
    tintColor: colors.white,
    opacity: 0.96,
  },
  heroCopy: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
  },
  heroTagline: {
    fontFamily: fonts.serifEn,
    fontSize: 11,
    letterSpacing: 4,
    color: colors.goldLight,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  heroTitle: {
    fontFamily: fonts.serifJp,
    fontSize: 27,
    color: colors.white,
    lineHeight: 40,
    letterSpacing: 1,
  },
  greet: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: 1,
  },
  greetEyebrow: {
    fontFamily: fonts.serifEn,
    fontSize: 11,
    letterSpacing: 3,
    color: colors.goldDeep,
    textTransform: "uppercase",
  },
  greetName: {
    fontFamily: fonts.serifJp,
    fontSize: fontSize.bodyLarge,
    color: colors.text,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  actionMain: {
    flex: 1.4,
  },
  actionSub: {
    flex: 1,
  },
  ticket: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius,
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadow,
  },
  ticketWorking: {
    borderWidth: 1,
    borderColor: colors.gold,
  },
  ticketTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ticketNo: {
    fontFamily: fonts.serifEn,
    fontSize: 12,
    letterSpacing: 1.5,
    color: colors.goldDeep,
  },
  ticketDash: {
    borderBottomWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    marginVertical: spacing.sm,
  },
  ticketMenu: {
    fontFamily: fonts.serifJp,
    fontSize: fontSize.h3,
    color: colors.text,
    marginBottom: 2,
  },
  ticketSub: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
  },
  ticketNotice: {
    marginTop: spacing.sm,
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.goldDeep,
    lineHeight: 20,
  },
  stores: {
    marginTop: spacing.xl,
    backgroundColor: colors.bgSub,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  storesEyebrow: {
    fontFamily: fonts.serifEn,
    fontSize: 11,
    letterSpacing: 3,
    color: colors.goldDeep,
    textTransform: "uppercase",
  },
  storesTitle: {
    fontFamily: fonts.serifJp,
    fontSize: fontSize.h3,
    color: colors.text,
    marginTop: 2,
  },
  storesHours: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  storeCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 48,
    backgroundColor: colors.white,
    borderRadius: radius,
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
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
