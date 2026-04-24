import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../lib/theme";
import { useAppConfig } from "../lib/AppConfigContext";
import {
  listarObjetivos, inserirObjetivo, atualizarObjetivo, deletarObjetivo, Objetivo,
} from "../lib/db";

const EMOJIS = ["🎯","✈️","🏠","🚗","📱","🎓","💍","🏖️","🛍️","💪","🌍","🎸","🏋️","🐶","💻"];

const hoje = new Date();

function mesesRestantes(prazo: string): number {
  const [ano, mes] = prazo.split("-").map(Number);
  const diff = (ano - hoje.getFullYear()) * 12 + (mes - (hoje.getMonth() + 1));
  return Math.max(1, diff);
}

function formatarPrazo(prazo: string): string {
  const [ano, mes] = prazo.split("-");
  const nomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${nomes[parseInt(mes) - 1]}/${ano}`;
}

export default function GoalsScreen() {
  const router = useRouter();
  const t = useTheme();
  const { fmt } = useAppConfig();
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Objetivo | null>(null);

  const [nome, setNome] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [valorAlvoStr, setValorAlvoStr] = useState("");
  const [valorAtualStr, setValorAtualStr] = useState("");
  const [prazo, setPrazo] = useState(() => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + 6, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setObjetivos(await listarObjetivos());
  }

  function abrirNovo() {
    setEditando(null);
    setNome(""); setEmoji("🎯"); setValorAlvoStr(""); setValorAtualStr("");
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + 6, 1);
    setPrazo(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setShowForm(true);
  }

  function abrirEditar(obj: Objetivo) {
    setEditando(obj);
    setNome(obj.nome);
    setEmoji(obj.emoji);
    setValorAlvoStr(obj.valor_alvo.toFixed(2).replace(".", ","));
    setValorAtualStr(obj.valor_atual > 0 ? obj.valor_atual.toFixed(2).replace(".", ",") : "");
    setPrazo(obj.prazo);
    setShowForm(true);
  }

  async function salvar() {
    const alvo = parseFloat(valorAlvoStr.replace(",", "."));
    if (!nome.trim() || isNaN(alvo) || alvo <= 0) {
      Alert.alert("Atenção", "Preencha o nome e o valor-alvo.");
      return;
    }
    const atual = parseFloat(valorAtualStr.replace(",", ".")) || 0;
    if (editando) {
      await atualizarObjetivo({ id: editando.id, nome: nome.trim(), emoji, valor_alvo: alvo, valor_atual: atual, prazo });
    } else {
      await inserirObjetivo({ nome: nome.trim(), emoji, valor_alvo: alvo, valor_atual: atual, prazo });
    }
    setShowForm(false);
    carregar();
  }

  async function confirmarDeletar(id: number, nome: string) {
    Alert.alert("Remover objetivo", `Remover "${nome}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: async () => { await deletarObjetivo(id); carregar(); } },
    ]);
  }

  // Avançar/recuar prazo em meses
  function ajustarPrazo(delta: number) {
    const [a, m] = prazo.split("-").map(Number);
    const d = new Date(a, m - 1 + delta, 1);
    const minD = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
    if (d < minD) return;
    setPrazo(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  if (showForm) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: t.surface }]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            <View style={[s.handle, { backgroundColor: t.handle }]} />
            <Text style={[s.titulo, { color: t.text }]}>{editando ? "Editar objetivo" : "Novo objetivo"}</Text>

            {/* Emoji picker */}
            <Text style={[s.label, { color: t.textSub }]}>Emoji</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.emojiRow}>
              {EMOJIS.map((e) => (
                <Pressable key={e} style={[s.emojiBtn, emoji === e && { backgroundColor: "#6C63FF22", borderColor: "#6C63FF" }]} onPress={() => setEmoji(e)}>
                  <Text style={s.emojiChar}>{e}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[s.label, { color: t.textSub }]}>Nome do objetivo</Text>
            <TextInput
              style={[s.input, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
              value={nome} onChangeText={setNome} placeholder="Ex: Viagem para Europa"
              placeholderTextColor={t.textMuted}
            />

            <Text style={[s.label, { color: t.textSub }]}>Valor-alvo</Text>
            <TextInput
              style={[s.input, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
              value={valorAlvoStr} onChangeText={setValorAlvoStr} placeholder="R$ 0,00"
              placeholderTextColor={t.textMuted} keyboardType="decimal-pad"
            />

            <Text style={[s.label, { color: t.textSub }]}>Já tenho guardado (opcional)</Text>
            <TextInput
              style={[s.input, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
              value={valorAtualStr} onChangeText={setValorAtualStr} placeholder="R$ 0,00"
              placeholderTextColor={t.textMuted} keyboardType="decimal-pad"
            />

            <Text style={[s.label, { color: t.textSub }]}>Prazo</Text>
            <View style={s.prazoRow}>
              <Pressable style={[s.prazoBtn, { borderColor: t.border }]} onPress={() => ajustarPrazo(-1)}>
                <Text style={[s.prazoBtnText, { color: t.textSub }]}>‹</Text>
              </Pressable>
              <Text style={[s.prazoValor, { color: t.text }]}>{formatarPrazo(prazo)}</Text>
              <Pressable style={[s.prazoBtn, { borderColor: t.border }]} onPress={() => ajustarPrazo(1)}>
                <Text style={[s.prazoBtnText, { color: t.textSub }]}>›</Text>
              </Pressable>
            </View>

            {/* Preview do aporte necessário */}
            {valorAlvoStr && !isNaN(parseFloat(valorAlvoStr.replace(",", "."))) && (
              <View style={[s.previewCard, { backgroundColor: "#6C63FF12" }]}>
                <Text style={[s.previewText, { color: "#6C63FF" }]}>
                  💡 Guardar{" "}
                  <Text style={s.previewDestaque}>
                    {fmt(Math.max(0, (parseFloat(valorAlvoStr.replace(",", ".")) - (parseFloat(valorAtualStr.replace(",", ".")) || 0)) / mesesRestantes(prazo)))}
                    /mês
                  </Text>{" "}
                  por {mesesRestantes(prazo)} {mesesRestantes(prazo) === 1 ? "mês" : "meses"}
                </Text>
              </View>
            )}

            <View style={s.formBtns}>
              <Pressable style={[s.btnCancelar, { borderColor: t.border }]} onPress={() => setShowForm(false)}>
                <Text style={[s.btnCancelarText, { color: t.textSub }]}>Cancelar</Text>
              </Pressable>
              <Pressable style={s.btnSalvar} onPress={salvar}>
                <Text style={s.btnSalvarText}>Salvar</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.surface }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={[s.handle, { backgroundColor: t.handle }]} />
        <View style={s.headerRow}>
          <Text style={[s.titulo, { color: t.text }]}>Metas e objetivos</Text>
          <Pressable style={s.btnNovo} onPress={abrirNovo}>
            <Text style={s.btnNovoText}>+ Novo</Text>
          </Pressable>
        </View>

        {objetivos.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyEmoji}>🎯</Text>
            <Text style={[s.emptyTitulo, { color: t.text }]}>Nenhum objetivo ainda</Text>
            <Text style={[s.emptyDesc, { color: t.textMuted }]}>Crie uma meta com valor e prazo para acompanhar o progresso mês a mês.</Text>
          </View>
        ) : (
          objetivos.map((obj) => {
            const falta = Math.max(0, obj.valor_alvo - obj.valor_atual);
            const pct = obj.valor_alvo > 0 ? Math.min((obj.valor_atual / obj.valor_alvo) * 100, 100) : 0;
            const meses = mesesRestantes(obj.prazo);
            const aporteMensal = falta > 0 ? falta / meses : 0;
            const concluido = obj.valor_atual >= obj.valor_alvo;
            return (
              <Pressable key={obj.id} style={[s.objCard, { backgroundColor: t.bg }]} onPress={() => abrirEditar(obj)}>
                <View style={s.objHeader}>
                  <View style={s.objNomeRow}>
                    <Text style={s.objEmoji}>{obj.emoji}</Text>
                    <View>
                      <Text style={[s.objNome, { color: t.text }]}>{obj.nome}</Text>
                      <Text style={[s.objPrazo, { color: t.textMuted }]}>Prazo: {formatarPrazo(obj.prazo)}</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => confirmarDeletar(obj.id, obj.nome)} hitSlop={12}>
                    <Text style={{ color: t.textMuted, fontSize: 18 }}>×</Text>
                  </Pressable>
                </View>

                <View style={s.objValores}>
                  <Text style={[s.objAtual, { color: concluido ? "#2ECC71" : t.text }]}>{fmt(obj.valor_atual)}</Text>
                  <Text style={[s.objAlvo, { color: t.textMuted }]}>de {fmt(obj.valor_alvo)}</Text>
                </View>

                <View style={[s.barTrack, { backgroundColor: t.border }]}>
                  <View style={[s.barFill, { width: `${Math.round(pct)}%` as any, backgroundColor: concluido ? "#2ECC71" : "#6C63FF" }]} />
                </View>

                <View style={s.objFooter}>
                  <Text style={[s.objPct, { color: concluido ? "#2ECC71" : "#6C63FF" }]}>{Math.round(pct)}%</Text>
                  {concluido ? (
                    <Text style={[s.objDica, { color: "#2ECC71" }]}>🎉 Objetivo atingido!</Text>
                  ) : (
                    <Text style={[s.objDica, { color: t.textMuted }]}>
                      {fmt(aporteMensal)}/mês · {meses} {meses === 1 ? "mês" : "meses"}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })
        )}

        <Pressable style={[s.btnFechar, { borderColor: t.border }]} onPress={() => router.back()}>
          <Text style={[s.btnFecharText, { color: t.textSub }]}>Fechar</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 48 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 20 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  titulo: { fontSize: 22, fontWeight: "800" },
  btnNovo: { backgroundColor: "#6C63FF", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  btnNovoText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  label: { fontSize: 12, fontWeight: "700", marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontWeight: "600" },

  emojiRow: { flexDirection: "row", marginBottom: 4 },
  emojiBtn: { padding: 8, borderRadius: 10, borderWidth: 1.5, borderColor: "transparent", marginRight: 6 },
  emojiChar: { fontSize: 22 },

  prazoRow: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 4 },
  prazoBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, justifyContent: "center", alignItems: "center" },
  prazoBtnText: { fontSize: 22, lineHeight: 26 },
  prazoValor: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700" },

  previewCard: { borderRadius: 12, padding: 14, marginTop: 16 },
  previewText: { fontSize: 14, lineHeight: 20 },
  previewDestaque: { fontWeight: "800" },

  formBtns: { flexDirection: "row", gap: 10, marginTop: 24 },
  btnCancelar: { flex: 1, borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  btnCancelarText: { fontSize: 15, fontWeight: "600" },
  btnSalvar: { flex: 2, backgroundColor: "#6C63FF", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  btnSalvarText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  emptyState: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyTitulo: { fontSize: 18, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },

  objCard: { borderRadius: 18, padding: 18, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  objHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  objNomeRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  objEmoji: { fontSize: 28 },
  objNome: { fontSize: 16, fontWeight: "700" },
  objPrazo: { fontSize: 12, marginTop: 2 },
  objValores: { flexDirection: "row", alignItems: "baseline", gap: 6, marginBottom: 10 },
  objAtual: { fontSize: 22, fontWeight: "800" },
  objAlvo: { fontSize: 14 },
  barTrack: { height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 8 },
  barFill: { height: 8, borderRadius: 4 },
  objFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  objPct: { fontSize: 13, fontWeight: "800" },
  objDica: { fontSize: 12 },

  btnFechar: { borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  btnFecharText: { fontSize: 15, fontWeight: "600" },
});
