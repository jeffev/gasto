import React, { useCallback, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { listarOrcamentos, salvarOrcamento, deletarOrcamento, totalPorCategoria } from "../lib/db";
import { Orcamento, Categoria } from "../lib/types";
import { CATEGORIAS, getCategoria } from "../constants/categories";
import { useTheme } from "../lib/theme";

export default function BudgetScreen() {
  const router = useRouter();
  const t = useTheme();
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [totaisAtual, setTotaisAtual] = useState<Record<string, number>>({});
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [limiteStr, setLimiteStr] = useState("");

  useFocusEffect(useCallback(() => { carregarDados(); }, []));

  async function carregarDados() {
    const agora = new Date();
    const [orc, totais] = await Promise.all([
      listarOrcamentos(),
      totalPorCategoria(agora.getFullYear(), agora.getMonth() + 1),
    ]);
    setOrcamentos(orc);
    const map: Record<string, number> = {};
    totais.forEach(t => { map[t.categoria] = t.total; });
    setTotaisAtual(map);
  }

  function abrirEdicao(categoria: Categoria) {
    const atual = orcamentos.find(o => o.categoria === categoria);
    setLimiteStr(atual ? String(atual.limite) : "");
    setEditando(categoria);
  }

  async function salvar() {
    const limite = parseFloat(limiteStr.replace(",", "."));
    if (!editando) return;
    if (isNaN(limite) || limite <= 0) { Alert.alert("Atenção", "Informe um limite válido."); return; }
    await salvarOrcamento(editando, limite);
    setEditando(null);
    carregarDados();
  }

  async function remover(categoria: Categoria) {
    Alert.alert("Remover limite", `Remover orçamento de ${categoria}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: async () => { await deletarOrcamento(categoria); carregarDados(); } },
    ]);
  }

  return (
    <SafeAreaView style={[s.safeArea, { backgroundColor: t.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <View style={s.header}>
            <Pressable onPress={() => router.back()} style={[s.backBtn, { backgroundColor: t.surface }]}>
              <Text style={s.backBtnText}>‹</Text>
            </Pressable>
            <Text style={[s.titulo, { color: t.text }]}>Orçamento mensal</Text>
          </View>

          <Text style={[s.subtitulo, { color: t.textMuted }]}>
            Defina limites por categoria. Você será avisado ao ultrapassar.
          </Text>

          {CATEGORIAS.map((cat) => {
            const orc = orcamentos.find(o => o.categoria === cat.label);
            const gasto = totaisAtual[cat.label] ?? 0;
            const pct = orc ? Math.min((gasto / orc.limite) * 100, 100) : 0;
            const ultrapassou = orc && gasto > orc.limite;
            const isEditando = editando === cat.label;

            return (
              <View key={cat.label} style={[s.catCard, { backgroundColor: t.surface }]}>
                <View style={s.catHeader}>
                  <View style={[s.catIcone, { backgroundColor: cat.corFundo }]}>
                    <Text style={{ fontSize: 20 }}>{cat.icon}</Text>
                  </View>
                  <View style={s.catInfo}>
                    <Text style={[s.catNome, { color: t.text }]}>{cat.label}</Text>
                    {orc ? (
                      <Text style={[s.catLimite, { color: t.textSub }, ultrapassou ? s.catLimiteOver : {}]}>
                        {ultrapassou ? "⚠️ " : ""}
                        R$ {gasto.toFixed(2)} / R$ {orc.limite.toFixed(2)}
                      </Text>
                    ) : (
                      <Text style={[s.semLimite, { color: t.textMuted }]}>Sem limite definido</Text>
                    )}
                  </View>
                  <View style={s.catAcoes}>
                    <Pressable style={[s.btnEditar, { backgroundColor: t.surfaceAlt }]} onPress={() => isEditando ? setEditando(null) : abrirEdicao(cat.label)}>
                      <Text style={s.btnEditarText}>{isEditando ? "✕" : orc ? "✏️" : "+"}</Text>
                    </Pressable>
                    {orc && !isEditando && (
                      <Pressable style={[s.btnRemover, { backgroundColor: t.surfaceAlt }]} onPress={() => remover(cat.label)}>
                        <Text style={s.btnRemoverText}>🗑️</Text>
                      </Pressable>
                    )}
                  </View>
                </View>

                {orc && !isEditando && (
                  <View style={[s.barraFundo, { backgroundColor: t.divider }]}>
                    <View style={[s.barraPreench, { width: `${pct}%` as any, backgroundColor: ultrapassou ? "#FF4757" : cat.cor }]} />
                  </View>
                )}

                {isEditando && (
                  <View style={s.editRow}>
                    <TextInput
                      style={[s.editInput, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
                      value={limiteStr}
                      onChangeText={setLimiteStr}
                      placeholder="Limite em R$"
                      placeholderTextColor={t.textMuted}
                      keyboardType="decimal-pad"
                      autoFocus
                    />
                    <Pressable style={s.btnSalvar} onPress={salvar}>
                      <Text style={s.btnSalvarText}>Salvar</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2 },
  backBtnText: { fontSize: 24, color: "#6C63FF", lineHeight: 28 },
  titulo: { fontSize: 22, fontWeight: "800" },
  subtitulo: { fontSize: 13, marginBottom: 20, lineHeight: 18 },
  catCard: { borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 1 },
  catHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  catIcone: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  catInfo: { flex: 1 },
  catNome: { fontSize: 15, fontWeight: "700" },
  catLimite: { fontSize: 13, marginTop: 2 },
  catLimiteOver: { color: "#FF4757" },
  semLimite: { fontSize: 12, marginTop: 2 },
  catAcoes: { flexDirection: "row", gap: 6 },
  btnEditar: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  btnEditarText: { fontSize: 16 },
  btnRemover: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  btnRemoverText: { fontSize: 16 },
  barraFundo: { height: 6, borderRadius: 3, overflow: "hidden", marginTop: 12 },
  barraPreench: { height: 6, borderRadius: 3 },
  editRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  editInput: { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  btnSalvar: { backgroundColor: "#6C63FF", borderRadius: 10, paddingHorizontal: 20, justifyContent: "center" },
  btnSalvarText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
