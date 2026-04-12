import React, { useRef } from "react";
import {
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { Despesa } from "../lib/types";
import { getCategoria } from "../constants/categories";
import { deletarDespesa } from "../lib/db";
import { useTheme } from "../lib/theme";

interface Props {
  despesa: Despesa;
  onDelete: () => void;
}

export default function ExpenseItem({ despesa, onDelete }: Props) {
  const router = useRouter();
  const t = useTheme();
  const config = getCategoria(despesa.categoria);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const swipeRef = useRef<Swipeable>(null);

  const data = new Date(despesa.data + "T00:00:00");
  const dataFormatada = data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  function handleEditar() {
    swipeRef.current?.close();
    router.push({
      pathname: "/edit",
      params: {
        id: String(despesa.id),
        descricao: despesa.descricao,
        valor: String(despesa.valor),
        categoria: despesa.categoria,
        data: despesa.data,
        recorrente: String(despesa.recorrente ?? 0),
      },
    });
  }

  function handleExcluir() {
    swipeRef.current?.close();
    Alert.alert("Excluir despesa", `Remover "${despesa.descricao}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true })
            .start(async () => { await deletarDespesa(despesa.id); onDelete(); });
        },
      },
    ]);
  }

  function renderAcaoDireita() {
    return (
      <View style={s.swipeActions}>
        <Pressable style={s.swipeBtnEditar} onPress={handleEditar}>
          <Text style={s.swipeIcon}>✏️</Text>
          <Text style={s.swipeLabel}>Editar</Text>
        </Pressable>
        <Pressable style={s.swipeBtnExcluir} onPress={handleExcluir}>
          <Text style={s.swipeIcon}>🗑️</Text>
          <Text style={s.swipeLabel}>Excluir</Text>
        </Pressable>
      </View>
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
              <Text style={[s.descricao, { color: t.text }]} numberOfLines={1}>{despesa.descricao}</Text>
              {despesa.recorrente === 1 && <Text style={s.recorrenteTag}>🔁</Text>}
            </View>
            <View style={s.metaRow}>
              <View style={[s.catBadge, { backgroundColor: config.corFundo }]}>
                <Text style={[s.catBadgeText, { color: config.cor }]}>{despesa.categoria}</Text>
              </View>
              <Text style={[s.data, { color: t.textMuted }]}>{dataFormatada}</Text>
            </View>
          </View>
          <Text style={[s.valor, { color: t.text }]}>
            {despesa.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </Text>
        </View>
      </Swipeable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
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
  valor: { fontSize: 15, fontWeight: "700" },
  swipeActions: { flexDirection: "row" },
  swipeBtnEditar: { backgroundColor: "#6C63FF", justifyContent: "center", alignItems: "center", width: 72, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  swipeBtnExcluir: { backgroundColor: "#FF4757", justifyContent: "center", alignItems: "center", width: 72, borderTopRightRadius: 16, borderBottomRightRadius: 16 },
  swipeIcon: { fontSize: 20 },
  swipeLabel: { fontSize: 11, color: "#fff", fontWeight: "600", marginTop: 2 },
});
