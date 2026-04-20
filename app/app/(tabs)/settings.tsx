import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../../lib/theme";
import { useAppConfig } from "../../lib/AppConfigContext";

const MOEDAS = [
  { label: "R$ BRL", value: "BRL" },
  { label: "$ USD", value: "USD" },
  { label: "€ EUR", value: "EUR" },
];

const TEMAS = [
  { label: "Sistema", value: "system" as const },
  { label: "Claro", value: "light" as const },
  { label: "Escuro", value: "dark" as const },
];

export default function SettingsScreen() {
  const t = useTheme();
  const { themeMode, setThemeMode, nomeUsuario, setNomeUsuario, moeda, setMoeda } = useAppConfig();
  const [nomeTemp, setNomeTemp] = useState(nomeUsuario);

  async function salvarNome() {
    await setNomeUsuario(nomeTemp.trim());
    Alert.alert("Salvo", "Nome atualizado com sucesso.");
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]}>
      <View style={s.header}>
        <Text style={[s.headerTitulo, { color: t.text }]}>Configurações</Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>

        {/* Nome do usuário */}
        <View style={[s.secao, { backgroundColor: t.surface }]}>
          <Text style={[s.secaoTitulo, { color: t.textSub }]}>SEU NOME</Text>
          <View style={s.nomeRow}>
            <TextInput
              style={[s.nomeInput, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
              value={nomeTemp}
              onChangeText={setNomeTemp}
              placeholder="Como quer ser chamado?"
              placeholderTextColor={t.textMuted}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={salvarNome}
            />
            <Pressable style={[s.nomeSalvar, nomeTemp.trim() === nomeUsuario && s.nomeSalvarDisabled]}
              onPress={salvarNome} disabled={nomeTemp.trim() === nomeUsuario}>
              <Text style={s.nomeSalvarText}>Salvar</Text>
            </Pressable>
          </View>
        </View>

        {/* Tema */}
        <View style={[s.secao, { backgroundColor: t.surface }]}>
          <Text style={[s.secaoTitulo, { color: t.textSub }]}>TEMA</Text>
          <View style={s.opcoes}>
            {TEMAS.map((tema) => {
              const ativo = themeMode === tema.value;
              return (
                <Pressable
                  key={tema.value}
                  style={[s.opcaoBtn, { borderColor: ativo ? "#6C63FF" : t.border, backgroundColor: ativo ? "#6C63FF" : t.bg }]}
                  onPress={() => setThemeMode(tema.value)}
                >
                  <Text style={[s.opcaoBtnText, { color: ativo ? "#fff" : t.textSub }]}>{tema.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Moeda */}
        <View style={[s.secao, { backgroundColor: t.surface }]}>
          <Text style={[s.secaoTitulo, { color: t.textSub }]}>MOEDA</Text>
          <View style={s.opcoes}>
            {MOEDAS.map((m) => {
              const ativo = moeda === m.value;
              return (
                <Pressable
                  key={m.value}
                  style={[s.opcaoBtn, { borderColor: ativo ? "#6C63FF" : t.border, backgroundColor: ativo ? "#6C63FF" : t.bg }]}
                  onPress={() => setMoeda(m.value)}
                >
                  <Text style={[s.opcaoBtnText, { color: ativo ? "#fff" : t.textSub }]}>{m.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={[s.versao, { color: t.textMuted }]}>Gastô v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  headerTitulo: { fontSize: 28, fontWeight: "800" },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  secao: { borderRadius: 18, padding: 20 },
  secaoTitulo: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: 14 },
  nomeRow: { flexDirection: "row", gap: 10 },
  nomeInput: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  nomeSalvar: { backgroundColor: "#6C63FF", borderRadius: 12, paddingHorizontal: 16, justifyContent: "center" },
  nomeSalvarDisabled: { backgroundColor: "#C4C2E8" },
  nomeSalvarText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  opcoes: { flexDirection: "row", gap: 10 },
  opcaoBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, alignItems: "center" },
  opcaoBtnText: { fontSize: 14, fontWeight: "600" },
  versao: { textAlign: "center", fontSize: 12, marginTop: 8 },
});
