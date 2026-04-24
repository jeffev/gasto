import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../lib/theme";
import { useAppConfig } from "../lib/AppConfigContext";
import { classificarTexto } from "../lib/classifier";
import { inserirDespesa } from "../lib/db";
import { Categoria } from "../lib/types";
import { getCategoria } from "../constants/categories";

interface LinhaImport {
  idx: number;
  data: string;
  descricao: string;
  valor: number;
  categoria: Categoria;
  selecionada: boolean;
  erro?: string;
}

function normalizarData(raw: string): string {
  // Aceita dd/mm/yyyy, yyyy-mm-dd, dd-mm-yyyy
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m1 = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;
  return new Date().toISOString().split("T")[0];
}

function parsearCSV(texto: string): Array<{ data: string; descricao: string; valor: string }> {
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim());
  if (linhas.length < 2) return [];

  // Detecta separador
  const sep = linhas[0].includes(";") ? ";" : ",";

  // Tenta mapear colunas pelo cabeçalho
  const cabecalho = linhas[0].toLowerCase().split(sep).map((c) => c.trim().replace(/"/g, ""));
  const iData = cabecalho.findIndex((c) => c.includes("data") || c.includes("date"));
  const iDesc = cabecalho.findIndex((c) => c.includes("descri") || c.includes("histor") || c.includes("memo") || c.includes("desc"));
  const iValor = cabecalho.findIndex((c) => c.includes("valor") || c.includes("value") || c.includes("amount") || c.includes("debito") || c.includes("debit"));

  if (iData === -1 || iDesc === -1 || iValor === -1) return [];

  const resultado: Array<{ data: string; descricao: string; valor: string }> = [];
  for (let i = 1; i < linhas.length; i++) {
    const cols = linhas[i].split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cols.length <= Math.max(iData, iDesc, iValor)) continue;
    const valorRaw = cols[iValor].replace(/[R$\s]/g, "").replace(".", "").replace(",", ".");
    const valorNum = parseFloat(valorRaw);
    if (isNaN(valorNum) || valorNum <= 0) continue;
    resultado.push({ data: cols[iData], descricao: cols[iDesc], valor: cols[iValor] });
  }
  return resultado;
}

