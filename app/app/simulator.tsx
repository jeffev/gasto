import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../lib/theme";
import { useAppConfig } from "../lib/AppConfigContext";
import { fetchIndicadores } from "../lib/bcb";

interface Investimento {
  id: string;
  nome: string;
  emoji: string;
  taxaAA: number;
  descricao: string;
  cor: string;
  ir: boolean;
  risco: "baixo" | "médio" | "alto";
}

const BASE_INVESTIMENTOS: Investimento[] = [
  { id: "poupanca", nome: "Poupança",       emoji: "🐷", taxaAA: 0.0617, descricao: "6,17% a.a.",        cor: "#4CAF50", ir: false, risco: "baixo" },
  { id: "lci",      nome: "LCI/LCA",        emoji: "🏦", taxaAA: 0.1348, descricao: "92% CDI",           cor: "#2196F3", ir: false, risco: "baixo" },
  { id: "cdb",      nome: "CDB 100% CDI",   emoji: "💳", taxaAA: 0.1465, descricao: "14,65% a.a.",       cor: "#9C27B0", ir: true,  risco: "baixo" },
  { id: "ipca",     nome: "Tesouro IPCA+",  emoji: "📈", taxaAA: 0.165,  descricao: "IPCA + 6,5%",       cor: "#FF9800", ir: true,  risco: "baixo" },
  { id: "acoes",    nome: "Ações (IBOV)",   emoji: "🚀", taxaAA: 0.15,   descricao: "~15% a.a. histórico", cor: "#F44336", ir: true,  risco: "alto"  },
];

const PERIODOS = [
  { label: "1a",   anos: 1,  meses: 12 },
  { label: "5a",   anos: 5,  meses: 60 },
  { label: "10a",  anos: 10, meses: 120 },
  { label: "20a",  anos: 20, meses: 240 },
  { label: "30a",  anos: 30, meses: 360 },
];

function calcFV(pv: number, pmt: number, taxaAA: number, meses: number): number {
  if (meses === 0 || (pv === 0 && pmt === 0)) return 0;
  const r = Math.pow(1 + taxaAA, 1 / 12) - 1;
  if (r < 0.0000001) return pv + pmt * meses;
  return pv * Math.pow(1 + r, meses) + pmt * (Math.pow(1 + r, meses) - 1) / r;
}

function formatCompact(val: number): string {
  if (val >= 1_000_000) return `R$ ${(val / 1_000_000).toFixed(2).replace(".", ",")} mi`;
  if (val >= 1_000) return `R$ ${(val / 1_000).toFixed(1).replace(".", ",")} mil`;
  return `R$ ${val.toFixed(2).replace(".", ",")}`;
}

