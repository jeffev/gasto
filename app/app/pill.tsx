import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../lib/theme";
import { fetchCourses, getPilulaById, Pilula, Trilha } from "../lib/courses";
import { marcarPilulaLida, listarPilulasLidas } from "../lib/db";

export default function PillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTheme();

  const [pilula, setPilula] = useState<Pilula | null>(null);
  const [trilha, setTrilha] = useState<Trilha | null>(null);
  const [lida, setLida] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([fetchCourses(), listarPilulasLidas()]).then(([data, lidas]) => {
      const found = getPilulaById(data, id);
      if (found) {
        setPilula(found.pilula);
        setTrilha(found.trilha);
        setLida(lidas.has(id));
      }
      setCarregando(false);
    }).catch(() => setCarregando(false));
  }, [id]);

  async function handleMarcarLida() {
    if (!pilula || salvando) return;
    setSalvando(true);
    await marcarPilulaLida(pilula.id);
    setLida(true);
    setSalvando(false);
  }

  if (carregando) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: t.surface }]}>
        <View style={s.centrado}>
          <ActivityIndicator color="#6C63FF" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!pilula || !trilha) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: t.surface }]}>
        <View style={s.centrado}>
          <Text style={[s.erroText, { color: t.textMuted }]}>Conteúdo não encontrado.</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: "#6C63FF", fontSize: 15, marginTop: 8 }}>Voltar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.surface }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={[s.handle, { backgroundColor: t.handle }]} />

        {/* Header */}
        <View style={[s.trilhaBadge, { backgroundColor: trilha.cor + "22" }]}>
          <Text style={[s.trilhaBadgeText, { color: trilha.cor }]}>{trilha.emoji} {trilha.titulo}</Text>
        </View>

        <Text style={s.emoji}>{pilula.emoji}</Text>
        <Text style={[s.titulo, { color: t.text }]}>{pilula.titulo}</Text>
        <Text style={[s.meta, { color: t.textMuted }]}>{pilula.nivel} · {pilula.tempo} de leitura</Text>

        <View style={[s.divider, { backgroundColor: t.divider }]} />

        {/* Conteúdo */}
        {pilula.conteudo.map((paragrafo, i) => (
          <Text key={i} style={[s.paragrafo, { color: t.text }]}>{paragrafo}</Text>
        ))}

        {/* Dica do app */}
        {pilula.dica_app ? (
          <View style={[s.dicaCard, { backgroundColor: "#6C63FF15", borderColor: "#6C63FF44" }]}>
            <Text style={[s.dicaTitulo, { color: "#6C63FF" }]}>💡 Dica no Gastô</Text>
            <Text style={[s.dicaTexto, { color: t.textSub }]}>{pilula.dica_app}</Text>
          </View>
        ) : null}

        {/* Link externo */}
        {pilula.link_externo ? (
          <Pressable
            style={[s.linkBtn, { borderColor: trilha.cor }]}
            onPress={() => Linking.openURL(pilula.link_externo)}
          >
            <Text style={[s.linkBtnText, { color: trilha.cor }]}>🔗 Saiba mais</Text>
          </Pressable>
        ) : null}

        {/* Marcar como lido */}
        {lida ? (
          <View style={[s.lidaCard, { backgroundColor: "#2ECC7115" }]}>
            <Text style={[s.lidaText, { color: "#2ECC71" }]}>✅ Você já concluiu esta pílula!</Text>
          </View>
        ) : (
          <Pressable
            style={[s.btnLida, { backgroundColor: trilha.cor }]}
            onPress={handleMarcarLida}
            disabled={salvando}
          >
            <Text style={s.btnLidaText}>{salvando ? "Salvando..." : "Marcar como concluída"}</Text>
          </Pressable>
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
  centrado: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  erroText: { fontSize: 15 },

  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 20 },

  trilhaBadge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 16 },
  trilhaBadgeText: { fontSize: 13, fontWeight: "700" },

  emoji: { fontSize: 40, marginBottom: 8 },
  titulo: { fontSize: 22, fontWeight: "800", lineHeight: 30 },
  meta: { fontSize: 13, marginTop: 6, marginBottom: 16 },

  divider: { height: 1, marginBottom: 20 },

  paragrafo: { fontSize: 16, lineHeight: 26, marginBottom: 18 },

  dicaCard: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 20 },
  dicaTitulo: { fontSize: 14, fontWeight: "700", marginBottom: 6 },
  dicaTexto: { fontSize: 14, lineHeight: 22 },

  linkBtn: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, alignItems: "center", marginBottom: 16 },
  linkBtnText: { fontSize: 15, fontWeight: "700" },

  lidaCard: { borderRadius: 12, padding: 14, alignItems: "center", marginBottom: 16 },
  lidaText: { fontSize: 15, fontWeight: "700" },

  btnLida: { borderRadius: 14, paddingVertical: 16, alignItems: "center", marginBottom: 16 },
  btnLidaText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  btnFechar: { borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  btnFecharText: { fontSize: 15, fontWeight: "600" },
});
