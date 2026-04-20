import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { getConfig, setConfig } from "./db";

type ThemeMode = "system" | "light" | "dark";

interface AppConfigType {
  themeMode: ThemeMode;
  setThemeMode: (m: ThemeMode) => Promise<void>;
  nomeUsuario: string;
  setNomeUsuario: (n: string) => Promise<void>;
  moeda: string;
  setMoeda: (m: string) => Promise<void>;
  isDark: boolean;
  fmt: (value: number) => string;
}

const AppConfigContext = createContext<AppConfigType>({
  themeMode: "system",
  setThemeMode: async () => {},
  nomeUsuario: "",
  setNomeUsuario: async () => {},
  moeda: "BRL",
  setMoeda: async () => {},
  isDark: false,
  fmt: (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
});

export function AppConfigProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [nomeUsuario, setNomeUsuarioState] = useState("");
  const [moeda, setMoedaState] = useState("BRL");

  useEffect(() => {
    Promise.all([
      getConfig("tema"),
      getConfig("nome_usuario"),
      getConfig("moeda"),
    ]).then(([tema, nome, moedaVal]) => {
      if (tema === "light" || tema === "dark" || tema === "system") setThemeModeState(tema);
      if (nome) setNomeUsuarioState(nome);
      if (moedaVal) setMoedaState(moedaVal);
    });
  }, []);

  const isDark = themeMode === "system" ? systemScheme === "dark" : themeMode === "dark";

  async function setThemeMode(m: ThemeMode) {
    setThemeModeState(m);
    await setConfig("tema", m);
  }

  async function setNomeUsuario(n: string) {
    setNomeUsuarioState(n);
    await setConfig("nome_usuario", n);
  }

  async function setMoeda(m: string) {
    setMoedaState(m);
    await setConfig("moeda", m);
  }

  const fmt = useCallback(
    (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: moeda }),
    [moeda]
  );

  return (
    <AppConfigContext.Provider value={{ themeMode, setThemeMode, nomeUsuario, setNomeUsuario, moeda, setMoeda, isDark, fmt }}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  return useContext(AppConfigContext);
}
