import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../lib/theme";
import { useAppConfig } from "../lib/AppConfigContext";
import {
  listarDesafios, inserirDesafio, aceitarDesafio,
  verificarConclusaoDesafio, gastoMedioSemanalPorCategoria, Desafio,
} from "../lib/db";

const REDUCOES = [0.15, 0.20, 0.25]; // 15%, 20%, 25%

function semanaAtual(): { inicio: string; fim: string } {
  const hoje = new Date();
  const dow = hoje.getDay(); // 0=Dom
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - dow);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { inicio: fmt(inicio), fim: fmt(fim) };
}

function formatarSemana(inicio: string, fim: string): string {
  const f = (s: string) => {
    const d = new Date(s + "T00:00:00");
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };
  return `${f(inicio)} – ${f(fim)}`;
}

export default function ChallengeScreen() {
  const router = useRouter();
  const t = useTheme();
  const { fmt } = useAppConfig();
  const [desafios, setDesafios] = useState<Desafio[]>([]);
  const [sugestoes, setSugestoes] = useState<Desafio[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setCarregando(true);
    const [lista, medias] = await Promise.all([listarDesafios(), gastoMedioSemanalPorCategoria()]);
    setDesafios(lista);

    // Gera sugestões a partir das categorias com maior gasto médio semanal
    const { inicio, fim } = semanaAtual();
    const novas: Desafio[] = [];
    for (let i = 0; i < Math.min(3, medias.length); i++) {
      const { categoria, mediaGasto } = medias[i];
      const reducao = REDUCOES[i % REDUCOES.length];
      const meta = Math.round(mediaGasto * (1 - reducao));
      const jaExiste = lista.some((d) => d.categoria === categoria && d.inicio === inicio);
      if (!jaExiste && meta > 0) {
        novas.push({
          id: -(i + 1), // id temporário negativo
          categoria,
          descricao: `Reduza ${categoria} em ${Math.round(reducao * 100)}% esta semana`,
          meta_valor: meta,
          inicio,
          fim,
          aceito: 0,
          concluido: 0,
        });
      }
    }
    setSugestoes(novas);
    setCarregando(false);
  }

  async function handleAceitar(sug: Desafio) {
    const id = await inserirDesafio({
      categoria: sug.categoria,
      descricao: sug.descricao,
      meta_valor: sug.meta_valor,
      inicio: sug.inicio,
      fim: sug.fim,
      aceito: 1,
      concluido: 0,
    });
    setSugestoes((prev) => prev.filter((s) => s.categoria !== sug.categoria));
    const novoDesafio = { ...sug, id, aceito: 1 };
    setDesafios((prev) => [novoDesafio, ...prev]);
  }

  async function handleVerificar(d: Desafio) {
    const concluido = await verificarConclusaoDesafio(d.id, d.inicio, d.fim, d.categoria, d.meta_valor);
    if (concluido) {
      Alert.alert("🎉 Desafio concluído!", `Você manteve os gastos de ${d.categoria} abaixo de ${fmt(d.meta_valor)} esta semana!`);
    } else {
      Alert.alert("⏳ Ainda em andamento", `Continue! O desafio termina em ${formatarSemana(d.inicio, d.fim)}.`);
    }
    setDesafios(await listarDesafios());
  }

  if (carregando) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: t.surface }]}>
        <View style={s.centrado}><ActivityIndicator color="#6C63FF" size="large" /></View>
      </SafeAreaView>
    );
  }

  const ativos = desafios.filter((d) => d.aceito === 1 && d.concluido === 0);
  const concluidos = desafios.filter((d) => d.concluido === 1);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.surface }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={[s.handle, { backgroundColor: t.handle }]} />

        <View style={s.headerRow}>
          <Text style={s.headerEmoji}>🏆</Text>
          <View>
            <Text style={[s.titulo, { color: t.text }]}>Modo Desafio</Text>
            <Text style={[s.sub, { color: t.textMuted }]}>Desafios semanais baseados nos seus gastos</Text>
          </View>
        </View>

        {/* Sugestões da semana */}
        {sugestoes.length > 0 && (
          <View style={s.secao}>
            <Text style={[s.secaoTitulo, { color: t.textSub }]}>SUGESTÕES PARA ESTA SEMANA</Text>
            <Text style={[s.semanaLabel, { color: t.textMuted }]}>{formatarSemana(sugestoes[0].inicio, sugestoes[0].fim)}</Text>
            {sugestoes.map((sug) => (
              <View key={sug.categoria} style={[s.card, { backgroundColor: t.bg }]}>
                <View style={s.cardTop}>
                  <View style={s.cardInfo}>
                    <Text style={[s.cardCategoria, { color: "#6C63FF" }]}>{sug.categoria}</Text>
                    <Text style={[s.cardDesc, { color: t.text }]}>{sug.descricao}</Text>
                    <Text style={[s.cardMeta, { color: t.textMuted }]}>Meta: até {fmt(sug.meta_valor)}</Text>
                  </View>
                  <Pressable style={s.btnAceitar} onPress={() => handleAceitar(sug)}>
                    <Text style={s.btnAceitarText}>Aceitar</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {sugestoes.length === 0 && ativos.length === 0 && concluidos.length === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyEmoji}>📊</Text>
            <Text style={[s.emptyText, { color: t.textMuted }]}>
              Registre pelo menos 4 semanas de despesas para gerar desafios personalizados.
            </Text>
          </View>
        )}

        {/* Desafios ativos */}
        {ativos.length > 0 && (
          <View style={s.secao}>
            <Text style={[s.secaoTitulo, { color: t.textSub }]}>EM ANDAMENTO</Text>
            {ativos.map((d) => (
              <View key={d.id} style={[s.card, { backgroundColor: t.bg, borderLeftColor: "#F39C12", borderLeftWidth: 3 }]}>
                <Text style={[s.cardCategoria, { color: "#F39C12" }]}>{d.categoria}</Text>
                <Text style={[s.cardDesc, { color: t.text }]}>{d.descricao}</Text>
                <Text style={[s.cardMeta, { color: t.textMuted }]}>
                  Meta: até {fmt(d.meta_valor)} · {formatarSemana(d.inicio, d.fim)}
                </Text>
                <Pressable style={[s.btnVerificar, { borderColor: "#F39C12" }]} onPress={() => handleVerificar(d)}>
                  <Text style={[s.btnVerificarText, { color: "#F39C12" }]}>Verificar progresso</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Desafios concluídos */}
        {concluidos.length > 0 && (
          <View style={s.secao}>
            <Text style={[s.secaoTitulo, { color: t.textSub }]}>CONCLUÍDOS</Text>
            {concluidos.map((d) => (
              <View key={d.id} style={[s.card, { backgroundColor: t.bg, borderLeftColor: "#2ECC71", borderLeftWidth: 3 }]}>
                <Text style={[s.cardCategoria, { color: "#2ECC71" }]}>✅ {d.categoria}</Text>
                <Text style={[s.cardDesc, { color: t.text }]}>{d.descricao}</Text>
                <Text style={[s.cardMeta, { color: t.textMuted }]}>{formatarSemana(d.inicio, d.fim)}</Text>
              </View>
            ))}
          </View>
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
  centrado: { flex: 1, justifyContent: "center", alignItems: "center" },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 20 },

  headerRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 24 },
  headerEmoji: { fontSize: 36 },
  titulo: { fontSize: 22, fontWeight: "800" },
  sub: { fontSize: 13, marginTop: 3 },

  secao: { marginBottom: 24 },
  secaoTitulo: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: 4 },
  semanaLabel: { fontSize: 12, marginBottom: 12 },

  card: { borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardInfo: { flex: 1, marginRight: 12 },
  cardCategoria: { fontSize: 12, fontWeight: "700", marginBottom: 4 },
  cardDesc: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  cardMeta: { fontSize: 12 },
  btnAceitar: { backgroundColor: "#6C63FF", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  btnAceitarText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  btnVerificar: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 8, alignItems: "center", marginTop: 10 },
  btnVerificarText: { fontSize: 13, fontWeight: "700" },

  emptyState: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },

  btnFechar: { borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  btnFecharText: { fontSize: 15, fontWeight: "600" },
});
