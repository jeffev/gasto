import React, { useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { setConfig } from "../lib/db";
import { useTheme } from "../lib/theme";

const VERSAO_TERMOS = "1.0";

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={s.secao}>
      <Text style={[s.secaoTitulo, { color: t.text }]}>{titulo}</Text>
      <Text style={[s.secaoTexto, { color: t.textSub }]}>{children}</Text>
    </View>
  );
}

export default function TermosScreen() {
  const router = useRouter();
  const t = useTheme();
  const [leuTudo, setLeuTudo] = useState(false);
  const [aceitando, setAceitando] = useState(false);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const chegouAoFim = layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
    if (chegouAoFim) setLeuTudo(true);
  }

  async function aceitar() {
    setAceitando(true);
    await setConfig("termos_aceitos", VERSAO_TERMOS);
    router.replace("/(tabs)");
  }

  return (
    <SafeAreaView style={[s.safeArea, { backgroundColor: t.bg }]}>
      {/* Cabeçalho */}
      <View style={[s.header, { backgroundColor: t.surface, borderBottomColor: t.divider }]}>
        <Text style={s.headerIcon}>📋</Text>
        <View>
          <Text style={[s.headerTitulo, { color: t.text }]}>Termos de Uso</Text>
          <Text style={[s.headerSub, { color: t.textMuted }]}>Leia antes de continuar</Text>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { backgroundColor: t.bg }]}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        showsVerticalScrollIndicator
      >
        <Text style={[s.dataVersao, { color: t.textMuted }]}>
          Versão {VERSAO_TERMOS} · Última atualização: abril de 2026
        </Text>

        <Secao titulo="1. Sobre o aplicativo">
          O Gastô é um aplicativo de controle de finanças pessoais desenvolvido para uso individual. Ele permite registrar despesas e receitas por voz ou texto, com categorização automática e relatórios mensais.
        </Secao>

        <Secao titulo="2. Armazenamento de dados">
          Todos os seus dados financeiros — despesas, entradas, orçamentos e metas — são armazenados exclusivamente no banco de dados local do seu dispositivo (SQLite). Esses dados não são enviados, sincronizados ou armazenados em nenhum servidor externo.{"\n\n"}
          O aplicativo não possui conta de usuário, login ou qualquer forma de identificação pessoal.
        </Secao>

        <Secao titulo="3. Transcrição de voz">
          Quando você usa a função de gravação de voz, o áudio é enviado para um servidor local na sua rede (configurado por você) para processamento pelo modelo Whisper. O áudio não é enviado para servidores de terceiros e é descartado imediatamente após a transcrição.{"\n\n"}
          Caso prefira não usar a gravação de voz, o aplicativo funciona completamente via digitação de texto, sem nenhuma comunicação de rede.
        </Secao>

        <Secao titulo="4. Privacidade">
          Não coletamos, transmitimos nem compartilhamos qualquer dado pessoal ou financeiro com terceiros.{"\n\n"}
          Não utilizamos rastreamento, analytics, publicidade ou cookies de qualquer natureza.{"\n\n"}
          Seus dados financeiros são seus. Você pode excluí-los a qualquer momento desinstalando o aplicativo.
        </Secao>

        <Secao titulo="5. Backups e perda de dados">
          Por ser um banco de dados local, os dados podem ser perdidos em caso de desinstalação do aplicativo, troca de dispositivo ou falha de hardware.{"\n\n"}
          Recomendamos utilizar a função de exportação CSV periodicamente para manter cópias dos seus dados.{"\n\n"}
          O desenvolvedor não se responsabiliza por perda de dados decorrente de qualquer causa.
        </Secao>

        <Secao titulo="6. Responsabilidade financeira">
          O Gastô é uma ferramenta de organização pessoal. As informações exibidas dependem inteiramente dos dados inseridos pelo usuário.{"\n\n"}
          O aplicativo não oferece consultoria financeira, contábil ou de investimentos. Decisões financeiras são de responsabilidade exclusiva do usuário.{"\n\n"}
          A categorização automática por inteligência artificial pode cometer erros. Sempre verifique os valores e categorias antes de confirmar um lançamento.
        </Secao>

        <Secao titulo="7. Uso permitido">
          O aplicativo é destinado exclusivamente ao uso pessoal. É vedada a comercialização, redistribuição ou engenharia reversa do aplicativo ou de seus componentes.
        </Secao>

        <Secao titulo="8. Atualizações dos termos">
          Estes termos podem ser atualizados em versões futuras do aplicativo. Em caso de atualização relevante, o aplicativo solicitará nova confirmação de aceite.
        </Secao>

        <Secao titulo="9. Contato">
          Em caso de dúvidas sobre estes termos ou sobre o funcionamento do aplicativo, entre em contato pelo repositório do projeto.
        </Secao>

        <View style={[s.rodape, { borderTopColor: t.divider }]}>
          <Text style={[s.rodapeTexto, { color: t.textMuted }]}>
            Role até o fim para habilitar o botão de aceite.
          </Text>
        </View>
      </ScrollView>

      {/* Botão fixo */}
      <View style={[s.footerContainer, { backgroundColor: t.surface, borderTopColor: t.divider }]}>
        {!leuTudo && (
          <Text style={[s.aviso, { color: t.textMuted }]}>
            ↓ Role para ler os termos completos
          </Text>
        )}
        <Pressable
          style={[s.btnAceitar, !leuTudo && s.btnAceitarDisabled, aceitando && s.btnAceitarDisabled]}
          onPress={aceitar}
          disabled={!leuTudo || aceitando}
        >
          <Text style={s.btnAceitarText}>
            {aceitando ? "Aguarde..." : "✓  Li e aceito os termos"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1 },

  header: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 24, paddingVertical: 18,
    borderBottomWidth: 1,
  },
  headerIcon: { fontSize: 32 },
  headerTitulo: { fontSize: 20, fontWeight: "800" },
  headerSub: { fontSize: 13, marginTop: 1 },

  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 16 },

  dataVersao: { fontSize: 12, marginBottom: 20 },

  secao: { marginBottom: 24 },
  secaoTitulo: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  secaoTexto: { fontSize: 14, lineHeight: 22 },

  rodape: { borderTopWidth: 1, paddingTop: 20, marginTop: 8, paddingBottom: 8 },
  rodapeTexto: { fontSize: 12, textAlign: "center" },

  footerContainer: {
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 20,
    borderTopWidth: 1,
    gap: 8,
  },
  aviso: { fontSize: 13, textAlign: "center" },
  btnAceitar: {
    backgroundColor: "#6C63FF", borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
    shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnAceitarDisabled: { backgroundColor: "#C4C2E8", shadowOpacity: 0, elevation: 0 },
  btnAceitarText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
