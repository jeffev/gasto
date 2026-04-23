import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import { fetchIndicadores, Indicador } from "../../lib/bcb";
import { fetchFeed, NewsItem, RSS_SOURCES, tempoRelativo } from "../../lib/rss";
import { useTheme } from "../../lib/theme";

const CACHE_TTL = 5 * 60 * 1000;
let cacheIndicadores: { data: Indicador[]; ts: number } | null = null;
let cacheNoticias: { data: NewsItem[]; ts: number } | null = null;

export default function NewsScreen() {
  const t = useTheme();
  const [indicadores, setIndicadores] = useState<Indicador[]>([]);
  const [noticias, setNoticias] = useState<NewsItem[]>([]);
  const [filtro, setFiltro] = useState<string | null>(null);
  const [carregandoInd, setCarregandoInd] = useState(false);
  const [carregandoNews, setCarregandoNews] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const fetchedOnce = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!fetchedOnce.current) {
        fetchedOnce.current = true;
        carregarTudo(false);
      }
    }, [])
  );

  async function carregarTudo(forcar = false) {
    await Promise.all([carregarIndicadores(forcar), carregarNoticias(forcar)]);
  }

  async function carregarIndicadores(forcar = false) {
    if (!forcar && cacheIndicadores && Date.now() - cacheIndicadores.ts < CACHE_TTL) {
      setIndicadores(cacheIndicadores.data);
      return;
    }
    setCarregandoInd(true);
    try {
      const data = await fetchIndicadores();
      cacheIndicadores = { data, ts: Date.now() };
      setIndicadores(data);
    } catch {
      /* mantém estado anterior */
    } finally {
      setCarregandoInd(false);
    }
  }

  async function carregarNoticias(forcar = false) {
    if (!forcar && cacheNoticias && Date.now() - cacheNoticias.ts < CACHE_TTL) {
      setNoticias(cacheNoticias.data);
      return;
    }
    setCarregandoNews(true);
    try {
      const results = await Promise.allSettled(RSS_SOURCES.map((s) => fetchFeed(s)));
      const todas: NewsItem[] = [];
      results.forEach((r) => {
        if (r.status === "fulfilled") todas.push(...r.value);
      });
      todas.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      cacheNoticias = { data: todas, ts: Date.now() };
      setNoticias(todas);
    } catch {
      /* mantém estado anterior */
    } finally {
      setCarregandoNews(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await carregarTudo(true);
    setRefreshing(false);
  }

  const noticiasFiltradas = filtro ? noticias.filter((n) => n.source === filtro) : noticias;

  function renderIndicador({ item }: { item: Indicador }) {
    return (
      <View style={[s.indCard, { backgroundColor: t.surface }]}>
        <Text style={s.indEmoji}>{item.emoji}</Text>
        <Text style={[s.indLabel, { color: t.textMuted }]}>{item.label}</Text>
        <Text style={[s.indValor, { color: t.text }]}>{item.valor}</Text>
        {item.detalhe ? <Text style={[s.indDetalhe, { color: t.textMuted }]}>{item.detalhe}</Text> : null}
      </View>
    );
  }

  function renderNoticia({ item }: { item: NewsItem }) {
    return (
      <Pressable
        style={({ pressed }) => [s.newsCard, { backgroundColor: t.surface }, pressed && { opacity: 0.85 }]}
        onPress={() => item.link && Linking.openURL(item.link)}
      >
        <View style={[s.newsSourceBar, { backgroundColor: item.sourceColor }]} />
        <View style={s.newsContent}>
          <Text style={[s.newsTitle, { color: t.text }]} numberOfLines={2}>{item.title}</Text>
          {item.description ? (
            <Text style={[s.newsDesc, { color: t.textSub }]} numberOfLines={2}>{item.description}</Text>
          ) : null}
          <View style={s.newsMeta}>
            <Text style={[s.newsSource, { color: item.sourceColor }]}>{item.source}</Text>
            {item.pubDate ? (
              <Text style={[s.newsTime, { color: t.textMuted }]}>{tempoRelativo(item.pubDate)}</Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  }

  const ListHeader = (
    <>
      {/* Indicadores */}
      <View style={s.indSection}>
        <Text style={[s.secaoTitulo, { color: t.textSub }]}>INDICADORES DO DIA</Text>
        {carregandoInd ? (
          <ActivityIndicator color="#0288D1" style={{ marginVertical: 16 }} />
        ) : (
          <FlatList
            data={indicadores}
            horizontal
            keyExtractor={(i) => String(i.serie)}
            renderItem={renderIndicador}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.indList}
          />
        )}
      </View>

      {/* Filtros de fonte */}
      <View style={s.filtroRow}>
        <Pressable
          style={[s.filtroBtn, !filtro && s.filtroBtnAtivo, { borderColor: !filtro ? "#0288D1" : t.border }]}
          onPress={() => setFiltro(null)}
        >
          <Text style={[s.filtroBtnText, { color: !filtro ? "#0288D1" : t.textSub }]}>Todas</Text>
        </Pressable>
        {RSS_SOURCES.map((src) => {
          const ativo = filtro === src.label;
          return (
            <Pressable
              key={src.key}
              style={[s.filtroBtn, ativo && s.filtroBtnAtivo, { borderColor: ativo ? src.color : t.border }]}
              onPress={() => setFiltro(ativo ? null : src.label)}
            >
              <Text style={[s.filtroBtnText, { color: ativo ? src.color : t.textSub }]}>{src.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {carregandoNews && (
        <ActivityIndicator color="#0288D1" style={{ marginTop: 24 }} />
      )}
    </>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]}>
      {/* Cabeçalho */}
      <View style={s.header}>
        <Text style={s.headerSub}>gastô · mercado</Text>
        <Text style={s.headerTitulo}>Notícias & Indicadores</Text>
      </View>

      <FlatList
        data={noticiasFiltradas}
        keyExtractor={(item) => item.id}
        renderItem={renderNoticia}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={s.lista}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0288D1"]} />}
        ListEmptyComponent={
          !carregandoNews ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>📰</Text>
              <Text style={[s.emptyText, { color: t.textMuted }]}>Nenhuma notícia disponível</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { backgroundColor: "#0288D1", paddingTop: 16, paddingBottom: 24, paddingHorizontal: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 13 },
  headerTitulo: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 4 },

  lista: { paddingBottom: 100 },

  indSection: { paddingTop: 20, paddingHorizontal: 16 },
  secaoTitulo: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: 12 },
  indList: { gap: 10, paddingRight: 16 },
  indCard: { borderRadius: 16, padding: 16, alignItems: "center", minWidth: 100, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  indEmoji: { fontSize: 22, marginBottom: 6 },
  indLabel: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
  indValor: { fontSize: 15, fontWeight: "800" },
  indDetalhe: { fontSize: 10, marginTop: 2 },

  filtroRow: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 14, gap: 8, flexWrap: "wrap" },
  filtroBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  filtroBtnAtivo: {},
  filtroBtnText: { fontSize: 13, fontWeight: "600" },

  newsCard: { flexDirection: "row", marginHorizontal: 16, marginBottom: 10, borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  newsSourceBar: { width: 4 },
  newsContent: { flex: 1, padding: 14 },
  newsTitle: { fontSize: 15, fontWeight: "700", lineHeight: 21, marginBottom: 6 },
  newsDesc: { fontSize: 13, lineHeight: 19, marginBottom: 8 },
  newsMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  newsSource: { fontSize: 12, fontWeight: "700" },
  newsTime: { fontSize: 12 },

  empty: { alignItems: "center", marginTop: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15 },
});
