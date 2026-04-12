import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useAudioRecorder,
  requestRecordingPermissionsAsync,
  RecordingPresets,
  setAudioModeAsync,
} from "expo-audio";

import {
  listarDespesas,
  totalDoMes,
  totalEntradasDoMes,
  gerarRecorrentesDoMes,
  gerarEntradasRecorrentesDoMes,
} from "../../lib/db";
import { parseTexto, transcreverAudio } from "../../lib/api";
import { WhisperStatus } from "../../lib/whisper";
import { Despesa } from "../../lib/types";
import { useTheme } from "../../lib/theme";
import ExpenseItem from "../../components/ExpenseItem";

export default function HomeScreen() {
  const router = useRouter();
  const t = useTheme();

  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [totalMes, setTotalMes] = useState(0);
  const [totalEntradas, setTotalEntradas] = useState(0);
  const [carregando, setCarregando] = useState(false);

  const [modalVisivel, setModalVisivel] = useState(false);
  const [textoInput, setTextoInput] = useState("");
  const [modoTexto, setModoTexto] = useState(false);

  const [gravando, setGravando] = useState(false);
  const [whisperStatus, setWhisperStatus] = useState<WhisperStatus>({ tipo: "idle" });
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const flatListRef = useRef<FlatList>(null);
  const hasFocusedBefore = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const scrollToTop = hasFocusedBefore.current;
      hasFocusedBefore.current = true;
      carregarDados(scrollToTop);
    }, [])
  );

  async function carregarDados(scrollToTop = false) {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = agora.getMonth() + 1;

    const [gDespesas, gEntradas] = await Promise.all([
      gerarRecorrentesDoMes(ano, mes),
      gerarEntradasRecorrentesDoMes(ano, mes),
    ]);

    const [lista, total, totalE] = await Promise.all([
      listarDespesas(50),
      totalDoMes(ano, mes),
      totalEntradasDoMes(ano, mes),
    ]);

    setDespesas(lista);
    setTotalMes(total);
    setTotalEntradas(totalE);

    if (scrollToTop && lista.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 150);
    }

    const totalGeradas = gDespesas + gEntradas;
    if (totalGeradas > 0) {
      Alert.alert(
        "🔁 Recorrentes",
        `${totalGeradas} lançamento${totalGeradas > 1 ? "s" : ""} recorrente${totalGeradas > 1 ? "s" : ""} adicionado${totalGeradas > 1 ? "s" : ""} para este mês.`
      );
    }
  }

  useEffect(() => {
    if (gravando) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [gravando]);

  async function processarTexto() {
    const texto = textoInput.trim();
    if (!texto) return;
    setCarregando(true);
    setModalVisivel(false);
    try {
      const resultado = await parseTexto(texto);
      setTextoInput("");
      router.push({
        pathname: "/confirm",
        params: {
          descricao: resultado.descricao,
          valor: resultado.valor?.toString() ?? "",
          categoria: resultado.categoria,
          input_original: texto,
          categoria_sugerida: resultado.categoria,
        },
      });
    } catch (e: any) {
      Alert.alert("Erro", e.message ?? "Não foi possível processar a despesa.");
    } finally {
      setCarregando(false);
    }
  }

  async function iniciarGravacao() {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert("Permissão necessária", "Ative o microfone nas configurações.");
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setGravando(true);
    } catch {
      Alert.alert("Erro", "Não foi possível iniciar a gravação.");
    }
  }

  async function pararGravacao() {
    if (!gravando) return;
    setGravando(false);
    setCarregando(true);
    setModalVisivel(false);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error("Arquivo de áudio não encontrado.");
      const texto = await transcreverAudio(uri, setWhisperStatus);
      const resultado = await parseTexto(texto);
      router.push({
        pathname: "/confirm",
        params: {
          descricao: resultado.descricao,
          valor: resultado.valor?.toString() ?? "",
          categoria: resultado.categoria,
          input_original: texto,
          categoria_sugerida: resultado.categoria,
        },
      });
    } catch (e: any) {
      Alert.alert("Erro", e.message ?? "Não foi possível processar o áudio.");
    } finally {
      setCarregando(false);
    }
  }

  const mesAtual = new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" });
  const mesCapitalizado = mesAtual.charAt(0).toUpperCase() + mesAtual.slice(1);
  const saldo = totalEntradas - totalMes;
  const saldoPositivo = saldo >= 0;

  return (
    <SafeAreaView style={[s.safeArea, { backgroundColor: t.bg }]}>
      {/* Cabeçalho */}
      <View style={s.header}>
        <Text style={s.headerSub}>gastô · gastos em</Text>
        <Text style={s.headerMes}>{mesCapitalizado}</Text>
        <Text style={s.headerTotal}>
          {totalMes.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </Text>
        {totalEntradas > 0 && (
          <View style={s.saldoRow}>
            <Text style={s.saldoLabel}>Saldo do mês</Text>
            <Text style={[s.saldoValor, saldoPositivo ? s.saldoPos : s.saldoNeg]}>
              {saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </Text>
          </View>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={despesas}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <ExpenseItem despesa={item} onDelete={() => carregarDados(false)} />}
        contentContainerStyle={despesas.length === 0 ? s.listaVazia : s.lista}
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Text style={s.emptyIcon}>💸</Text>
            <Text style={[s.emptyText, { color: t.text }]}>Nenhuma despesa ainda</Text>
            <Text style={[s.emptySubText, { color: t.textMuted }]}>Toque no botão + para adicionar</Text>
          </View>
        }
      />

      {carregando && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={s.loadingText}>{labelWhisper(whisperStatus)}</Text>
          {whisperStatus.tipo === "baixando" && (
            <View style={s.progressBarBg}>
              <View style={[s.progressBarFill, { width: `${whisperStatus.progresso}%` as any }]} />
            </View>
          )}
        </View>
      )}

      <Pressable
        style={({ pressed }) => [s.fab, pressed && s.fabPressed]}
        onPress={() => { setModoTexto(false); setModalVisivel(true); }}
      >
        <Text style={s.fabIcon}>+</Text>
      </Pressable>

      <Modal
        visible={modalVisivel}
        transparent
        animationType="slide"
        onRequestClose={async () => {
          if (gravando) await pararGravacao();
          setModalVisivel(false);
          setTextoInput("");
          setModoTexto(false);
        }}
      >
        <Pressable style={[s.modalBackdrop, { backgroundColor: t.modalBackdrop }]} onPress={() => {
          if (!gravando) { setModalVisivel(false); setTextoInput(""); setModoTexto(false); }
        }}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <Pressable style={[s.modalSheet, { backgroundColor: t.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={[s.modalHandle, { backgroundColor: t.handle }]} />
            <Text style={[s.modalTitulo, { color: t.text }]}>Adicionar despesa</Text>

            {!modoTexto ? (
              <View style={s.opcoes}>
                <View style={s.voiceWrapper}>
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <Pressable
                      style={[s.voiceBtn, gravando && s.voiceBtnGravando]}
                      onPressIn={iniciarGravacao}
                      onPressOut={pararGravacao}
                    >
                      <Text style={s.voiceBtnIcon}>{gravando ? "⏹" : "🎙️"}</Text>
                    </Pressable>
                  </Animated.View>
                  <Text style={[s.voiceLabel, { color: t.textSub }]}>
                    {gravando ? "Solte para enviar" : "Segure para falar"}
                  </Text>
                </View>

                <View style={s.divisor}>
                  <View style={[s.linha, { backgroundColor: t.divider }]} />
                  <Text style={[s.ouText, { color: t.textMuted }]}>ou</Text>
                  <View style={[s.linha, { backgroundColor: t.divider }]} />
                </View>

                <Pressable style={[s.textoBtn, { borderColor: "#6C63FF" }]} onPress={() => setModoTexto(true)}>
                  <Text style={s.textoBtnText}>⌨️  Digitar</Text>
                </Pressable>
              </View>
            ) : (
              <View style={s.inputWrapper}>
                <TextInput
                  style={[s.input, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
                  placeholder='Ex: "lanche 20 reais"'
                  placeholderTextColor={t.textMuted}
                  value={textoInput}
                  onChangeText={setTextoInput}
                  autoFocus
                  returnKeyType="send"
                  onSubmitEditing={processarTexto}
                />
                <Pressable
                  style={[s.sendBtn, !textoInput.trim() && s.sendBtnDisabled]}
                  onPress={processarTexto}
                  disabled={!textoInput.trim()}
                >
                  <Text style={s.sendBtnText}>Enviar →</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { backgroundColor: "#6C63FF", paddingTop: 16, paddingBottom: 28, paddingHorizontal: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 13 },
  headerMes: { color: "#fff", fontSize: 20, fontWeight: "700", marginTop: 2 },
  headerTotal: { color: "#fff", fontSize: 36, fontWeight: "800", marginTop: 8 },
  saldoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 12 },
  saldoLabel: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "600" },
  saldoValor: { fontSize: 16, fontWeight: "800" },
  saldoPos: { color: "#7EFFC5" },
  saldoNeg: { color: "#FFB3B3" },
  lista: { padding: 16, paddingBottom: 100 },
  listaVazia: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { alignItems: "center", marginTop: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: "600" },
  emptySubText: { fontSize: 14, marginTop: 6 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.85)", justifyContent: "center", alignItems: "center", zIndex: 99 },
  loadingText: { marginTop: 12, color: "#6C63FF", fontWeight: "600", fontSize: 16 },
  fab: { position: "absolute", bottom: 32, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: "#6C63FF", justifyContent: "center", alignItems: "center", shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  fabPressed: { opacity: 0.85, transform: [{ scale: 0.95 }] },
  fabIcon: { color: "#fff", fontSize: 32, lineHeight: 36, marginTop: -2 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalTitulo: { fontSize: 20, fontWeight: "700", marginBottom: 28 },
  opcoes: { alignItems: "center" },
  voiceWrapper: { alignItems: "center", marginBottom: 24 },
  voiceBtn: { width: 88, height: 88, borderRadius: 44, backgroundColor: "#6C63FF", justifyContent: "center", alignItems: "center", shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  voiceBtnGravando: { backgroundColor: "#FF4757" },
  voiceBtnIcon: { fontSize: 36 },
  voiceLabel: { marginTop: 10, fontSize: 13 },
  divisor: { flexDirection: "row", alignItems: "center", width: "100%", marginBottom: 20 },
  linha: { flex: 1, height: 1 },
  ouText: { marginHorizontal: 12, fontSize: 13 },
  textoBtn: { width: "100%", paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, alignItems: "center" },
  textoBtnText: { color: "#6C63FF", fontSize: 16, fontWeight: "600" },
  inputWrapper: { width: "100%" },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 12 },
  sendBtn: { backgroundColor: "#6C63FF", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  sendBtnDisabled: { backgroundColor: "#C4C2E8" },
  sendBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  progressBarBg: { marginTop: 16, width: 220, height: 6, backgroundColor: "#E0DEFF", borderRadius: 3, overflow: "hidden" },
  progressBarFill: { height: 6, backgroundColor: "#6C63FF", borderRadius: 3 },
});

function labelWhisper(s: WhisperStatus): string {
  switch (s.tipo) {
    case "baixando": return `Baixando modelo de voz… ${s.progresso}%`;
    case "carregando": return "Carregando modelo…";
    case "transcrevendo": return "Transcrevendo áudio…";
    default: return "Processando…";
  }
}
