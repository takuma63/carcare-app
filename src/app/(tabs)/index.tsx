/* ============================================================
   (tabs)/index.tsx  ―  S2 ホーム（SPEC.md §4.2）
   ------------------------------------------------------------
   デザイン提案01〜04・06適用済みの構成：
   フルブリードヒーロー（白抜きロゴ＋グラデーション＋左下コピー）
   → WELCOME挨拶 → クイックアクション2ボタン → 予約チケットカード
   → 店舗一覧（淡灰の帯＋白カード行）。
   「予約する」→ /reserve（S3〜S7）。受付QRは廃止済み。
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { GoldButton } from "@/components/GoldButton";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchMyBookings, fetchMyCoupons, fetchMyPrepaid, fetchMyStamps, fetchMyVehicles, type Vehicle } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { track } from "@/lib/analytics";
import { colors, fonts, fontSize, radius, shadow, spacing } from "@/theme";
import type { Booking, StampCard } from "@/lib/types";

const STORES = [
  { name: "横浜ランドマークタワー店", tel: "0452250118", telLabel: "045-225-0118" },
  { name: "そごう横浜店", tel: "0454655599", telLabel: "045-465-5599" },
  { name: "東戸塚オーロラシティ店", tel: "0458202855", telLabel: "045-820-2855" },
  { name: "六本木ヒルズ店", tel: "0357720055", telLabel: "03-5772-0055" },
  { name: "銀座店", tel: "0335713581", telLabel: "03-3571-3581" },
];

const ACTIVE_STATUSES = new Set(["new", "confirmed", "in_progress"]);

/* 作業の進み具合を3段階で見せる。管理画面で店舗が状態を進めると、
   お客様の画面にも反映される（完了時はプッシュ通知も飛ぶ）。 */
