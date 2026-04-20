import { Tabs } from "expo-router";
import { Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../lib/theme";

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={[s.icon, focused && s.iconFocused]}>{emoji}</Text>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [s.tabBar, {
          backgroundColor: t.surface,
          borderTopColor: t.divider,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
        }],
        tabBarActiveTintColor: "#6C63FF",
        tabBarInactiveTintColor: t.textMuted,
        tabBarLabelStyle: s.label,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Despesas",
          tabBarIcon: ({ focused }) => <TabIcon emoji="💸" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="income"
        options={{
          title: "Entradas",
          tabBarIcon: ({ focused }) => <TabIcon emoji="💰" focused={focused} />,
          tabBarActiveTintColor: "#2ECC71",
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Relatórios",
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Config.",
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  tabBar: { borderTopWidth: 1 },
  label: { fontSize: 11, fontWeight: "600" },
  icon: { fontSize: 20, opacity: 0.5 },
  iconFocused: { opacity: 1 },
});