export default function ImportCSVScreen() {
  const router = useRouter();
  const t = useTheme();
  const { fmt } = useAppConfig();
  const [linhas, setLinhas] = useState<LinhaImport[]>([]);
  const [processando, setProcessando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [etapa, setEtapa] = useState<"inicio" | "revisao">("inicio");

  async function selecionarArquivo() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["text/csv", "text/plain", "*/*"] });
      if (result.canceled || !result.assets?.[0]) return;
      const uri = result.assets[0].uri;
      const texto = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
      await processarTexto(texto);
    } catch {
      Alert.alert("Erro", "Não foi possível ler o arquivo.");
    }
  }

  async function processarTexto(texto: string) {
    setProcessando(true);
    const linhasBrutas = parsearCSV(texto);
    if (linhasBrutas.length === 0) {
      Alert.alert("Formato não reconhecido", "O arquivo deve ter colunas de data, descrição e valor. Formatos aceitos: CSV/TXT com separador vírgula ou ponto-e-vírgula.");
      setProcessando(false);
      return;
    }

    const resultado: LinhaImport[] = [];
    for (let i = 0; i < linhasBrutas.length; i++) {
      const { data, descricao, valor } = linhasBrutas[i];
      const valorNum = parseFloat(valor.replace(/[R$\s]/g, "").replace(".", "").replace(",", "."));
      try {
        const parsed = await classificarTexto(descricao);
        resultado.push({
          idx: i,
          data: normalizarData(data),
          descricao: parsed.descricao || descricao,
          valor: Math.abs(valorNum),
          categoria: parsed.categoria,
          selecionada: true,
        });
      } catch {
        resultado.push({
          idx: i,
          data: normalizarData(data),
          descricao,
          valor: Math.abs(valorNum),
          categoria: "Outros" as Categoria,
          selecionada: true,
        });
      }
    }

    setLinhas(resultado);
    setEtapa("revisao");
    setProcessando(false);
  }

  function toggleLinha(idx: number) {
    setLinhas((prev) => prev.map((l) => l.idx === idx ? { ...l, selecionada: !l.selecionada } : l));
  }

  function toggleTodas() {
    const todas = linhas.every((l) => l.selecionada);
    setLinhas((prev) => prev.map((l) => ({ ...l, selecionada: !todas })));
  }

  async function salvarSelecionadas() {
    const selecionadas = linhas.filter((l) => l.selecionada);
    if (selecionadas.length === 0) { Alert.alert("Atenção", "Selecione ao menos uma linha."); return; }

    setSalvando(true);
    let erros = 0;
    for (const l of selecionadas) {
      try {
        await inserirDespesa({
          descricao: l.descricao,
          valor: l.valor,
          categoria: l.categoria,
          data: l.data,
          input_original: l.descricao,
          recorrente: 0,
        });
      } catch { erros++; }
    }
    setSalvando(false);
    const msg = erros > 0
      ? `${selecionadas.length - erros} importadas, ${erros} com erro.`
      : `${selecionadas.length} despesa${selecionadas.length > 1 ? "s" : ""} importada${selecionadas.length > 1 ? "s" : ""}!`;
    Alert.alert("Pronto!", msg, [{ text: "OK", onPress: () => router.back() }]);
  }

  if (processando) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: t.surface }]}>
        <View style={s.centrado}>
          <ActivityIndicator color="#6C63FF" size="large" />
          <Text style={[s.loadingText, { color: t.textMuted }]}>Classificando linhas com IA local…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (etapa === "inicio") {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: t.surface }]}>
        <View style={s.scroll}>
          <View style={[s.handle, { backgroundColor: t.handle }]} />
          <Text style={s.headerEmoji}>📂</Text>
          <Text style={[s.titulo, { color: t.text }]}>Importar extrato</Text>
          <Text style={[s.desc, { color: t.textMuted }]}>
            Importe um CSV exportado do seu banco. O Gastô classifica cada transação automaticamente usando a IA local.
          </Text>

          <View style={[s.formatoCard, { backgroundColor: t.surfaceAlt }]}>
            <Text style={[s.formatoTitulo, { color: t.textSub }]}>Formato esperado</Text>
            <Text style={[s.formatoEx, { color: t.textMuted }]}>data, descrição, valor</Text>
            <Text style={[s.formatoEx, { color: t.textMuted }]}>2024-01-15, Uber, 25,90</Text>
            <Text style={[s.formatoHint, { color: t.textMuted }]}>• Aceita vírgula ou ponto-e-vírgula como separador{"\n"}• Datas: dd/mm/aaaa ou aaaa-mm-dd{"\n"}• Apenas débitos (valores positivos){"\n"}• Compatível com Nubank, Bradesco, C6 e outros</Text>
          </View>

          <Pressable style={s.btnSelecionar} onPress={selecionarArquivo}>
            <Text style={s.btnSelecionarText}>Selecionar arquivo CSV</Text>
          </Pressable>

          <Pressable style={[s.btnFechar, { borderColor: t.border }]} onPress={() => router.back()}>
            <Text style={[s.btnFecharText, { color: t.textSub }]}>Cancelar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const selecionadasQtd = linhas.filter((l) => l.selecionada).length;
  const totalSelecionado = linhas.filter((l) => l.selecionada).reduce((s, l) => s + l.valor, 0);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.surface }]}>
      <View style={s.revisaoHeader}>
        <Text style={[s.titulo, { color: t.text }]}>Revisar importação</Text>
        <Text style={[s.desc, { color: t.textMuted }]}>{selecionadasQtd} de {linhas.length} selecionadas · {fmt(totalSelecionado)}</Text>
        <View style={s.revisaoAcoes}>
          <Pressable style={[s.btnToggleTodas, { borderColor: t.border }]} onPress={toggleTodas}>
            <Text style={[s.btnToggleTodasText, { color: t.textSub }]}>
              {linhas.every((l) => l.selecionada) ? "Desmarcar todas" : "Selecionar todas"}
            </Text>
          </Pressable>
          <Pressable style={s.btnImportar} onPress={salvarSelecionadas} disabled={salvando}>
            <Text style={s.btnImportarText}>{salvando ? "Importando…" : `Importar ${selecionadasQtd}`}</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={linhas}
        keyExtractor={(item) => String(item.idx)}
        contentContainerStyle={s.lista}
        renderItem={({ item }) => {
          const cfg = getCategoria(item.categoria);
          return (
            <Pressable
              style={[s.linhaCard, { backgroundColor: t.bg, opacity: item.selecionada ? 1 : 0.45 }]}
              onPress={() => toggleLinha(item.idx)}
            >
              <View style={[s.checkbox, { borderColor: item.selecionada ? "#6C63FF" : t.border, backgroundColor: item.selecionada ? "#6C63FF" : "transparent" }]}>
                {item.selecionada && <Text style={s.checkmark}>✓</Text>}
              </View>
              <View style={[s.linhaCatIcon, { backgroundColor: cfg.corFundo }]}>
                <Text style={{ fontSize: 15 }}>{cfg.icon}</Text>
              </View>
              <View style={s.linhaInfo}>
                <Text style={[s.linhaDesc, { color: t.text }]} numberOfLines={1}>{item.descricao}</Text>
                <Text style={[s.linhaMeta, { color: t.textMuted }]}>{item.categoria} · {item.data}</Text>
              </View>
              <Text style={[s.linhaValor, { color: t.text }]}>{fmt(item.valor)}</Text>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1, padding: 24 },
  centrado: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  loadingText: { fontSize: 14, marginTop: 8 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 24 },
  headerEmoji: { fontSize: 40, marginBottom: 8 },
  titulo: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
  desc: { fontSize: 14, lineHeight: 20, marginBottom: 20 },

  formatoCard: { borderRadius: 16, padding: 16, marginBottom: 24, gap: 4 },
  formatoTitulo: { fontSize: 13, fontWeight: "700", marginBottom: 6 },
  formatoEx: { fontSize: 12, fontFamily: "monospace" },
  formatoHint: { fontSize: 12, lineHeight: 18, marginTop: 8 },

  btnSelecionar: { backgroundColor: "#6C63FF", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginBottom: 12 },
  btnSelecionarText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnFechar: { borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  btnFecharText: { fontSize: 15, fontWeight: "600" },

  revisaoHeader: { padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  revisaoAcoes: { flexDirection: "row", gap: 10, marginTop: 12 },
  btnToggleTodas: { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  btnToggleTodasText: { fontSize: 13, fontWeight: "600" },
  btnImportar: { flex: 2, backgroundColor: "#6C63FF", borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  btnImportarText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  lista: { padding: 16, gap: 8 },
  linhaCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  checkmark: { color: "#fff", fontSize: 13, fontWeight: "800" },
  linhaCatIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  linhaInfo: { flex: 1 },
  linhaDesc: { fontSize: 14, fontWeight: "600" },
  linhaMeta: { fontSize: 11, marginTop: 2 },
  linhaValor: { fontSize: 14, fontWeight: "700" },
});
