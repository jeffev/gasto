import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { getConfig } from "../lib/db";

const VERSAO_TERMOS = "1.0";

export default function RootLayout() {
  const scheme = useColorScheme();
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="termos" />
          <Stack.Screen name="confirm" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
          <Stack.Screen name="edit" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
          <Stack.Screen name="budget" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
          <Stack.Screen name="add-entrada" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
