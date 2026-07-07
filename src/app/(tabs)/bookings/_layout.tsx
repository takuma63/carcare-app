import { Stack } from "expo-router";
import { colors, fonts } from "@/theme";

export default function BookingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.sansMedium },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "予約履歴" }} />
      <Stack.Screen name="[id]" options={{ title: "予約詳細" }} />
    </Stack>
  );
}
