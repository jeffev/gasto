import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../lib/theme";
import { fetchCourses, CoursesData, Trilha } from "../../lib/courses";
import { listarPilulasLidas } from "../../lib/db";

export default function LearnScreen() {
  const t = useTheme();
  const router = useRouter();
  const [data, setData] = useState<CoursesData | null>(null);
  const [lidas, setLidas] = useState<Set<string>>(new Set());
  const [trilhaAtiva, setTrilhaAtiva] = useState<string | null>(null);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    setErro(false);
    try {
      const [courses, lidasDb] = await Promise.all([fetchCourses(), listarPilulasLidas()]);
      setData(courses);
      setLidas(lidasDb);
      if (!trilhaAtiva && courses.trilhas.length > 0) {
        setTrilhaAtiva(courses.trilhas[0].id);
      }
    } catch {
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  useFocusEffect(
    useCallback(() => {
      listarPilulasLidas().then(setLidas);
    }, [])
  );

  const trilhaObj = data?.trilhas.find((t) => t.id === trilhaAtiva) ?? null;

  function progresso(trilha: Trilha): number {
    if (trilha.pilulas.length === 0) return 0;
    const feitas = trilha.pilulas.filter((p) => lidas.has(p.id)).length;
    return feitas / trilha.pilulas.length;
  }

  if (carregando) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]}>
        <View style={s.centrado}>
          <ActivityIndicator color="#6C63FF" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (erro || !data) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]}>
        <View style={s.centrado}>
          <Text style={s.erroEmoji}>😕</Text>
          <Text style={[s.erroText, { color: t.textMuted }]}>Não foi possível carregar os conteúdos.</Text>
          <Pressable style={[s.btnRetry, { borderColor: t.border }]} onPress={carregar}>
            <Text style={[s.btnRetryText, { color: t.textSub }]}>Tentar novamente</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]}>
      <View style={[s.header, { borderBottomColor: t.divider }]}>
        <Text style={[s.titulo, { color: t.text }]}>Aprender</Text>
        <Text style={[s.subtitulo, { color: t.textMuted }]}>Pílulas de educação financeira</Text>
      </View>

      {/* Trilha selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.trilhasRow}
      >
        {data.trilhas.map((trilha) => {
          const ativo = trilha.id === trilhaAtiva;
          const pct = progresso(trilha);
          return (
            <Pressable
              key={trilha.id}
              style={[s.trilhaCard, { backgroundColor: ativo ? trilha.cor : t.surface, borderColor: ativo ? trilha.cor : t.border }]}
              onPress={() => setTrilhaAtiva(trilha.id)}
            >
              <Text style={s.trilhaEmoji}>{trilha.emoji}</Text>
              <Text style={[s.trilhaTitulo, { color: ativo ? "#fff" : t.text }]} numberOfLines={2}>
                {trilha.titulo}
              </Text>
              {pct > 0 && (
                <View style={[s.progTrack, { backgroundColor: ativo ? "rgba(255,255,255,0.3)" : t.border }]}>
                  <View style={[s.progFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: ativo ? "#fff" : trilha.cor }]} />
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Pílulas list */}
      {trilhaObj && (
        <FlatList
          data={trilhaObj.pilulas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.lista}
          ListHeaderComponent={
            <View style={[s.trilhaInfo, { backgroundColor: t.surface }]}>
              <Text style={[s.trilhaInfoDescricao, { color: t.textSub }]}>{trilhaObj.descricao}</Text>
              <Text style={[s.trilhaInfoProgress, { color: trilhaObj.cor }]}>
                {trilhaObj.pilulas.filter((p) => lidas.has(p.id)).length}/{trilhaObj.pilulas.length} concluídas
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const feita = lidas.has(item.id);
            return (
              <Pressable
                style={[s.pilulaCard, { backgroundColor: t.surface, borderLeftColor: feita ? "#2ECC71" : trilhaObj.cor }]}
                onPress={() => router.push({ pathname: "/pill", params: { id: item.id } })}
              >
                <View style={s.pilulaLeft}>
                  <Text style={s.pilulaEmoji}>{item.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.pilulaTitulo, { color: t.text }]}>{item.titulo}</Text>
                    <Text style={[s.pilulaMeta, { color: t.textMuted }]}>
                      {item.nivel} · {item.tempo}
                    </Text>
                  </View>
                </View>
                <Text style={[s.pilulaStatus, { color: feita ? "#2ECC71" : t.textMuted }]}>
                  {feita ? "✅" : "▶"}
                </Text>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  centrado: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  erroEmoji: { fontSize: 40 },
  erroText: { fontSize: 15, textAlign: "center" },
  btnRetry: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10 },
  btnRetryText: { fontSize: 14, fontWeight: "600" },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1 },
  titulo: { fontSize: 24, fontWeight: "800" },
  subtitulo: { fontSize: 13, marginTop: 2 },

  trilhasRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  trilhaCard: { width: 140, borderRadius: 16, borderWidth: 1.5, padding: 14, gap: 8 },
  trilhaEmoji: { fontSize: 26 },
  trilhaTitulo: { fontSize: 13, fontWeight: "700", lineHeight: 18 },
  progTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  progFill: { height: 4, borderRadius: 2 },

  lista: { padding: 16, gap: 10 },
  trilhaInfo: { borderRadius: 14, padding: 14, marginBottom: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  trilhaInfoDescricao: { fontSize: 13, flex: 1, lineHeight: 18, marginRight: 8 },
  trilhaInfoProgress: { fontSize: 13, fontWeight: "700" },

  pilulaCard: { borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderLeftWidth: 4 },
  pilulaLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  pilulaEmoji: { fontSize: 24 },
  pilulaTitulo: { fontSize: 15, fontWeight: "600" },
  pilulaMeta: { fontSize: 12, marginTop: 2 },
  pilulaStatus: { fontSize: 18, marginLeft: 8 },
});
