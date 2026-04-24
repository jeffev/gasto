import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { getConfig } from "../lib/db";
import { AppConfigProvider, useAppConfig } from "../lib/AppConfigContext";

const VERSAO_TERMOS = "1.0";

function AppNavigator() {
  const { isDark } = useAppConfig();
  const router = useRouter();
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    getConfig("termos_aceitos").then((versao) => {
      setPronto(true);
      if (versao !== VERSAO_TERMOS) {
        router.replace("/termos");
      }
    });
  }, []);

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="termos" />
        <Stack.Screen name="confirm" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="edit" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="edit-entrada" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="budget" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="add-entrada" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="next-month" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="simulator" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="pill" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="goals" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="challenge" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="import-csv" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppConfigProvider>
          <AppNavigator />
        </AppConfigProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
