import React, { useCallback, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import Svg, { Path, Circle, G } from "react-native-svg";

import {
  listarDespesasDoMes, totalDoMes, totalPorCategoria,
  listarOrcamentos, listarEntradasDoMes, totalEntradasDoMes,
  buscarMeta, salvarMeta,
} from "../../lib/db";
import { Despesa, Entrada, Orcamento } from "../../lib/types";
import { getCategoria } from "../../constants/categories";
import { getCategoriaEntrada } from "../../constants/incomeCategories";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface CategoriaTotais { categoria: string; total: number; }

// ---------------------------------------------------------------------------
// Gráfico de pizza (donut)
// ---------------------------------------------------------------------------
function DonutChart({ data, size = 180 }: {
  data: { valor: number; cor: string }[];
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.valor, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;
  const innerR = r * 0.55;

  let angle = -Math.PI / 2;
  const slices = data
    .filter((d) => d.valor > 0)
    .map((item) => {
      const fraction = item.valor / total;
      const start = angle;
      const end = angle + fraction * 2 * Math.PI;
      angle = end;

      const x1 = cx + r * Math.cos(start);
      const y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end);
      const y2 = cy + r * Math.sin(end);
      const large = fraction > 0.5 ? 1 : 0;

      // Slice fills from center
      const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
      return { path, cor: item.cor };
    });

  return (
    <Svg width={size} height={size}>
      <G>
        {slices.map((slice, i) => (
          <Path key={i} d={slice.path} fill={slice.cor} />
        ))}
        {/* Buraco central (donut) */}
        <Circle cx={cx} cy={cy} r={innerR} fill="#fff" />
      </G>
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Tela
// ---------------------------------------------------------------------------
export default function ReportsScreen() {
  const router = useRouter();
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);

  const [totalAtual, setTotalAtual] = useState(0);
  const [totalAnterior, setTotalAnterior] = useState(0);
  const [totalEntradas, setTotalEntradas] = useState(0);
  const [porCategoria, setPorCategoria] = useState<CategoriaTotais[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);

  // Meta de economia
  const [meta, setMeta] = useState(0);
  const [modalMeta, setModalMeta] = useState(false);
  const [metaStr, setMetaStr] = useState("");

  useFocusEffect(useCallback(() => { carregarDados(); }, [ano, mes]));

  async function carregarDados() {
    const mesAnt = mes === 1 ? 12 : mes - 1;
    const anoAnt = mes === 1 ? ano - 1 : ano;
    const [total, totAnt, cats, lista, orc, totalE, listaE, metaValor] = await Promise.all([
      totalDoMes(ano, mes),
      totalDoMes(anoAnt, mesAnt),
      totalPorCategoria(ano, mes),
      listarDespesasDoMes(ano, mes),
      listarOrcamentos(),
      totalEntradasDoMes(ano, mes),
      listarEntradasDoMes(ano, mes),
      buscarMeta(),
    ]);
    setTotalAtual(total);
    setTotalAnterior(totAnt);
    setTotalEntradas(totalE);
    setPorCategoria(cats);
    setDespesas(lista);
    setEntradas(listaE);
    setOrcamentos(orc);
    setMeta(metaValor);
  }

  function navegar(direcao: -1 | 1) {
    let novoMes = mes + direcao;
    let novoAno = ano;
    if (novoMes < 1) { novoMes = 12; novoAno--; }
    if (novoMes > 12) { novoMes = 1; novoAno++; }
    setMes(novoMes);
    setAno(novoAno);
  }

  async function salvarMetaHandler() {
    const valor = parseFloat(metaStr.replace(",", "."));
    if (isNaN(valor) || valor < 0) {
      Alert.alert("Atenção", "Informe um valor válido.");
      return;
    }
    await salvarMeta(valor);
    setMeta(valor);
    setModalMeta(false);
  }

  async function exportarCSV() {
    if (despesas.length === 0) {
      Alert.alert("Sem dados", "Não há despesas neste mês para exportar.");
      return;
    }
    const linhas = [
      "Data,Descrição,Categoria,Valor",
      ...despesas.map(d =>
        `${d.data},"${d.descricao.replace(/"/g, '""')}",${d.categoria},${d.valor.toFixed(2)}`
      ),
      "",
      `Total,,, ${totalAtual.toFixed(2)}`,
    ];
    const csv = linhas.join("\n");
    const nome = `gasto_${MESES[mes - 1].toLowerCase()}_${ano}.csv`;
    const path = FileSystem.documentDirectory + nome;
    await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
    const podeCompartilhar = await Sharing.isAvailableAsync();
    if (podeCompartilhar) {
      await Sharing.shareAsync(path, { mimeType: "text/csv", dialogTitle: `Exportar ${MESES[mes - 1]} ${ano}` });
    } else {
      Alert.alert("Exportado", `Arquivo salvo em: ${path}`);
    }
  }

  const saldo = totalEntradas - totalAtual;
  const variacao = totalAnterior > 0 ? ((totalAtual - totalAnterior) / totalAnterior) * 100 : null;
  const maiorCategoria = porCategoria[0]?.total ?? 1;
  const isMesAtual = ano === hoje.getFullYear() && mes === hoje.getMonth() + 1;
  const topDespesas = [...despesas].sort((a, b) => b.valor - a.valor).slice(0, 5);
  const gastosPorDia = despesas.reduce<Record<string, number>>((acc, d) => {
    acc[d.data] = (acc[d.data] ?? 0) + d.valor; return acc;
  }, {});
  const diasComGasto = Object.entries(gastosPorDia).sort(([a], [b]) => a.localeCompare(b));

  // Dados para o gráfico de pizza
  const pieData = porCategoria.map((item) => ({
    valor: item.total,
    cor: getCategoria(item.categoria).cor,
    label: item.categoria,
  }));

  // Meta de economia
  const metaPct = meta > 0 ? Math.min((saldo / meta) * 100, 100) : 0;
  const metaAtingida = meta > 0 && saldo >= meta;

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Navegação de mês */}
        <View style={s.mesNav}>
          <Pressable style={s.navBtn} onPress={() => navegar(-1)}>
            <Text style={s.navBtnText}>‹</Text>
          </Pressable>
          <View style={s.mesInfo}>
            <Text style={s.mesNome}>{MESES[mes - 1]}</Text>
            <Text style={s.mesAno}>{ano}</Text>
          </View>
          <Pressable style={[s.navBtn, isMesAtual && s.navBtnDisabled]} onPress={() => navegar(1)} disabled={isMesAtual}>
            <Text style={[s.navBtnText, isMesAtual && s.navBtnTextDisabled]}>›</Text>
          </Pressable>
        </View>

        {/* Card total */}
        <View style={s.totalCard}>
          <Text style={s.totalLabel}>Total gasto</Text>
          <Text style={s.totalValor}>
            {totalAtual.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </Text>
          {variacao !== null && (
            <View style={s.variacaoRow}>
              <Text style={[s.variacaoText, variacao > 0 ? s.variacaoCima : s.variacaoBaixo]}>
                {variacao > 0 ? "▲" : "▼"} {Math.abs(variacao).toFixed(1)}%
              </Text>
              <Text style={s.variacaoDesc}> vs {MESES[mes === 1 ? 11 : mes - 2].toLowerCase()}</Text>
            </View>
          )}
          {totalAtual === 0 && <Text style={s.semDados}>Nenhum gasto registrado neste mês</Text>}
          <View style={s.cardAcoes}>
            <Pressable style={s.cardBtn} onPress={exportarCSV}>
              <Text style={s.cardBtnText}>📤 Exportar CSV</Text>
            </Pressable>
            <Pressable style={s.cardBtn} onPress={() => router.push("/budget")}>
              <Text style={s.cardBtnText}>🎯 Orçamentos</Text>
            </Pressable>
          </View>
        </View>

        {/* Saldo */}
        {(totalEntradas > 0 || totalAtual > 0) && (
          <View style={s.saldoCard}>
            <View style={s.saldoItem}>
              <Text style={s.saldoItemLabel}>💰 Entradas</Text>
              <Text style={s.saldoItemEntrada}>
                {totalEntradas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </Text>
            </View>
            <View style={s.saldoDivider} />
            <View style={s.saldoItem}>
              <Text style={s.saldoItemLabel}>💸 Saídas</Text>
              <Text style={s.saldoItemSaida}>
                {totalAtual.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </Text>
            </View>
            <View style={s.saldoDivider} />
            <View style={s.saldoItem}>
              <Text style={s.saldoItemLabel}>📊 Saldo</Text>
              <Text style={[s.saldoItemValor, saldo >= 0 ? s.saldoPos : s.saldoNeg]}>
                {saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </Text>
            </View>
          </View>
        )}

        {/* Meta de economia */}
        <Pressable style={s.metaCard} onPress={() => { setMetaStr(meta > 0 ? String(meta) : ""); setModalMeta(true); }}>
          <View style={s.metaHeader}>
            <Text style={s.metaTitulo}>🏦 Meta de economia</Text>
            <Text style={s.metaEditar}>{meta > 0 ? "Editar" : "Definir"}</Text>
          </View>
          {meta > 0 ? (
            <>
              <View style={s.metaValores}>
                <Text style={s.metaSaldo}>
                  {saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </Text>
                <Text style={s.metaDe}>
                  de {meta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </Text>
              </View>
              <View style={s.metaBarraFundo}>
                <View style={[
                  s.metaBarraPreench,
                  { width: `${Math.max(0, metaPct)}%` as any },
                  metaAtingida ? s.metaBarraOk : (saldo < 0 ? s.metaBarraNeg : s.metaBarraParcial),
                ]} />
              </View>
              <Text style={[s.metaStatus, metaAtingida ? s.metaStatusOk : {}]}>
                {metaAtingida
                  ? "✅ Meta atingida!"
                  : saldo < 0
                    ? "❌ Saldo negativo"
                    : `${Math.round(metaPct)}% da meta`}
              </Text>
            </>
          ) : (
            <Text style={s.metaVazia}>Toque para definir quanto quer guardar este mês</Text>
          )}
        </Pressable>

        {/* Gráfico de pizza + legenda */}
        {pieData.length > 0 && (
          <View style={s.secao}>
            <Text style={s.secaoTitulo}>Distribuição</Text>
            <View style={s.pieWrapper}>
              <DonutChart data={pieData} size={180} />
              <View style={s.pieLegenda}>
                {pieData.slice(0, 6).map((item) => {
                  const pct = totalAtual > 0 ? Math.round((item.valor / totalAtual) * 100) : 0;
                  return (
                    <View key={item.label} style={s.pieLegendaItem}>
                      <View style={[s.pieLegendaDot, { backgroundColor: item.cor }]} />
                      <Text style={s.pieLegendaLabel} numberOfLines={1}>{item.label}</Text>
                      <Text style={s.pieLegendaPct}>{pct}%</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* Por categoria com barras */}
        {porCategoria.length > 0 && (
          <View style={s.secao}>
            <Text style={s.secaoTitulo}>Por categoria</Text>
            {porCategoria.map((item) => {
              const cfg = getCategoria(item.categoria);
              const pct = Math.round((item.total / maiorCategoria) * 100);
              const pctTotal = totalAtual > 0 ? Math.round((item.total / totalAtual) * 100) : 0;
              const orc = orcamentos.find(o => o.categoria === item.categoria);
              const ultrapassou = orc && item.total > orc.limite;
              const pctOrc = orc ? Math.min(Math.round((item.total / orc.limite) * 100), 100) : null;
              return (
                <View key={item.categoria} style={s.catRow}>
                  <View style={s.catRowTop}>
                    <View style={s.catRowLeft}>
                      <View style={[s.catDot, { backgroundColor: ultrapassou ? "#FF4757" : cfg.cor }]} />
                      <Text style={s.catNome}>{cfg.icon} {item.categoria}</Text>
                      {ultrapassou ? <Text style={s.overTag}>⚠️</Text> : null}
                    </View>
                    <View style={s.catRowRight}>
                      <Text style={s.catPct}>{pctTotal}%</Text>
                      <Text style={[s.catValor, ultrapassou ? { color: "#FF4757" } : {}]}>
                        {item.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </Text>
                    </View>
                  </View>
                  <View style={s.barraFundo}>
                    <View style={[s.barraPreenchimento, { width: `${pct}%` as any, backgroundColor: ultrapassou ? "#FF4757" : cfg.cor }]} />
                  </View>
                  {orc ? (
                    <Text style={[s.orcamentoHint, ultrapassou ? { color: "#FF4757" } : {}]}>
                      {ultrapassou ? "⚠️ Limite ultrapassado" : `Limite: R$ ${orc.limite.toFixed(2)}`}
                      {pctOrc !== null ? `  (${pctOrc}%)` : ""}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}

        {/* Entradas do mês */}
        {entradas.length > 0 && (
          <View style={s.secao}>
            <Text style={s.secaoTitulo}>Entradas</Text>
            {entradas.map((e) => {
              const cfg = getCategoriaEntrada(e.categoria);
              return (
                <View key={e.id} style={s.topRow}>
                  <View style={[s.topIcone, { backgroundColor: cfg.corFundo }]}>
                    <Text style={{ fontSize: 16 }}>{cfg.icon}</Text>
                  </View>
                  <View style={s.topInfo}>
                    <Text style={s.topDesc} numberOfLines={1}>{e.descricao}</Text>
                    <Text style={s.topCat}>{e.categoria}{e.recorrente === 1 ? " 🔁" : ""} · {e.data}</Text>
                  </View>
                  <Text style={s.entradaValor}>
                    +{e.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Maiores gastos */}
        {topDespesas.length > 0 && (
          <View style={s.secao}>
            <Text style={s.secaoTitulo}>Maiores gastos</Text>
            {topDespesas.map((d, i) => {
              const cfg = getCategoria(d.categoria);
              return (
                <View key={d.id} style={s.topRow}>
                  <Text style={s.topNum}>{i + 1}</Text>
                  <View style={[s.topIcone, { backgroundColor: cfg.corFundo }]}>
                    <Text style={{ fontSize: 16 }}>{cfg.icon}</Text>
                  </View>
                  <View style={s.topInfo}>
                    <Text style={s.topDesc} numberOfLines={1}>{d.descricao}</Text>
                    <Text style={s.topCat}>{d.categoria}{d.recorrente === 1 ? " 🔁" : ""}</Text>
                  </View>
                  <Text style={s.topValor}>
                    {d.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Gastos por dia */}
        {diasComGasto.length > 0 && (
          <View style={s.secao}>
            <Text style={s.secaoTitulo}>Gastos por dia</Text>
            <View style={s.diasContainer}>
              {diasComGasto.map(([data, valor]) => {
                const d = new Date(data + "T00:00:00");
                const maxDia = Math.max(...Object.values(gastosPorDia));
                const altura = Math.max(8, Math.round((valor / maxDia) * 80));
                const ehHoje = data === hoje.toISOString().split("T")[0];
                return (
                  <View key={data} style={s.diaCol}>
                    <Text style={s.diaValorMini}>
                      {valor >= 1000 ? `${(valor / 1000).toFixed(1)}k` : Math.round(valor).toString()}
                    </Text>
                    <View style={[s.diaBar, { height: altura, backgroundColor: ehHoje ? "#6C63FF" : "#C4C2E8" }]} />
                    <Text style={[s.diaDia, ehHoje && s.diaDiaHoje]}>{d.getDate()}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Simulador */}
        <Pressable
          style={s.simuladorBtn}
          onPress={() => router.push({ pathname: "/simulator", params: { saldo: String(Math.max(0, saldo)) } })}
        >
          <View style={s.simuladorBtnInner}>
            <Text style={s.simuladorEmoji}>🔮</Text>
            <View>
              <Text style={s.simuladorTitulo}>Seu Dinheiro no Futuro</Text>
              <Text style={s.simuladorSub}>
                {saldo > 0
                  ? `Simule com seu saldo de ${saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês`
                  : "Simule quanto você pode acumular"}
              </Text>
            </View>
          </View>
          <Text style={s.simuladorSeta}>→</Text>
        </Pressable>

      </ScrollView>

      {/* Modal meta de economia */}
      <Modal visible={modalMeta} transparent animationType="slide" onRequestClose={() => setModalMeta(false)}>
        <Pressable style={s.modalBackdrop} onPress={() => setModalMeta(false)}>
          <Pressable style={s.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitulo}>🏦 Meta de economia</Text>
            <Text style={s.modalSub}>Quanto você quer guardar este mês?</Text>
            <TextInput
              style={s.modalInput}
              value={metaStr}
              onChangeText={setMetaStr}
              placeholder="Ex: 500"
              placeholderTextColor="#AAA"
              keyboardType="decimal-pad"
              autoFocus
            />
            <View style={s.modalBtns}>
              {meta > 0 && (
                <Pressable style={s.modalBtnRemover} onPress={async () => {
                  await salvarMeta(0); setMeta(0); setModalMeta(false);
                }}>
                  <Text style={s.modalBtnRemoverText}>Remover meta</Text>
                </Pressable>
              )}
              <Pressable style={s.modalBtnSalvar} onPress={salvarMetaHandler}>
                <Text style={s.modalBtnSalvarText}>Salvar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4F5F7" },
  scroll: { padding: 20, paddingBottom: 40 },

  mesNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  navBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2 },
  navBtnDisabled: { backgroundColor: "#F0F0F0" },
  navBtnText: { fontSize: 24, color: "#6C63FF", lineHeight: 28 },
  navBtnTextDisabled: { color: "#CCC" },
  mesInfo: { alignItems: "center" },
  mesNome: { fontSize: 20, fontWeight: "700", color: "#1A1A2E" },
  mesAno: { fontSize: 13, color: "#888", marginTop: 1 },

  totalCard: { backgroundColor: "#6C63FF", borderRadius: 20, padding: 24, marginBottom: 16, alignItems: "center" },
  totalLabel: { color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: "500" },
  totalValor: { color: "#fff", fontSize: 38, fontWeight: "800", marginTop: 4 },
  variacaoRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  variacaoText: { fontSize: 14, fontWeight: "700" },
  variacaoCima: { color: "#FFB3B3" },
  variacaoBaixo: { color: "#B3FFD9" },
  variacaoDesc: { color: "rgba(255,255,255,0.65)", fontSize: 13 },
  semDados: { color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 8 },
  cardAcoes: { flexDirection: "row", gap: 10, marginTop: 16 },
  cardBtn: { flex: 1, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  cardBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  saldoCard: { backgroundColor: "#fff", borderRadius: 20, padding: 20, marginBottom: 16, flexDirection: "row", shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 1 },
  saldoItem: { flex: 1, alignItems: "center" },
  saldoItemLabel: { fontSize: 12, color: "#888", marginBottom: 4, fontWeight: "500" },
  saldoItemEntrada: { fontSize: 14, fontWeight: "800", color: "#2ECC71" },
  saldoItemSaida: { fontSize: 14, fontWeight: "800", color: "#FF4757" },
  saldoItemValor: { fontSize: 14, fontWeight: "800" },
  saldoPos: { color: "#2ECC71" },
  saldoNeg: { color: "#FF4757" },
  saldoDivider: { width: 1, backgroundColor: "#F0F0F0", marginVertical: 4 },

  // Meta de economia
  metaCard: { backgroundColor: "#fff", borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 1 },
  metaHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  metaTitulo: { fontSize: 15, fontWeight: "700", color: "#1A1A2E" },
  metaEditar: { fontSize: 13, color: "#6C63FF", fontWeight: "600" },
  metaValores: { flexDirection: "row", alignItems: "baseline", gap: 6, marginBottom: 10 },
  metaSaldo: { fontSize: 26, fontWeight: "800", color: "#1A1A2E" },
  metaDe: { fontSize: 14, color: "#888" },
  metaBarraFundo: { height: 10, backgroundColor: "#F0F0F0", borderRadius: 5, overflow: "hidden", marginBottom: 8 },
  metaBarraPreench: { height: 10, borderRadius: 5 },
  metaBarraOk: { backgroundColor: "#2ECC71" },
  metaBarraParcial: { backgroundColor: "#6C63FF" },
  metaBarraNeg: { backgroundColor: "#FF4757" },
  metaStatus: { fontSize: 13, color: "#888", fontWeight: "500" },
  metaStatusOk: { color: "#2ECC71", fontWeight: "700" },
  metaVazia: { fontSize: 13, color: "#AAA", lineHeight: 18 },

  secao: { backgroundColor: "#fff", borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 1 },
  secaoTitulo: { fontSize: 15, fontWeight: "700", color: "#1A1A2E", marginBottom: 16 },

  // Pizza
  pieWrapper: { flexDirection: "row", alignItems: "center", gap: 16 },
  pieLegenda: { flex: 1, gap: 8 },
  pieLegendaItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  pieLegendaDot: { width: 10, height: 10, borderRadius: 5 },
  pieLegendaLabel: { flex: 1, fontSize: 12, color: "#444", fontWeight: "500" },
  pieLegendaPct: { fontSize: 12, fontWeight: "700", color: "#1A1A2E" },

  catRow: { marginBottom: 14 },
  catRowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  catRowLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catNome: { fontSize: 14, color: "#333", fontWeight: "500" },
  overTag: { fontSize: 12 },
  catRowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  catPct: { fontSize: 12, color: "#AAA", fontWeight: "600", width: 32, textAlign: "right" },
  catValor: { fontSize: 14, fontWeight: "700", color: "#1A1A2E", width: 90, textAlign: "right" },
  barraFundo: { height: 6, backgroundColor: "#F0F0F0", borderRadius: 3, overflow: "hidden" },
  barraPreenchimento: { height: 6, borderRadius: 3 },
  orcamentoHint: { fontSize: 11, color: "#AAA", marginTop: 4 },

  entradaValor: { fontSize: 14, fontWeight: "700", color: "#2ECC71" },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  topNum: { fontSize: 13, fontWeight: "700", color: "#CCC", width: 16, textAlign: "center" },
  topIcone: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  topInfo: { flex: 1 },
  topDesc: { fontSize: 14, fontWeight: "600", color: "#1A1A2E" },
  topCat: { fontSize: 12, color: "#AAA", marginTop: 1 },
  topValor: { fontSize: 14, fontWeight: "700", color: "#1A1A2E" },

  diasContainer: { flexDirection: "row", alignItems: "flex-end", gap: 6, flexWrap: "wrap" },
  diaCol: { alignItems: "center", gap: 4, minWidth: 28 },
  diaValorMini: { fontSize: 9, color: "#AAA", fontWeight: "500" },
  diaBar: { width: 18, borderRadius: 4 },
  diaDia: { fontSize: 10, color: "#AAA" },
  diaDiaHoje: { color: "#6C63FF", fontWeight: "700" },

  simuladorBtn: { marginHorizontal: 16, marginTop: 16, marginBottom: 8, backgroundColor: "#6C63FF", borderRadius: 18, padding: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  simuladorBtnInner: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  simuladorEmoji: { fontSize: 28 },
  simuladorTitulo: { color: "#fff", fontSize: 15, fontWeight: "700" },
  simuladorSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 },
  simuladorSeta: { color: "#fff", fontSize: 20, fontWeight: "700" },

  // Modal meta
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: "#DDD", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalTitulo: { fontSize: 20, fontWeight: "700", color: "#1A1A2E", marginBottom: 6 },
  modalSub: { fontSize: 14, color: "#888", marginBottom: 20 },
  modalInput: { borderWidth: 1.5, borderColor: "#E0E0E0", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 24, fontWeight: "700", color: "#1A1A2E", marginBottom: 20 },
  modalBtns: { flexDirection: "row", gap: 10 },
  modalBtnRemover: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: "#FF4757", alignItems: "center" },
  modalBtnRemoverText: { color: "#FF4757", fontSize: 15, fontWeight: "600" },
  modalBtnSalvar: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: "#6C63FF", alignItems: "center" },
  modalBtnSalvarText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
