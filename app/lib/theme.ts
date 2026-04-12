import { useColorScheme } from "react-native";

const light = {
  bg: "#F4F5F7",
  surface: "#FFFFFF",
  surfaceAlt: "#F8F8FF",
  text: "#1A1A2E",
  textSub: "#666666",
  textMuted: "#AAAAAA",
  border: "#E0E0E0",
  divider: "#F0F0F0",
  handle: "#DDDDDD",
  shortcutBorder: "#DDDDDD",
  modalBackdrop: "rgba(0,0,0,0.4)",
  inputBg: "#FFFFFF",
};

const dark = {
  bg: "#0D0D14",
  surface: "#1A1A28",
  surfaceAlt: "#1E1E30",
  text: "#EEEEFF",
  textSub: "#8888A8",
  textMuted: "#4A4A62",
  border: "#2A2A3D",
  divider: "#252535",
  handle: "#3A3A52",
  shortcutBorder: "#3A3A52",
  modalBackdrop: "rgba(0,0,0,0.65)",
  inputBg: "#1A1A28",
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}
