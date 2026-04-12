import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Swipeable } from "react-native-gesture-handler";

import { listarEntradas, totalEntradasDoMes, deletarEntrada } from "../../lib/db";
import { Entrada } from "../../lib/types";
import { getCategoriaEntrada } from "../../constants/incomeCategories";
import { useTheme } from "../../lib/theme";

function EntradaItem({ entrada, onDelete }: { entrada: Entrada; onDelete: () => void }) {
  const router = useRouter();
  const t = useTheme();
  const config = getCategoriaEntrada(entrada.categoria);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const swipeRef = useRef<Swipeable>(null);

  const data = new Date(entrada.data + "T00:00:00");
  const dataFormatada = data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  function handleExcluir() {
    swipeRef.current?.close();
    Alert.alert("Excluir entrada", `Remover "${entrada.descricao}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir", style: "destructive",
        onPress: async () => {
          Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true })
            .start(async () => { await deletarEntrada(entrada.id); onDelete(); });
        },
      },
    ]);
  }

  function renderAcaoDireita() {
    return (
      <Pressable style={s.swipeBtnExcluir} onPress={handleExcluir}>
        <Text style={s.swipeIcon}>🗑️</Text>
        <Text style={s.swipeLabel}>Excluir</Text>
      </Pressable>
    );
  }

  return (
    <Animated.View style={{ opacity: fadeAnim, marginBottom: 10 }}>
      <Swipeable ref={swipeRef} renderRightActions={renderAcaoDireita} friction={2} overshootRight={false}>
        <View style={[s.card, { backgroundColor: t.surface }]}>
          <View style={[s.iconContainer, { backgroundColor: config.corFundo }]}>
            <Text style={s.icon}>{config.icon}</Text>
          </View>
          <View style={s.info}>
            <View style={s.topRow}>
              <Text style={[s.descricao, { color: t.text }]} numberOfLines={1}>{entrada.descricao}</Text>
              {entrada.recorrente === 1 && <Text style={s.recorrenteTag}>🔁</Text>}
            </View>
            <View style={s.metaRow}>
              <View style={[s.catBadge, { backgroundColor: config.corFundo }]}>
                <Text style={[s.catBadgeText, { color: config.cor }]}>{entrada.categoria}</Text>
              </View>
              <Text style={[s.data, { color: t.textMuted }]}>{dataFormatada}</Text>
            </View>
          </View>
          <Text style={s.valor}>
            +{entrada.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </Text>
        </View>
      </Swipeable>
    </Animated.View>
  );
}

export default function IncomeScreen() {
  const router = useRouter();
  const t = useTheme();
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [totalMes, setTotalMes] = useState(0);

  useFocusEffect(useCallback(() => { carregarDados(); }, []));

  async function carregarDados() {
    const agora = new Date();
    const [lista, total] = await Promise.all([
      listarEntradas(50),
      totalEntradasDoMes(agora.getFullYear(), agora.getMonth() + 1),
    ]);
    setEntradas(lista);
    setTotalMes(total);
  }

  const mesAtual = new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" });
  const mesCapitalizado = mesAtual.charAt(0).toUpperCase() + mesAtual.slice(1);

  return (
    <SafeAreaView style={[s.safeArea, { backgroundColor: t.bg }]}>
      <View style={s.header}>
        <Text style={s.headerSub}>gastô · entradas em</Text>
        <Text style={s.headerMes}>{mesCapitalizado}</Text>
        <Text style={s.headerTotal}>
          {totalMes.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </Text>
      </View>

      <FlatList
        data={entradas}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <EntradaItem entrada={item} onDelete={carregarDados} />}
        contentContainerStyle={entradas.length === 0 ? s.listaVazia : s.lista}
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Text style={s.emptyIcon}>💰</Text>
            <Text style={[s.emptyText, { color: t.text }]}>Nenhuma entrada ainda</Text>
            <Text style={[s.emptySubText, { color: t.textMuted }]}>Toque no botão + para adicionar</Text>
          </View>
        }
      />

      <Pressable
        style={({ pressed }) => [s.fab, pressed && s.fabPressed]}
        onPress={() => router.push("/add-entrada")}
      >
        <Text style={s.fabIcon}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { backgroundColor: "#2ECC71", paddingTop: 16, paddingBottom: 28, paddingHorizontal: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 13 },
  headerMes: { color: "#fff", fontSize: 20, fontWeight: "700", marginTop: 2 },
  headerTotal: { color: "#fff", fontSize: 36, fontWeight: "800", marginTop: 8 },
  lista: { padding: 16, paddingBottom: 100 },
  listaVazia: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { alignItems: "center", marginTop: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: "600" },
  emptySubText: { fontSize: 14, marginTop: 6 },
  card: { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, gap: 12 },
  iconContainer: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  icon: { fontSize: 22 },
  info: { flex: 1 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  descricao: { fontSize: 15, fontWeight: "600", flex: 1 },
  recorrenteTag: { fontSize: 12 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  catBadgeText: { fontSize: 11, fontWeight: "600" },
  data: { fontSize: 12 },
  valor: { fontSize: 15, fontWeight: "700", color: "#2ECC71" },
  swipeBtnExcluir: { backgroundColor: "#FF4757", justifyContent: "center", alignItems: "center", width: 72, borderRadius: 16 },
  swipeIcon: { fontSize: 20 },
  swipeLabel: { fontSize: 11, color: "#fff", fontWeight: "600", marginTop: 2 },
  fab: { position: "absolute", bottom: 32, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: "#2ECC71", justifyContent: "center", alignItems: "center", shadowColor: "#2ECC71", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  fabPressed: { opacity: 0.85, transform: [{ scale: 0.95 }] },
  fabIcon: { color: "#fff", fontSize: 32, lineHeight: 36, marginTop: -2 },
});
