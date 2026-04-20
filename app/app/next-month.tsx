import React, { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { listarRecorrentesParaProximoMes } from "../lib/db";
import { Despesa, Entrada } from "../lib/types";
import { getCategoria } from "../constants/categories";
import { getCategoriaEntrada } from "../constants/incomeCategories";
import { useTheme } from "../lib/theme";
import { useAppConfig } from "../lib/AppConfigContext";

export default function NextMonthScreen() {
  const router = useRouter();
  const t = useTheme();
  const { fmt } = useAppConfig();

  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [entradas, setEntradas] = useState<Entrada[]>([]);

  useEffect(() => {
    listarRecorrentesParaProximoMes().then(({ despesas, entradas }) => {
      setDespesas(despesas);
      setEntradas(entradas);
    });
  }, []);

  const proximoMes = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toLocaleString("pt-BR", { month: "long", year: "numeric" });
  })();
  const mesCapitalizado = proximoMes.charAt(0).toUpperCase() + proximoMes.slice(1);

  const totalDespesas = despesas.reduce((s, d) => s + d.valor, 0);
  const totalEntradas = entradas.reduce((s, e) => s + e.valor, 0);
  const saldo = totalEntradas - totalDespesas;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]}>
      <View style={[s.header, { backgroundColor: t.surface, borderBottomColor: t.divider }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={[s.backText, { color: t.textSub }]}>← Voltar</Text>
        </Pressable>
        <View>
          <Text style={[s.headerTitulo, { color: t.text }]}>Próximo mês</Text>
          <Text style={[s.headerSub, { color: t.textMuted }]}>{mesCapitalizado}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Resumo */}
        <View style={[s.resumo, { backgroundColor: "#6C63FF" }]}>
          <View style={s.resumoItem}>
            <Text style={s.resumoLabel}>Entradas</Text>
            <Text style={s.resumoValorPos}>{fmt(totalEntradas)}</Text>
          </View>
          <View style={s.resumoDivisor} />
          <View style={s.resumoItem}>
            <Text style={s.resumoLabel}>Despesas</Text>
            <Text style={s.resumoValorNeg}>{fmt(totalDespesas)}</Text>
          </View>
          <View style={s.resumoDivisor} />
          <View style={s.resumoItem}>
            <Text style={s.resumoLabel}>Saldo</Text>
            <Text style={[s.resumoValorSaldo, { color: saldo >= 0 ? "#7EFFC5" : "#FFB3B3" }]}>{fmt(saldo)}</Text>
          </View>
        </View>

        {entradas.length > 0 && (
          <>
            <Text style={[s.secaoTitulo, { color: t.textSub }]}>💰 Entradas recorrentes</Text>
            {entradas.map((e) => {
              const config = getCategoriaEntrada(e.categoria);
              return (
                <View key={e.id} style={[s.item, { backgroundColor: t.surface }]}>
                  <View style={[s.itemIcon, { backgroundColor: config.corFundo }]}>
                    <Text style={s.itemIconText}>{config.icon}</Text>
                  </View>
                  <View style={s.itemInfo}>
                    <Text style={[s.itemDesc, { color: t.text }]} numberOfLines={1}>{e.descricao}</Text>
                    <Text style={[s.itemCat, { color: t.textMuted }]}>{e.categoria}</Text>
                  </View>
                  <Text style={[s.itemValor, { color: "#2ECC71" }]}>+{fmt(e.valor)}</Text>
                </View>
              );
            })}
          </>
        )}

        {despesas.length > 0 && (
          <>
            <Text style={[s.secaoTitulo, { color: t.textSub }]}>💸 Despesas recorrentes</Text>
            {despesas.map((d) => {
              const config = getCategoria(d.categoria);
              return (
                <View key={d.id} style={[s.item, { backgroundColor: t.surface }]}>
                  <View style={[s.itemIcon, { backgroundColor: config.corFundo }]}>
                    <Text style={s.itemIconText}>{config.icon}</Text>
                  </View>
                  <View style={s.itemInfo}>
                    <Text style={[s.itemDesc, { color: t.text }]} numberOfLines={1}>{d.descricao}</Text>
                    <Text style={[s.itemCat, { color: t.textMuted }]}>{d.categoria}</Text>
                  </View>
                  <Text style={[s.itemValor, { color: t.text }]}>{fmt(d.valor)}</Text>
                </View>
              );
            })}
          </>
        )}

        {despesas.length === 0 && entradas.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🔁</Text>
            <Text style={[s.emptyText, { color: t.text }]}>Nenhum lançamento recorrente</Text>
            <Text style={[s.emptySub, { color: t.textMuted }]}>Marque despesas ou entradas como recorrentes para vê-las aqui</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  backText: { fontSize: 15, fontWeight: "600" },
  headerTitulo: { fontSize: 18, fontWeight: "800" },
  headerSub: { fontSize: 13, marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },
  resumo: { flexDirection: "row", borderRadius: 18, padding: 20, marginBottom: 24, gap: 4 },
  resumoItem: { flex: 1, alignItems: "center" },
  resumoLabel: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "600", marginBottom: 6 },
  resumoValorPos: { color: "#7EFFC5", fontSize: 15, fontWeight: "800" },
  resumoValorNeg: { color: "#FFB3B3", fontSize: 15, fontWeight: "800" },
  resumoValorSaldo: { fontSize: 15, fontWeight: "800" },
  resumoDivisor: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  secaoTitulo: { fontSize: 13, fontWeight: "700", marginBottom: 10, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  item: { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 14, marginBottom: 8, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  itemIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  itemIconText: { fontSize: 20 },
  itemInfo: { flex: 1 },
  itemDesc: { fontSize: 14, fontWeight: "600" },
  itemCat: { fontSize: 12, marginTop: 2 },
  itemValor: { fontSize: 14, fontWeight: "700" },
  empty: { alignItems: "center", marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 17, fontWeight: "600", marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