export default function SimulatorScreen() {
  const router = useRouter();
  const t = useTheme();
  const { fmt } = useAppConfig();
  const params = useLocalSearchParams<{ saldo?: string }>();

  const saldoDisponivel = Math.max(0, parseFloat(params.saldo ?? "0") || 0);

  const [aporteStr, setAporteStr] = useState(
    saldoDisponivel > 0 ? saldoDisponivel.toFixed(2).replace(".", ",") : ""
  );
  const [inicialStr, setInicialStr] = useState("");
  const [periodoIdx, setPeriodoIdx] = useState(2);
  const [investimentos, setInvestimentos] = useState(BASE_INVESTIMENTOS);
  const [taxaLive, setTaxaLive] = useState(false);

  useEffect(() => {
    fetchIndicadores().then((inds) => {
      const cdi = inds.find((i) => i.serie === 4389);
      if (!cdi || cdi.valor === "—") return;
      const taxaCDI = parseFloat(cdi.valor.replace("%", "").replace(",", ".")) / 100;
      if (isNaN(taxaCDI) || taxaCDI <= 0) return;
      setInvestimentos((prev) =>
        prev.map((inv) => {
          if (inv.id === "cdb") return { ...inv, taxaAA: taxaCDI, descricao: `${(taxaCDI * 100).toFixed(2).replace(".", ",")}% a.a.` };
          if (inv.id === "lci") return { ...inv, taxaAA: taxaCDI * 0.92, descricao: `92% CDI (${(taxaCDI * 92).toFixed(2).replace(".", ",")}%)` };
          if (inv.id === "poupanca") return { ...inv, taxaAA: taxaCDI * 0.7, descricao: `70% CDI (${(taxaCDI * 70).toFixed(2).replace(".", ",")}%)` };
          return inv;
        })
      );
      setTaxaLive(true);
    }).catch(() => {});
  }, []);

  const aporte = parseFloat(aporteStr.replace(",", ".")) || 0;
  const inicial = parseFloat(inicialStr.replace(",", ".")) || 0;
  const { meses, anos } = PERIODOS[periodoIdx];
  const totalInvestido = inicial + aporte * meses;

  const resultados = investimentos.map((inv) => ({
    ...inv,
    total: calcFV(inicial, aporte, inv.taxaAA, meses),
    ganho: calcFV(inicial, aporte, inv.taxaAA, meses) - totalInvestido,
  }));

  const melhor = Math.max(...resultados.map((r) => r.total));
  const temValor = aporte > 0 || inicial > 0;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.surface }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={[s.handle, { backgroundColor: t.handle }]} />

          <View style={s.headerRow}>
            <Text style={s.headerEmoji}>🔮</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.titulo, { color: t.text }]}>Seu Dinheiro no Futuro</Text>
              <Text style={[s.subtitulo, { color: t.textMuted }]}>
                {taxaLive ? "Taxas atualizadas (CDI ao vivo)" : "Taxas de referência"}
              </Text>
            </View>
          </View>

          {/* Inputs */}
          <View style={[s.inputCard, { backgroundColor: t.surfaceAlt }]}>
            <View style={s.inputRow}>
              <View style={{ flex: 1 }}>
                <Text style={[s.label, { color: t.textSub }]}>Aporte mensal</Text>
                {saldoDisponivel > 0 && (
                  <Text style={[s.labelHint, { color: t.textMuted }]}>saldo disponível: {fmt(saldoDisponivel)}</Text>
                )}
                <TextInput
                  style={[s.input, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
                  value={aporteStr}
                  onChangeText={setAporteStr}
                  placeholder="R$ 0,00"
                  placeholderTextColor={t.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.label, { color: t.textSub }]}>Valor inicial</Text>
                <Text style={[s.labelHint, { color: t.textMuted }]}>opcional</Text>
                <TextInput
                  style={[s.input, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
                  value={inicialStr}
                  onChangeText={setInicialStr}
                  placeholder="R$ 0,00"
                  placeholderTextColor={t.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <Text style={[s.label, { color: t.textSub }]}>Período</Text>
            <View style={s.periodoRow}>
              {PERIODOS.map((p, i) => {
                const ativo = i === periodoIdx;
                return (
                  <Pressable
                    key={p.label}
                    style={[s.periodoBtn, { borderColor: ativo ? "#6C63FF" : t.border, backgroundColor: ativo ? "#6C63FF" : t.bg }]}
                    onPress={() => setPeriodoIdx(i)}
                  >
                    <Text style={[s.periodoBtnText, { color: ativo ? "#fff" : t.textSub }]}>{p.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Resultados */}
          {temValor ? (
            <>
              <View style={s.secaoHeader}>
                <Text style={[s.secaoTitulo, { color: t.textSub }]}>SIMULAÇÃO EM {anos} {anos === 1 ? "ANO" : "ANOS"}</Text>
                <Text style={[s.totalInvestido, { color: t.textMuted }]}>Total investido: {fmt(totalInvestido)}</Text>
              </View>

              {resultados.map((r) => {
                const barPct = melhor > 0 ? r.total / melhor : 0;
                const ehMelhor = r.total === melhor;
                return (
                  <View key={r.id} style={[s.resultCard, { backgroundColor: t.surface }, ehMelhor && { borderWidth: 1.5, borderColor: r.cor }]}>
                    {ehMelhor && (
                      <View style={[s.melhorBadge, { backgroundColor: r.cor }]}>
                        <Text style={s.melhorBadgeText}>melhor retorno</Text>
                      </View>
                    )}
                    <View style={s.resultTop}>
                      <View style={s.resultNome}>
                        <Text style={s.resultEmoji}>{r.emoji}</Text>
                        <View>
                          <Text style={[s.resultNomeText, { color: t.text }]}>{r.nome}</Text>
                          <Text style={[s.resultDescText, { color: t.textMuted }]}>
                            {r.descricao} · {r.ir ? "c/ IR" : "isento IR"} · risco {r.risco}
                          </Text>
                        </View>
                      </View>
                      <View style={s.resultValores}>
                        <Text style={[s.resultTotal, { color: t.text }]}>{formatCompact(r.total)}</Text>
                        <Text style={[s.resultGanho, { color: r.cor }]}>
                          +{formatCompact(r.ganho)} ({r.ganho > 0 && totalInvestido > 0 ? `${Math.round((r.ganho / totalInvestido) * 100)}%` : "0%"})
                        </Text>
                      </View>
                    </View>
                    <View style={[s.barTrack, { backgroundColor: t.border }]}>
                      <View style={[s.barFill, { width: `${Math.round(barPct * 100)}%`, backgroundColor: r.cor }]} />
                    </View>
                  </View>
                );
              })}

              <View style={[s.avisoCard, { backgroundColor: t.surfaceAlt }]}>
                <Text style={[s.avisoText, { color: t.textMuted }]}>
                  ⚠️ Simulação educativa. Rentabilidades passadas não garantem retornos futuros. Não considera IR, IOF, taxa de custódia nem variações de mercado.
                  {taxaLive ? " CDI atualizado via Banco Central." : " Taxas são de referência e podem variar."}
                </Text>
              </View>
            </>
          ) : (
            <View style={s.emptyState}>
              <Text style={s.emptyEmoji}>💡</Text>
              <Text style={[s.emptyText, { color: t.textMuted }]}>Preencha o aporte mensal para ver a simulação</Text>
            </View>
          )}

          <Pressable style={[s.btnFechar, { borderColor: t.border }]} onPress={() => router.back()}>
            <Text style={[s.btnFecharText, { color: t.textSub }]}>Fechar</Text>
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 48 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 24 },

  headerRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 24 },
  headerEmoji: { fontSize: 36 },
  titulo: { fontSize: 22, fontWeight: "800" },
  subtitulo: { fontSize: 13, marginTop: 3 },

  inputCard: { borderRadius: 18, padding: 18, marginBottom: 24 },
  inputRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "700", marginBottom: 2 },
  labelHint: { fontSize: 11, marginBottom: 6 },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontWeight: "600" },
  periodoRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  periodoBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, alignItems: "center" },
  periodoBtnText: { fontSize: 13, fontWeight: "700" },

  secaoHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  secaoTitulo: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  totalInvestido: { fontSize: 12 },

  resultCard: { borderRadius: 18, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  melhorBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginBottom: 10 },
  melhorBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  resultTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  resultNome: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  resultEmoji: { fontSize: 24 },
  resultNomeText: { fontSize: 15, fontWeight: "700" },
  resultDescText: { fontSize: 12, marginTop: 2 },
  resultValores: { alignItems: "flex-end" },
  resultTotal: { fontSize: 16, fontWeight: "800" },
  resultGanho: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  barTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4 },

  avisoCard: { borderRadius: 14, padding: 14, marginTop: 8, marginBottom: 16 },
  avisoText: { fontSize: 12, lineHeight: 18 },

  emptyState: { alignItems: "center", paddingVertical: 48 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, textAlign: "center" },

  btnFechar: { borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  btnFecharText: { fontSize: 15, fontWeight: "600" },
});