const STEPS: { key: string; label: string }[] = [
  { key: "confirmed", label: "ご予約" },
  { key: "in_progress", label: "作業中" },
  { key: "done", label: "完了" },
];
function stepIndex(status: string): number {
  if (status === "done") return 2;
  if (status === "in_progress") return 1;
  return 0;
}
function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { customer } = useAuth();
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // クーポン・スタンプ（取得できなくてもホームは表示する）
  const [couponCount, setCouponCount] = useState(0);
  const [stamp, setStamp] = useState<StampCard | null>(null);
  // 回数券の残高（0円・未購入のときは出さない）
  const [prepaid, setPrepaid] = useState(0);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const loadActiveBooking = async () => {
    try {
      const { bookings } = await fetchMyBookings();
      /* 進行中のご予約。
         ★ 当日ぶんは「完了」になっても、その日のうちは出し続ける
           （2026-10-22）。以前は完了した時点で消えていたが、
           お客様は「終わったこと」を画面で確かめたい。 */
      const active =
        bookings.find((b) => ACTIVE_STATUSES.has(b.status) && !b.completed_at) ??
        bookings.find((b) => b.status === "done" && isToday(b.completed_at ?? b.preferred_at)) ??
        null;
      setActiveBooking(active);
    } catch {
      // ホーム画面では通信エラーを静かに無視する（他の情報は表示できるため）
    }
  };

  /* クーポンとスタンプ。取れなくてもホームは表示する（補助的な情報のため） */
  const loadRewards = async () => {
    try {
      const r = await fetchMyCoupons();
      setCouponCount(r.available_count ?? 0);
    } catch {
      // 静かに無視する
    }
    try {
      const st = await fetchMyStamps();
      setStamp(st.card);
    } catch {
      // 静かに無視する
    }
    try {
      const pp = await fetchMyPrepaid();
      setPrepaid(pp.balance);
    } catch {
      // 静かに無視する
    }
    try {
      const v = await fetchMyVehicles();
      setVehicles(v.selected ?? []);
    } catch {
      // 静かに無視する
    }
  };

  useEffect(() => {
    track("screen_view", { screen: "home" });
    loadActiveBooking();
    loadRewards();
  }, []);

  // 画面に戻ってきたら最新にする（クーポンを使った直後など）
  useEffect(() => {
    if (isFocused) loadRewards();
  }, [isFocused]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadActiveBooking(), loadRewards()]);
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
        {/* 01 ヒーロー：黒地にロゴだけを置く。
            写真は「どの車を出すか」で印象が偏るうえ、ロゴが小さく埋もれていた。
            黒・金・明朝という世界観は、余白とロゴの大きさで出す。 */}
        <View style={[styles.hero, { paddingTop: insets.top + spacing.xl }]}>
          <Image source={require("@/assets/logo.png")} style={styles.heroLogo} resizeMode="contain" />
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
        </View>

        {/* 04 車両。ご登録が無ければ「車両登録」として案内を出し、
            あれば「登録済みの車両」として中身を出す。
            乗り換えの多い業態なので、ご来店の記録から自分で選んで
            いただく形にしている（vehicles.tsx 冒頭を参照）。 */}
        <TouchableOpacity
          style={styles.cars}
          onPress={() => router.push("/vehicles")}
          activeOpacity={0.85}
          accessibilityLabel={vehicles.length === 0 ? "車両登録を開く" : "登録済みの車両を開く"}
        >
          <View style={styles.carsHead}>
            <Text style={styles.carsTitle}>{vehicles.length === 0 ? "車両登録" : "登録済みの車両"}</Text>
            <Feather name="chevron-right" size={18} color={colors.textLight} />
          </View>
          {vehicles.length === 0 ? (
            <Text style={styles.carsEmpty}>
              お持ちの車両をご登録ください。ご予約の際に選べるようになります。
            </Text>
          ) : (
            vehicles.map((v) => {
              // 色とナンバーは、入っているものだけを中黒でつなぐ
              const detail = [v.color, v.plate].filter(Boolean).join("　");
              return (
                <View key={v.id} style={styles.carRow}>
                  <Feather name="disc" size={16} color={colors.gold} />
                  <View style={styles.carMain}>
                    <Text style={styles.carName}>{v.title}</Text>
                    {detail ? <Text style={styles.carPlate}>{detail}</Text> : null}
                  </View>
                </View>
              );
            })
          )}
        </TouchableOpacity>

        {/* 05 回数券の残高（お持ちの方だけに出す） */}
        {prepaid > 0 && (
          <TouchableOpacity
            style={styles.prepaid}
            onPress={() => router.push("/prepaid")}
            activeOpacity={0.85}
            accessibilityLabel="回数券の残高と履歴を見る"
          >
            <View style={styles.prepaidBody}>
              <Text style={styles.prepaidLabel}>回数券の残高</Text>
              <Text style={styles.prepaidValue}>¥{prepaid.toLocaleString("ja-JP")}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textLight} />
          </TouchableOpacity>
        )}

        {/* 06 クーポン・スタンプのご案内（どちらか有れば出す） */}
        {(couponCount > 0 || stamp) && (
          <TouchableOpacity
            style={styles.reward}
            onPress={() => router.push("/coupons")}
            activeOpacity={0.85}
            accessibilityLabel="クーポンとスタンプを見る"
          >
            <View style={styles.rewardIcon}>
              <Feather name="gift" size={20} color={colors.gold} />
            </View>

            <View style={styles.rewardBody}>
              {couponCount > 0 ? (
                <Text style={styles.rewardTitle}>
                  ご利用いただけるクーポンが {couponCount} 枚あります
                </Text>
              ) : (
                <Text style={styles.rewardTitle}>来店スタンプ</Text>
              )}

              {stamp ? (
                <>
                  <View style={styles.rewardBar}>
                    <View
                      style={[
                        styles.rewardBarFill,
                        { width: `${Math.min((stamp.stamps / stamp.required_count) * 100, 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.rewardSub}>
                    スタンプ {stamp.stamps} / {stamp.required_count}
                    {stamp.remaining > 0
                      ? `　あと ${stamp.remaining} 回で「${stamp.reward_title}」`
                      : `　「${stamp.reward_title}」をお受け取りいただけます`}
                  </Text>
                </>
              ) : (
                <Text style={styles.rewardSub}>タップしてご確認ください</Text>
              )}
            </View>

            <Feather name="chevron-right" size={20} color={colors.textLight} />
          </TouchableOpacity>
        )}

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

              {/* 作業の進み具合。店舗が管理画面で状態を進めると、ここが動く */}
              <View style={styles.steps}>
                {STEPS.map((st, i) => {
                  const now = stepIndex(activeBooking.status);
                  const reached = i <= now;
                  return (
                    <View key={st.key} style={styles.step}>
                      {i > 0 ? <View style={[styles.stepLine, reached && styles.stepLineOn]} /> : null}
                      <View style={[styles.stepDot, reached && styles.stepDotOn]} />
                      <Text style={[styles.stepLabel, reached && styles.stepLabelOn]}>{st.label}</Text>
                    </View>
                  );
                })}
              </View>

              {isWorking && (
                <Text style={styles.ticketNotice}>作業中です。完了したら通知でお知らせします。</Text>
              )}
              {activeBooking.status === "done" && (
                <Text style={styles.ticketDone}>本日の作業が完了しました。ありがとうございました。</Text>
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* 05 ご利用履歴への導線。
            お知らせをタブに移したぶん、利用履歴はここから1タップで開く。
            「ホームのどこかにある」ではなく、行として置くのが大事（2026-10-22）。 */}
        <TouchableOpacity
          style={styles.news}
          onPress={() => router.push("/bookings")}
          activeOpacity={0.85}
          accessibilityLabel="ご利用履歴を開く"
        >
          <Feather name="calendar" size={18} color={colors.textLight} />
          <Text style={styles.newsText}>ご利用履歴</Text>
          <Feather name="chevron-right" size={18} color={colors.textLight} />
        </TouchableOpacity>

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
    paddingBottom: spacing.xxl,
  },
  hero: {
    backgroundColor: colors.dark,
    alignItems: "center",
    paddingBottom: spacing.lg,
  },
  /* ロゴは中央に大きく。横幅いっぱいまで広げず、左右に余白を残すことで
     高級感が出る（詰めるほど安っぽくなる）。 */
  /* ロゴには「Membership Car Wash Lounge」が入っているので、
     下に同じ文言を置かない。ロゴ1つと余白だけで見せる。 */
  /* ★ 大きさは元画像（786×400）を超えないところで止める。
     以前は高さ118ptで置いていたが、3倍の端末では354px必要になり、
     400pxしかない元画像が引き伸ばされて縁がガビガビになっていた。
     高さ60ptなら180pxで収まるので、拡大せずに済む。 */
  heroLogo: {
    width: "56%",
    height: 60,
    tintColor: colors.white,
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
    fontSize: fontSize.h3,
    lineHeight: 30,
    color: colors.text,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  actionMain: {
    width: "100%",
  },
  cars: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  carsHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  carsTitle: { fontFamily: fonts.serifJp, fontSize: fontSize.h3, color: colors.text },
  carsEmpty: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    lineHeight: 19,
    color: colors.textLight,
  },
  carRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  carMain: { flex: 1 },
  carName: { fontFamily: fonts.sansMedium, fontSize: fontSize.body, color: colors.text },
  carPlate: { fontFamily: fonts.sans, fontSize: fontSize.caption, color: colors.textLight },

  /* 作業の進み具合。
     ★ チケットは白背景なので、文字は濃い色にする。
       （一度 白文字で作って実機プレビューで見えなくなった） */
  steps: {
    flexDirection: "row",
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  step: { flex: 1, alignItems: "center" },
  /* 点と点をつなぐ線。1つ前の点から伸ばす */
  stepLine: {
    position: "absolute",
    top: 5,
    right: "50%",
    left: "-50%",
    height: 2,
    backgroundColor: colors.border,
  },
  stepLineOn: { backgroundColor: colors.gold },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  stepDotOn: { backgroundColor: colors.gold },
  stepLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textLight,
    marginTop: 6,
  },
  stepLabelOn: { fontFamily: fonts.sansMedium, color: colors.text },
  ticketDone: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.goldDeep,
    marginTop: spacing.sm,
  },

  /* お知らせ */
  news: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
  },
  newsText: { flex: 1, fontFamily: fonts.sans, fontSize: fontSize.body, color: colors.textLight },
  newsTextOn: { fontFamily: fonts.sansMedium, color: colors.text },
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
    fontFamily: fonts.num,
    fontVariant: ["tabular-nums"],
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
  /* 回数券の残高カード。金額は細い書体だと数字が見分けにくいので太いゴシックにする */
  prepaid: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.bgSub,
    borderRadius: radius,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
  },
  prepaidBody: { flex: 1, gap: 2 },
  prepaidLabel: { fontFamily: fonts.sans, fontSize: fontSize.caption, color: colors.textLight },
  prepaidValue: { fontFamily: fonts.num, fontVariant: ["tabular-nums"], fontSize: 26, color: colors.text },

  /* クーポン・スタンプの案内バナー */
  reward: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    ...shadow,
  },
  rewardIcon: {
    width: 40,
    height: 40,
    borderRadius: radius,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fdfbf6",
  },
  rewardBody: { flex: 1, gap: 5 },
  rewardTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.caption,
    color: colors.text,
    lineHeight: 20,
  },
  rewardSub: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textLight,
    lineHeight: 18,
  },
  /* スタンプの進み具合を細い帯で見せる */
  rewardBar: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  rewardBarFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.gold,
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
    fontFamily: fonts.num,
    fontVariant: ["tabular-nums"],
    fontSize: fontSize.caption,
    color: colors.goldDeep,
  },
});
