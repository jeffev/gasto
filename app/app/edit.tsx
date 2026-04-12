import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";

import { atualizarDespesa } from "../lib/db";
import { Categoria } from "../lib/types";
import { CATEGORIAS, getCategoria } from "../constants/categories";
import { useTheme } from "../lib/theme";

export default function EditScreen() {
  const router = useRouter();
  const t = useTheme();
  const params = useLocalSearchParams<{
    id: string; descricao: string; valor: string;
    categoria: string; data: string; recorrente: string;
  }>();

  const dataInicial = params.data ? new Date(params.data + "T00:00:00") : new Date();
  const [descricao, setDescricao] = useState(params.descricao ?? "");
  const [valorStr, setValorStr] = useState(params.valor ?? "");
  const [categoria, setCategoria] = useState<Categoria>((params.categoria as Categoria) ?? "Outros");
  const [recorrente, setRecorrente] = useState(params.recorrente === "1");
  const [data, setData] = useState(dataInicial);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const config = getCategoria(categoria);
  const dataFormatada = data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

  async function salvar() {
    const valor = parseFloat(valorStr.replace(",", "."));
    if (!descricao.trim()) { Alert.alert("Atenção", "Informe a descrição."); return; }
    if (isNaN(valor) || valor <= 0) { Alert.alert("Atenção", "Informe um valor válido."); return; }
    setSalvando(true);
    try {
      await atualizarDespesa({ id: Number(params.id), descricao: descricao.trim(), valor, categoria, data: data.toISOString().split("T")[0], recorrente: recorrente ? 1 : 0 });
      router.back();
    } catch {
      Alert.alert("Erro", "Não foi possível salvar as alterações.");
    } finally {
      setSalvando(false);
    }
  }

  function isToday(d: Date) { return d.toDateString() === new Date().toDateString(); }
  function isYesterday(d: Date) { const o = new Date(); o.setDate(o.getDate() - 1); return d.toDateString() === o.toDateString(); }

  return (
    <SafeAreaView style={[s.safeArea, { backgroundColor: t.surface }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">

          <View style={[s.handle, { backgroundColor: t.handle }]} />
          <Text style={[s.titulo, { color: t.text }]}>Editar despesa</Text>

          <View style={[s.categoriaCard, { backgroundColor: config.corFundo, borderColor: config.cor }]}>
            <Text style={s.categoriaIcon}>{config.icon}</Text>
            <Text style={[s.categoriaLabel, { color: config.cor }]}>{categoria}</Text>
          </View>

          <Text style={[s.label, { color: t.textSub }]}>Descrição</Text>
          <TextInput style={[s.input, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
            value={descricao} onChangeText={setDescricao}
            placeholder="Ex: Lanche no trabalho" placeholderTextColor={t.textMuted} autoCapitalize="sentences" />

          <Text style={[s.label, { color: t.textSub }]}>Valor (R$)</Text>
          <TextInput style={[s.input, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
            value={valorStr} onChangeText={setValorStr}
            placeholder="0,00" placeholderTextColor={t.textMuted} keyboardType="decimal-pad" />

          <Text style={[s.label, { color: t.textSub }]}>Data</Text>
          <Pressable style={[s.dateBtn, { borderColor: t.border }]} onPress={() => setShowDatePicker(true)}>
            <Text style={s.dateBtnIcon}>📅</Text>
            <Text style={[s.dateBtnText, { color: t.text }]}>{dataFormatada}</Text>
            <View style={s.dateShortcuts}>
              <Pressable style={[s.shortcut, { borderColor: t.shortcutBorder }, isToday(data) && s.shortcutAtivo]} onPress={() => setData(new Date())}>
                <Text style={[s.shortcutText, { color: t.textSub }, isToday(data) && s.shortcutTextoAtivo]}>Hoje</Text>
              </Pressable>
              <Pressable style={[s.shortcut, { borderColor: t.shortcutBorder }, isYesterday(data) && s.shortcutAtivo]} onPress={() => { const d = new Date(); d.setDate(d.getDate() - 1); setData(d); }}>
                <Text style={[s.shortcutText, { color: t.textSub }, isYesterday(data) && s.shortcutTextoAtivo]}>Ontem</Text>
              </Pressable>
            </View>
          </Pressable>

          {showDatePicker && (
            <DateTimePicker value={data} mode="date" display="default" maximumDate={new Date()}
              onChange={(_, selected) => { setShowDatePicker(false); if (selected) setData(selected); }} />
          )}

          <Text style={[s.label, { color: t.textSub }]}>Categoria</Text>
          <View style={s.categoriaGrid}>
            {CATEGORIAS.map((cat) => {
              const selecionada = cat.label === categoria;
              return (
                <Pressable key={cat.label}
                  style={[s.catChip, { borderColor: cat.cor, backgroundColor: selecionada ? cat.cor : t.surface }]}
                  onPress={() => setCategoria(cat.label)}>
                  <Text style={s.catChipIcon}>{cat.icon}</Text>
                  <Text style={[s.catChipLabel, { color: selecionada ? "#fff" : t.textSub }]}>{cat.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[s.recorrenteRow, { backgroundColor: t.surfaceAlt }]}>
            <View>
              <Text style={[s.recorrenteLabel, { color: t.text }]}>Despesa recorrente</Text>
              <Text style={[s.recorrenteSub, { color: t.textMuted }]}>Repete todo mês automaticamente</Text>
            </View>
            <Switch value={recorrente} onValueChange={setRecorrente}
              trackColor={{ false: t.border, true: "#C4C2E8" }}
              thumbColor={recorrente ? "#6C63FF" : "#fff"} />
          </View>

          <View style={s.botoes}>
            <Pressable style={[s.btnCancelar, { borderColor: t.border }]} onPress={() => router.back()}>
              <Text style={[s.btnCancelarText, { color: t.textSub }]}>Cancelar</Text>
            </Pressable>
            <Pressable style={[s.btnSalvar, salvando && s.btnSalvarDisabled]} onPress={salvar} disabled={salvando}>
              <Text style={s.btnSalvarText}>{salvando ? "Salvando..." : "✓  Salvar"}</Text>
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  titulo: { fontSize: 22, fontWeight: "800", marginBottom: 20 },
  categoriaCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, borderWidth: 1.5, marginBottom: 24, gap: 12 },
  categoriaIcon: { fontSize: 28 },
  categoriaLabel: { fontSize: 18, fontWeight: "700" },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 16, marginBottom: 16 },
  dateBtn: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, gap: 8 },
  dateBtnIcon: { fontSize: 18 },
  dateBtnText: { fontSize: 15, fontWeight: "500", flex: 1 },
  dateShortcuts: { flexDirection: "row", gap: 6 },
  shortcut: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  shortcutAtivo: { backgroundColor: "#6C63FF", borderColor: "#6C63FF" },
  shortcutText: { fontSize: 12, fontWeight: "600" },
  shortcutTextoAtivo: { color: "#fff" },
  categoriaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  catChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, gap: 5 },
  catChipIcon: { fontSize: 14 },
  catChipLabel: { fontSize: 13, fontWeight: "600" },
  recorrenteRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, padding: 16, marginBottom: 28 },
  recorrenteLabel: { fontSize: 15, fontWeight: "600" },
  recorrenteSub: { fontSize: 12, marginTop: 2 },
  botoes: { flexDirection: "row", gap: 12 },
  btnCancelar: { flex: 1, paddingVertical: 16, borderRadius: 14, borderWidth: 1.5, alignItems: "center" },
  btnCancelarText: { fontSize: 16, fontWeight: "600" },
  btnSalvar: { flex: 2, paddingVertical: 16, borderRadius: 14, backgroundColor: "#6C63FF", alignItems: "center", shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnSalvarDisabled: { backgroundColor: "#C4C2E8" },
  btnSalvarText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
